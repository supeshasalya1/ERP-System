// server/src/routes/adjustments.js
const express = require("express");
const router = express.Router();

const pool = require("../db");
const authenticateToken = require("./authMiddleware");
const { getLocalDateString, getLocalTimestamp } = require("../utils/datetime");

/*const asInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};*/

const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// -----------------------------------------
// GET /api/adjustments/products
// Return products with current stock per pack
// -----------------------------------------
router.get("/products", authenticateToken, async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();

    // optional supplier filter
    const supplierIdRaw = (req.query.supplier_id || "").trim();
    const supplierId = Number.isFinite(Number(supplierIdRaw))
      ? Number(supplierIdRaw)
      : null;

    let useBatches = true;
    try {
      await conn.query("PRAGMA table_info(inventory_batches)");
    } catch {
      useBatches = false;
    }

    if (useBatches) {
      let sql = `
        SELECT
          p.product_id,
          p.product_code,
          p.name              AS product_name,
          p.supplier_id,
          ib.pack_size        AS display_pack,
          COALESCE(SUM(ib.remaining_pcs), 0) AS available_qty_pcs
        FROM inventory_batches ib
        JOIN products p ON p.product_id = ib.product_id
      `;
      const params = [];

      if (supplierId) {
        sql += " WHERE p.supplier_id = ? ";
        params.push(supplierId);
      }

      sql += `
        GROUP BY p.product_id, ib.pack_size
        ORDER BY p.name ASC, ib.pack_size ASC
      `;

      const [rows] = await conn.query(sql, params);
      return res.json(rows || []);
    } else {
      let sql = `
        SELECT
          p.product_id,
          p.product_code,
          p.name              AS product_name,
          p.supplier_id,
          COALESCE(p.default_pack_size, 1) AS display_pack,
          COALESCE(p.quantity, 0) AS available_qty_pcs
        FROM products p
      `;
      const params = [];

      if (supplierId) {
        sql += " WHERE p.supplier_id = ? ";
        params.push(supplierId);
      }

      sql += " ORDER BY p.name ASC";

      const [rows] = await conn.query(sql, params);
      return res.json(rows || []);
    }
  } catch (err) {
    console.error("Error in /api/adjustments/products:", err);
    res.status(500).json({ message: "Failed to fetch products for adjustments." });
  } finally {
    if (conn) conn.release();
  }
});



// ---------------------------
// GET /api/adjustments/pack-stock?product_id=1&pack_size=20
// current stock for THIS product+pack from inventory_batches
// ---------------------------
router.get("/pack-stock", authenticateToken, async (req, res) => {
  const productId = Number(req.query.product_id || 0);
  const packSize = Number(req.query.pack_size || 0);

  if (!productId || !packSize) {
    return res
      .status(400)
      .json({ error: "product_id and pack_size are required" });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        COALESCE(SUM(remaining_pcs), 0) AS pcs
      FROM inventory_batches
      WHERE product_id = ?
        AND pack_size = ?
      `,
      [productId, packSize]
    );

    const totalPcs = Number(rows[0]?.pcs || 0);
    const boxes = Math.floor(totalPcs / packSize);
    const items = totalPcs % packSize;

    res.json({
      product_id: productId,
      pack_size: packSize,
      total_pcs: totalPcs,
      boxes,
      items,
    });
  } catch (err) {
    console.error("Pack stock error:", err);
    res.status(500).json({ error: "Failed to load pack stock" });
  }
});

// ---------------------------
// GET /api/adjustments/reasons
// ---------------------------
router.get("/reasons", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT reason_id, code, display_name FROM adjustment_reasons ORDER BY display_name"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error getting adjustment reasons:", err);
    res.status(500).json({ error: "Failed to load reasons" });
  }
});

// ---------------------------
// GET /api/adjustments?month=2025-11
// List adjustments for a month (or last 30 days if month missing)
// ---------------------------
// ---------------------------
// POST /api/adjustments
// creates DRAFT only (no stock change yet)
// body: { reason_id, remark?, source_type, source_id?, items:[...] }
// items: [{ product_id, pack_size, delta_boxes, delta_items }]
// ---------------------------
router.post("/", authenticateToken, async (req, res) => {
  const {
    // note_date  <-- we deliberately ignore any client-sent date
    reason_id,
    remark = null,
    source_type,
    source_id = null,
    items = [],
  } = req.body;

  // ✅ no more note_date check here
  if (!reason_id || !source_type || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["GRN", "ISSUE", "UNLOAD", "DIRECT"].includes(source_type)) {
    return res.status(400).json({ error: "Invalid source_type" });
  }

  for (const it of items) {
    if (!it.product_id || !it.pack_size) {
      return res
        .status(400)
        .json({ error: "Each item needs product_id and pack_size" });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [maxRow] = await conn.query(
      "SELECT MAX(note_id) AS max_id FROM adjustment_notes"
    );
    const nextId = (maxRow[0]?.max_id || 0) + 1;
    const noteNo = `ADJ-${String(nextId).padStart(5, "0")}`;

    // ✅ note_date is set by DB using CURDATE()
    // created_at column will use its DEFAULT CURRENT_TIMESTAMP
    const noteDate = getLocalDateString();
    const createdAt = getLocalTimestamp();

    const [header] = await conn.query(
      `INSERT INTO adjustment_notes
         (note_no, note_date, reason_id, remark,
          source_type, source_id, created_by, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
      [
        noteNo,
        noteDate,
        reason_id,
        remark,
        source_type,
        source_id,
        req.user.user_id,
        createdAt,
      ]
    );
    const noteId = header.insertId;

    for (const raw of items) {
      const {
        product_id,
        pack_size,
        delta_boxes = 0,
        delta_items = 0,
        related_item_id = null,
        expiry_date = null,
      } = raw;

      await conn.query(
        `INSERT INTO adjustment_items
           (note_id, product_id, pack_size,
            delta_boxes, delta_items,
            related_item_id, expiry_date)
         VALUES (?,?,?,?,?,?,?)`,
        [
          noteId,
          product_id,
          asInt(pack_size),
          asInt(delta_boxes),
          asInt(delta_items),
          related_item_id,
          expiry_date,
        ]
      );
    }

    await conn.commit();
    res.json({ note_id: noteId, note_no: noteNo });
  } catch (err) {
    try {
      await conn.rollback();
    } catch { }
    console.error("Create adjustment failed:", err);
    res
      .status(400)
      .json({ error: err.message || "Failed to create adjustment" });
  } finally {
    conn.release();
  }
});


// ---------------------------
// GET /api/adjustments/:note_id
// Full details of one adjustment note (header + items)
// ---------------------------
router.get("/:note_id", authenticateToken, async (req, res) => {
  const noteId = Number(req.params.note_id || 0);
  if (!noteId || Number.isNaN(noteId)) {
    return res.status(400).json({ error: "Invalid note_id" });
  }

  try {
    const [hdrRows] = await pool.query(
      `
      SELECT
        n.*,
        r.display_name AS reason_name,
        r.code         AS reason_code,
        u.username     AS created_by_username,
        u.full_name    AS created_by_full_name
      FROM adjustment_notes n
      LEFT JOIN adjustment_reasons r ON r.reason_id = n.reason_id
      LEFT JOIN users u ON u.user_id = n.created_by
      WHERE n.note_id = ?
      `,
      [noteId]
    );

    if (!hdrRows.length) {
      return res.status(404).json({ error: "Adjustment not found" });
    }

    const [items] = await pool.query(
      `
      SELECT
        ai.*,
        p.product_code,
        p.name AS product_name
      FROM adjustment_items ai
      JOIN products p ON p.product_id = ai.product_id
      WHERE ai.note_id = ?
      ORDER BY ai.item_id
      `,
      [noteId]
    );

    res.json({
      header: hdrRows[0],
      items,
    });
  } catch (err) {
    console.error("Get adjustment details error:", err);
    res.status(500).json({ error: "Failed to load adjustment" });
  }
});

// ---------------------------
// POST /api/adjustments
// creates DRAFT only (no stock change yet)
// body: { note_date, reason_id, remark?, source_type, source_id?, items:[...] }
// items: [{ product_id, pack_size, delta_boxes, delta_items }]
// ---------------------------
/*router.post("/", authenticateToken, async (req, res) => {
  const {
    note_date,
    reason_id,
    remark = null,
    source_type,
    source_id = null,
    items = [],
  } = req.body;

  if (!note_date || !reason_id || !source_type || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["GRN", "ISSUE", "UNLOAD", "DIRECT"].includes(source_type)) {
    return res.status(400).json({ error: "Invalid source_type" });
  }

  for (const it of items) {
    if (!it.product_id || !it.pack_size) {
      return res.status(400).json({ error: "Each item needs product_id and pack_size" });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [maxRow] = await conn.query("SELECT MAX(note_id) AS max_id FROM adjustment_notes");
    const nextId = (maxRow[0]?.max_id || 0) + 1;
    const noteNo = `ADJ-${String(nextId).padStart(5, "0")}`;

    const [header] = await conn.query(
      `INSERT INTO adjustment_notes
         (note_no, note_date, reason_id, remark,
          source_type, source_id, created_by, status)
       VALUES (?,?,?,?,?,?,?, 'DRAFT')`,
      [noteNo, note_date, reason_id, remark, source_type, source_id, req.user.user_id]
    );
    const noteId = header.insertId;

    for (const raw of items) {
      const {
        product_id,
        pack_size,
        delta_boxes = 0,
        delta_items = 0,
        related_item_id = null,
        expiry_date = null,
      } = raw;

      await conn.query(
        `INSERT INTO adjustment_items
           (note_id, product_id, pack_size,
            delta_boxes, delta_items,
            related_item_id, expiry_date)
         VALUES (?,?,?,?,?,?,?)`,
        [
          noteId,
          product_id,
          asInt(pack_size),
          asInt(delta_boxes),
          asInt(delta_items),
          related_item_id,
          expiry_date,
        ]
      );
    }

    await conn.commit();
    res.json({ note_id: noteId, note_no: noteNo });
  } catch (err) {
    try { await conn.rollback(); } catch { }
    console.error("Create adjustment failed:", err);
    res.status(400).json({ error: err.message || "Failed to create adjustment" });
  } finally {
    conn.release();
  }
});
*/
// ---------------------------
// POST /api/adjustments/:note_id/post
// applies stock & sets status = POSTED
// ---------------------------
router.post("/:note_id/post", authenticateToken, async (req, res) => {
  const noteId = Number(req.params.note_id);
  if (!noteId || Number.isNaN(noteId)) {
    return res.status(400).json({ error: "Invalid note_id" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [hdrRows] = await conn.query(
      "SELECT * FROM adjustment_notes WHERE note_id = ? ",
      [noteId]
    );
    if (!hdrRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Adjustment note not found" });
    }
    const header = hdrRows[0];
    if (header.status === "POSTED") {
      await conn.rollback();
      return res.status(400).json({ error: "Already posted" });
    }

    const [items] = await conn.query(
      "SELECT * FROM adjustment_items WHERE note_id = ?",
      [noteId]
    );
    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({ error: "No items to post" });
    }

    for (const it of items) {
      const packSize = asInt(it.pack_size);
      const netPcs =
        asInt(it.delta_boxes) * packSize +
        asInt(it.delta_items); // no delta_pieces now

      if (netPcs === 0) continue;

      const productId = it.product_id;

      if (netPcs > 0) {
        // POSITIVE: stock IN (ADJUST+)
        await conn.query(
          `INSERT INTO inventory_batches
             (product_id, source_type, source_id, pack_size,
              received_pcs, remaining_pcs, received_boxes, received_items, expiry_date)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [
            productId,
            "ADJUST",
            it.item_id,
            packSize,
            netPcs,
            netPcs,
            asInt(it.delta_boxes),
            asInt(it.delta_items),
            it.expiry_date || null,
          ]
        );

        await conn.query(
          "UPDATE products SET quantity = quantity + ? WHERE product_id = ?",
          [netPcs, productId]
        );
      } else {
        // NEGATIVE: stock OUT (ADJUST-)
        let remaining = Math.abs(netPcs);

        const [batches] = await conn.query(
          `SELECT batch_id, remaining_pcs
             FROM inventory_batches
            WHERE product_id = ? AND pack_size = ? AND remaining_pcs > 0
            ORDER BY COALESCE(expiry_date,'9999-12-31'), created_at`,
          [productId, packSize]
        );

        for (const b of batches) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, asInt(b.remaining_pcs));

          await conn.query(
            `INSERT INTO adjustment_allocations
               (adj_item_id, batch_id, pieces_delta)
             VALUES (?,?,?)`,
            [it.item_id, b.batch_id, -take]
          );

          await conn.query(
            `UPDATE inventory_batches
               SET remaining_pcs = remaining_pcs - ?
             WHERE batch_id = ?`,
            [take, b.batch_id]
          );

          remaining -= take;
        }

        if (remaining > 0) {
          await conn.rollback();
          return res.status(400).json({
            error: `Not enough stock in batches for product ${productId} (short by ${remaining} pcs)`,
          });
        }

        await conn.query(
          "UPDATE products SET quantity = quantity + ? WHERE product_id = ?",
          [netPcs, productId] // netPcs is negative
        );
      }
    }

    await conn.query(
      "UPDATE adjustment_notes SET status='POSTED' WHERE note_id = ?",
      [noteId]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    try { await conn.rollback(); } catch { }
    console.error("Post adjustment failed:", err);
    res.status(400).json({ error: err.message || "Failed to post adjustment" });
  } finally {
    conn.release();
  }
});

module.exports = router;
