// routes/issue.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticateToken = require("./authMiddleware");
const bcrypt = require("bcrypt");
const { getLocalTimestamp } = require("../utils/datetime");

/**
 * Helpers
 */
const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Return whether inventory_batches table exists (cached per-connection)
 */
async function hasBatchesTable(conn) {
  try {
    await conn.query("PRAGMA table_info(inventory_batches)");
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert pcs -> {boxes, items} given pack
 */
function toBoxesItems(pcs, pack) {
  const P = Math.max(1, asInt(pack));
  const T = Math.max(0, asInt(pcs));
  return { boxes: Math.floor(T / P), items: T % P };
}

/* ===================================================================
 * CREATE: POST /api/issue
 *  - Now enforces per-(product_id, pack_size) stock (no negative)
 *  - Allocates strictly from batches with the chosen pack_size
 * =================================================================== */
router.post("/", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      issue_no,
      lorry_id,
      authenticator,
      reps,        // array of representative IDs
      items,       // array of { product_id, boxes_sent?, items_sent?, display_pack? } OR { quantity }
    } = req.body;

    const initiator_id = req.user.user_id; // logged-in user

    const issueNo = (issue_no || "").toString().trim();

    if (!issueNo || !lorry_id || !authenticator || !reps?.length || !items?.length) {
      return res.status(400).json({ message: "All required fields must be provided." });
    }

    // Prevent duplicate issue notes for the same issue_no
    const [[existingIssue]] = await connection.query(
      `SELECT issue_id FROM issue_note WHERE issue_no = ? LIMIT 1`,
      [issueNo]
    );
    if (existingIssue) {
      return res.status(409).json({ message: "This issue note number is already in use." });
    }

    await connection.beginTransaction();

    // 1) issue_note
    const [issueResult] = await connection.query(
      `INSERT INTO issue_note (issue_no, date_created, lorry_id, initiator_id, authenticator)
       VALUES (?, ?, ?, ?, ?)`,
      [issueNo, getLocalTimestamp(), lorry_id, initiator_id, authenticator]
    );
    const issue_id = issueResult.insertId;

    // 2) reps
    for (const rep_id of reps) {
      await connection.query(
        `INSERT INTO issue_rep (issue_id, rep_id) VALUES (?, ?)`,
        [issue_id, rep_id]
      );
    }

    const batchesExist = await hasBatchesTable(connection);

    // 3) items + allocations + decrement product totals
    for (const raw of items) {
      let { product_id, boxes_sent, items_sent, quantity, display_pack } = raw;

      boxes_sent = asInt(boxes_sent) || 0;
      items_sent = asInt(items_sent) || 0;

      let requested_pcs;
      let chosen_pack = asInt(display_pack) || 0;

      if (boxes_sent || items_sent) {
        if (chosen_pack <= 0) {
          await connection.rollback();
          return res.status(400).json({ message: "Pack size is required for boxes/items lines." });
        }
        requested_pcs = boxes_sent * chosen_pack + items_sent;
      } else {
        // quantity (pcs) path – NOT pack specific; discourage using it
        requested_pcs = asInt(quantity) || 0;
      }

      if (!product_id || requested_pcs <= 0) {
        await connection.rollback();
        return res.status(400).json({ message: "Invalid issue line." });
      }

      const [iiRes] = await connection.query(
        `INSERT INTO issue_items (issue_id, product_id, quantity_sent)
         VALUES (?,?,?)`,
        [issue_id, product_id, 0]
      );
      const issue_item_id = iiRes.insertId;

      // ----- Batch-aware branch -----
      if (batchesExist) {
        // If user specified boxes/items ⇒ MUST have pack size.
        if (boxes_sent || items_sent) {
          // 1) Check available stock ONLY in batches with that pack_size
          const [[row]] = await connection.query(
            `SELECT COALESCE(SUM(remaining_pcs),0) AS pcs
               FROM inventory_batches
              WHERE product_id = ? AND pack_size = ? AND remaining_pcs > 0
              `,
            [product_id, chosen_pack]
          );

          const available = asInt(row?.pcs);
          if (available < requested_pcs) {
            await connection.rollback();
            const { boxes, items } = toBoxesItems(available, chosen_pack);
            return res.status(400).json({
              message:
                `Insufficient stock for selected pack size. ` +
                `Available for this pack (${chosen_pack}): ${boxes} boxes + ${items} items.`
            });
          }

          // 2) Allocate from batches with that pack_size (FEFO by expiry, then FIFO)
          const [batches] = await connection.query(
            `SELECT batch_id, remaining_pcs
               FROM inventory_batches
              WHERE product_id = ? AND pack_size = ? AND remaining_pcs > 0
              ORDER BY COALESCE(expiry_date,'9999-12-31'), created_at`,
            [product_id, chosen_pack]
          );

          let remaining = requested_pcs;
          for (const b of batches) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, asInt(b.remaining_pcs));

            await connection.query(
              `INSERT INTO issue_allocations (issue_item_id, batch_id, pieces_sent)
               VALUES (?,?,?)`,
              [issue_item_id, b.batch_id, take]
            );

            await connection.query(
              `UPDATE inventory_batches SET remaining_pcs = remaining_pcs - ? WHERE batch_id = ?`,
              [take, b.batch_id]
            );

            remaining -= take;
          }

          if (remaining > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Insufficient stock to allocate." });
          }
        } else {
          // quantity (pcs) form: allow allocation across all batches (any pack size)
          const [[row]] = await connection.query(
            `SELECT COALESCE(SUM(remaining_pcs),0) AS pcs
               FROM inventory_batches
              WHERE product_id = ? AND remaining_pcs > 0
              `,
            [product_id]
          );
          if (asInt(row?.pcs) < requested_pcs) {
            await connection.rollback();
            return res.status(400).json({ message: "Insufficient stock." });
          }

          // allocate FEFO across all batches
          const [batches] = await connection.query(
            `SELECT batch_id, remaining_pcs
               FROM inventory_batches
              WHERE product_id = ? AND remaining_pcs > 0
              ORDER BY COALESCE(expiry_date,'9999-12-31'), created_at`,
            [product_id]
          );

          let remaining = requested_pcs;
          for (const b of batches) {
            if (remaining <= 0) break;
            const take = Math.min(remaining, asInt(b.remaining_pcs));

            await connection.query(
              `INSERT INTO issue_allocations (issue_item_id, batch_id, pieces_sent)
               VALUES (?,?,?)`,
              [issue_item_id, b.batch_id, take]
            );

            await connection.query(
              `UPDATE inventory_batches SET remaining_pcs = remaining_pcs - ? WHERE batch_id = ?`,
              [take, b.batch_id]
            );

            remaining -= take;
          }

          if (remaining > 0) {
            await connection.rollback();
            return res.status(400).json({ message: "Insufficient stock to allocate." });
          }
        }
      } else {
        // ----- Legacy path (no batches table) -----
        const [[p]] = await connection.query(
          `SELECT COALESCE(quantity,0) AS qty FROM products WHERE product_id = ? `,
          [product_id]
        );
        if (!p || asInt(p.qty) < requested_pcs) {
          await connection.rollback();
          return res.status(400).json({ message: "Insufficient stock." });
        }
      }

      // finalize item pieces + decrement product total aggregate
      await connection.query(
        `UPDATE issue_items SET quantity_sent = ? WHERE entry_id = ?`,
        [requested_pcs, issue_item_id]
      );

      await connection.query(
        `UPDATE products SET quantity = quantity - ? WHERE product_id = ?`,
        [requested_pcs, product_id]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, message: "Issue note created successfully." });

  } catch (err) {
    console.error("Error creating issue note:", err);
    await connection.rollback();

    if (err?.code === "ER_DUP_ENTRY" || err?.code === "SQLITE_CONSTRAINT") {
      return res.status(409).json({ success: false, message: "This issue note number is already in use." });
    }

    res.status(500).json({ success: false, message: "Server error.", error: err.message });
  } finally {
    connection.release();
  }
});

/* ===================================================================
 * DROPDOWNS
 * =================================================================== */

// --- autodetect a usable lorries table/columns ---
async function detectLorrySchema(conn) {
  const candidates = ["issue_lorries", "lorries", "lorry", "delivery_lorries", "vehicles"];
  let table = null;
  for (const t of candidates) {
    try {
      await conn.query(`PRAGMA table_info(\`${t}\`)`);
      table = t;
      break;
    } catch { /* continue */ }
  }
  if (!table) return null;

  const [cols] = await conn.query(`PRAGMA table_info(\`${table}\`)`);
  const names = new Set(cols.map(c => c.name));

  const idCol =
    ["lorry_id", "id", "vehicle_id"].find(c => names.has(c)) || cols[0].name;
  const noCol =
    ["lorry_no", "lorry_number", "plate_no", "number", "registration_no", "reg_no"]
      .find(c => names.has(c)) || cols[1]?.name || cols[0].name;
  const supplierCol =
    ["supplier_id", "supplier", "vendor_id"].find(c => names.has(c)) || null;

  return { table, idCol, noCol, supplierCol };
}

// Lorries (auto-detected)
router.get("/lorries", authenticateToken, async (_req, res) => {
  const conn = await pool.getConnection();
  try {
    const sch = await detectLorrySchema(conn);
    if (!sch) {
      console.warn("No lorries-like table found. Returning empty list.");
      return res.json([]);
    }
    const sql =
      `SELECT \`${sch.idCol}\`   AS lorry_id,
              \`${sch.noCol}\`   AS lorry_no`
      + (sch.supplierCol ? `, \`${sch.supplierCol}\` AS supplier_id` : ``) +
      ` FROM \`${sch.table}\`
        ORDER BY \`${sch.noCol}\` ASC`;
    const [rows] = await conn.query(sql);
    res.json(rows || []);
  } catch (err) {
    console.error("GET /api/issue/lorries error:", err?.sqlMessage || err);
    // Don’t block the page; return empty instead of 500 so UI is usable.
    res.json([]);
  } finally {
    conn.release();
  }
});


router.get("/representatives", authenticateToken, async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        rep_id,
        full_name AS rep_name
      FROM representatives
      ORDER BY full_name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch representatives." });
  }
});

router.get("/admins", authenticateToken, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT user_id, username FROM users WHERE role = 'admin' ORDER BY username ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch admins." });
  }
});

/* ===================================================================
 * Products (batch-aware)
 * GET /api/issue/products
 *  - returns one row per (product_id, pack_size) when inventory_batches exists
 *  - includes supplier_id for front-end filtering
 * =================================================================== */
router.get("/products", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const useBatches = await hasBatchesTable(connection);
    const supplierId = req.query.supplier_id ? Number(req.query.supplier_id) : null;

    if (useBatches) {
      const params = [];
      let where = "";
      if (supplierId) {
        where = "WHERE p.supplier_id = ?";
        params.push(supplierId);
      }

      const [rows] = await connection.query(
        `
        SELECT
          p.product_id,
          p.product_code AS product_code,
          p.name AS product_name,
          p.supplier_id,
          ib.pack_size            AS display_pack,
          COALESCE(SUM(ib.remaining_pcs),0) AS available_qty_pcs,
          (COALESCE(SUM(ib.remaining_pcs),0) / ib.pack_size) AS boxes_equiv,
          (COALESCE(SUM(ib.remaining_pcs),0) % ib.pack_size) AS items_equiv,
          FALSE AS mixed_pack
        FROM products p
        JOIN inventory_batches ib
          ON ib.product_id = p.product_id
         AND ib.remaining_pcs > 0
        ${where}
        GROUP BY p.product_id, p.product_code, p.name, p.supplier_id, ib.pack_size
        ORDER BY p.name ASC, ib.pack_size ASC
        `,
        params
      );
      return res.json(rows || []);
    }


    // Fallback (no batches table) -> one row per product using default_pack_size
    // Fallback (no batches table) -> one row per product using default_pack_size
    const params = [];
    let where = "";
    if (supplierId) {
      where = "WHERE p.supplier_id = ?";
      params.push(supplierId);
    }

    const [rows] = await connection.query(
      `
      SELECT
        p.product_id,
        p.product_code AS product_code,
        p.name AS product_name,
        p.supplier_id,
        COALESCE(p.default_pack_size, 1) AS display_pack,
        COALESCE(p.quantity,0) AS available_qty_pcs,
        (COALESCE(p.quantity,0) / COALESCE(p.default_pack_size,1)) AS boxes_equiv,
        (COALESCE(p.quantity,0) % COALESCE(p.default_pack_size,1)) AS items_equiv,
        FALSE AS mixed_pack
      FROM products p
      ${where}
      ORDER BY p.name ASC
      `,
      params
    );
    return res.json(rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch products." });
  } finally {
    connection.release();
  }
});

/* ===================================================================
 * LIST (latest 5) with role-scope + date filter
 * =================================================================== */
router.get("/list", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { start, end, supplier_id, product_id } = req.query;
    const { user_id, role } = req.user || {};
    const isAdmin = String(role).toLowerCase() === "admin";

    const params = [];
    let where = " WHERE 1=1 ";

    if (!isAdmin) {
      where += " AND i.initiator_id = ? ";
      params.push(user_id);
    }
    if (start && end) {
      where += " AND DATE(i.date_created) BETWEEN ? AND ? ";
      params.push(start, end);
    }
    if (supplier_id) {
      where += " AND p.supplier_id = ? ";
      params.push(supplier_id);
    }

    if (product_id) {
      where += " AND p.product_id = ? ";
      params.push(product_id);
    }


    const sql = `
      SELECT DISTINCT
        i.issue_id,
        i.issue_no,
        i.date_created,
        i.authenticator,
        i.lorry_id,
        l.lorry_no,
        i.initiator_id,
        cu.username AS creator_username,
        i.edited_by,
        i.edited_at,
        eu.username AS editor_username,
        MIN(p.supplier_id) AS supplier_id,
        MIN(s.name)        AS supplier_name,
        (SELECT COUNT(*) FROM issue_items ii2 WHERE ii2.issue_id = i.issue_id) AS item_count
      FROM issue_note i
      LEFT JOIN issue_lorries l ON l.lorry_id = i.lorry_id
      LEFT JOIN users cu ON cu.user_id = i.initiator_id
      LEFT JOIN users eu ON eu.user_id = i.edited_by
      LEFT JOIN issue_items ii ON ii.issue_id = i.issue_id
      LEFT JOIN products p ON p.product_id = ii.product_id
      LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
      ${where}
      GROUP BY i.issue_id, i.issue_no, i.date_created, i.authenticator, i.lorry_id, l.lorry_no, i.initiator_id, cu.username, i.edited_by, i.edited_at, eu.username
      ORDER BY i.date_created DESC
      LIMIT 100000
    `;
    ;

    const [rows] = await connection.query(sql, params);

    const isAdminFlag = isAdmin;
    const data = (rows || []).map(r => ({
      issue_id: r.issue_id,
      issue_no: r.issue_no,
      created_at: r.date_created,
      authenticator: r.authenticator,
      lorry_no: r.lorry_no,
      creator: isAdminFlag ? r.creator_username : "You",
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name,
      item_count: r.item_count || 0,
      is_edited: !!r.edited_by,
      edited_by_username: isAdminFlag ? r.editor_username : undefined,
      edited_at: isAdminFlag ? r.edited_at : undefined,
    }));

    res.json(data);
  } catch (e) {
    console.error("GET /api/issue/list error:", e);
    res.status(500).json({ message: "Failed to fetch issue notes." });
  } finally {
    connection.release();
  }
});

/* ===================================================================
 * MINIMAL EDIT-ONCE (authenticator only)
 * =================================================================== */
router.patch("/:id/edit", authenticateToken, async (req, res) => {
  //edit can't edit
  if (req.user.role === "admin") {
    return res.status(403).json({ message: "Admins cannot edit issue notes" });
  }

  const connection = await pool.getConnection();
  try {
    const issueId = Number(req.params.id);
    const { authenticator } = req.body || {};
    const { user_id, role } = req.user || {};
    const isAdmin = String(role).toLowerCase() === "admin";

    if (!issueId || !authenticator?.trim()) {
      return res.status(400).json({ error: "Invalid payload." });
    }

    const [rows] = await connection.query(
      `SELECT issue_id, initiator_id, edited_by FROM issue_note WHERE issue_id = ?`,
      [issueId]
    );
    if (!rows?.length) return res.status(404).json({ error: "Issue note not found." });

    const note = rows[0];
    if (note.edited_by) {
      return res.status(403).json({ error: "This issue note was already edited once." });
    }
    if (!isAdmin && Number(note.initiator_id) !== Number(user_id)) {
      return res.status(403).json({ error: "You are not allowed to edit this issue note." });
    }

    await connection.query(
      `UPDATE issue_note
         SET authenticator = ?, is_edited=1, edited_by = ?, edited_at = ?
       WHERE issue_id = ? AND edited_by IS NULL`,
      [authenticator.trim(), user_id, getLocalTimestamp(), issueId]
    );

    res.json({ success: true });
  } catch (e) {
    console.error("PATCH /api/issue/:id/edit error:", e);
    res.status(500).json({ error: "Failed to update issue note." });
  } finally {
    connection.release();
  }
});

/* ===================================================================
 * ITEMS FOR A NOTE (with boxes/pieces + stock)
 * =================================================================== */
router.get("/:id/items", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const issueId = Number(req.params.id);

    const { user_id, role } = req.user || {};
    const isAdmin = String(role).toLowerCase() === "admin";

    const [ownerRows] = await connection.query(
      `SELECT initiator_id FROM issue_note WHERE issue_id = ?`,
      [issueId]
    );
    if (!ownerRows?.length) return res.status(404).json({ message: "Issue note not found." });
    if (!isAdmin && Number(ownerRows[0].initiator_id) !== Number(user_id)) {
      return res.status(403).json({ message: "Forbidden." });
    }

    const useBatches = await hasBatchesTable(connection);

    let rows;
    if (useBatches) {
      // pack size from allocations / inventory_batches
      [rows] = await connection.query(
        `
    SELECT
      ii.product_id,
      p.product_code AS product_code,
      p.name AS product_name,
      COALESCE(ib.pack_size, COALESCE(p.default_pack_size, 1)) AS display_pack,
      COALESCE(SUM(ia.pieces_sent), 0) AS pcs_sent,
      COALESCE(p.quantity, 0) AS stock_pcs
    FROM issue_items ii
    LEFT JOIN issue_allocations ia
      ON ia.issue_item_id = ii.entry_id
    LEFT JOIN inventory_batches ib
      ON ib.batch_id = ia.batch_id
    LEFT JOIN products p
      ON p.product_id = ii.product_id
    WHERE ii.issue_id = ?
    GROUP BY
      ii.product_id,
      p.product_code,
      p.name,
      display_pack,
      p.quantity
    ORDER BY p.name ASC, display_pack ASC
    `,
        [issueId]
      );
    } else {
      // legacy path (no batches table) – keep old behaviour
      [rows] = await connection.query(
        `
    SELECT
      ii.product_id,
      p.product_code AS product_code,
      p.name AS product_name,
      COALESCE(p.default_pack_size, 1) AS display_pack,
      COALESCE(ii.quantity_sent, 0) AS pcs_sent,
      COALESCE(p.quantity, 0) AS stock_pcs
    FROM issue_items ii
    LEFT JOIN products p ON p.product_id = ii.product_id
    WHERE ii.issue_id = ?
    ORDER BY p.name ASC
    `,
        [issueId]
      );
    }


    const data = (rows || []).map((r) => {
      const pack = Math.max(1, Number(r.display_pack) || 1);
      const pcs = Number(r.pcs_sent) || 0;
      const stock = Number(r.stock_pcs) || 0;
      return {
        product_id: r.product_id,
        product_code: r.product_code,
        product_name: r.product_name,
        display_pack: pack,
        pcs_sent: pcs,
        stock_pcs: stock,
        stock_boxes: Math.floor(stock / pack),
        stock_items: stock % pack,
      };
    });

    res.json(data);
  } catch (e) {
    console.error("GET /api/issue/:id/items error:", e);
    res.status(500).json({ message: "Failed to fetch items." });
  } finally {
    connection.release();
  }
});

/* ===================================================================
 * PASSWORD VERIFY
 * =================================================================== */
router.post("/auth/verify-password", authenticateToken, async (req, res) => {
  try {
    const pw = (req.body?.password ?? "").toString();
    if (!pw) return res.status(400).json({ ok: false, message: "Missing password." });

    const [rows] = await pool.query(
      `SELECT password FROM users WHERE user_id = ? LIMIT 1`,
      [req.user.user_id]
    );

    if (!rows?.length) {
      return res.status(401).json({ ok: false });
    }

    const stored = rows[0].password;
    if (typeof stored !== "string" || !stored.length) {
      return res.status(401).json({ ok: false });
    }

    const ok = await bcrypt.compare(pw, stored);
    return res.status(ok ? 200 : 401).json({ ok });
  } catch (e) {
    console.error("verify-password error:", e?.message || e);
    return res.status(500).json({ ok: false });
  }
});

/* ===================================================================
 * PREFILL ONE NOTE
 * =================================================================== */
router.get("/:id", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const issueId = Number(req.params.id);
    const { user_id, role } = req.user || {};
    const isAdmin = String(role).toLowerCase() === "admin";

    const [hdr] = await connection.query(
      `
      SELECT i.issue_id, i.issue_no, i.lorry_id, i.initiator_id, i.authenticator,
             i.edited_by, i.edited_at, l.lorry_no
        FROM issue_note i
        LEFT JOIN issue_lorries l ON l.lorry_id = i.lorry_id
       WHERE i.issue_id = ?
      `,
      [issueId]
    );
    if (!hdr?.length) return res.status(404).json({ message: "Not found" });

    if (!isAdmin && Number(hdr[0].initiator_id) !== Number(user_id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const [items] = await connection.query(
      `
      SELECT ii.entry_id, ii.product_id,
             COALESCE(ii.quantity_sent, 0) AS pcs_sent,
             p.product_code AS product_code,
             p.name AS product_name,
             COALESCE(p.default_pack_size, 1) AS display_pack
        FROM issue_items ii
        LEFT JOIN products p ON p.product_id = ii.product_id
       WHERE ii.issue_id = ?
       ORDER BY p.name ASC
      `,
      [issueId]
    );

    res.json({
      header: hdr[0],
      items: (items || []).map(r => {
        const pack = Math.max(1, Number(r.display_pack) || 1);
        const pcs = Number(r.pcs_sent) || 0;
        return {
          product_id: r.product_id,
          product_code: r.product_code,
          product_name: r.product_name,
          display_pack: pack,
          boxes_sent: Math.floor(pcs / pack),
          items_sent: pcs % pack
        };
      })
    });
  } catch (e) {
    console.error("GET /api/issue/:id error:", e);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
});

module.exports = router;
