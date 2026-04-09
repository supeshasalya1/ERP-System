// server/src/routes/admin.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");

// If you already have these, keep the same paths:
const authenticateToken = require("./authMiddleware");
const requireAdmin = require("./requireAdmin");

// All routes here are admin-only
router.use(authenticateToken, requireAdmin);

// -------- helpers --------

const asInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};



function buildDateRangeClause(column, start, end, params) {
  let clause = "";
  if (start && end) {
    clause += ` AND DATE(${column}) BETWEEN ? AND ? `;
    params.push(start, end);
  } else if (start) {
    clause += ` AND DATE(${column}) >= ? `;
    params.push(start);
  } else if (end) {
    clause += ` AND DATE(${column}) <= ? `;
    params.push(end);
  }
  return clause;
}

// ===================== 1) STOCK (supplier-wise + product-wise) =====================

/**
 * ADMIN: Stock – product-wise with supplier info
 * GET /api/admin/stock?supplier_id=1
 *
 * Uses inventory_batches.remaining_pcs + products + suppliers
 */
router.get("/stock", async (req, res) => {
  try {
    const supplierId = asInt(req.query.supplier_id, 0);

    const params = [];
    let where = " WHERE 1=1 ";
    if (supplierId) {
      where += " AND p.supplier_id = ? ";
      params.push(supplierId);
    }

    const [rows] = await pool.query(
      `
      SELECT
        p.product_id,
        p.product_code,
        p.name AS product_name,
        p.supplier_id,
        s.name AS supplier_name,
        COALESCE(SUM(b.remaining_pcs), 0) AS available_pcs,
        COALESCE(p.default_pack_size, 1)  AS display_pack
      FROM products p
      LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
      LEFT JOIN inventory_batches b ON b.product_id = p.product_id
      ${where}
      GROUP BY
        p.product_id,
        p.product_code,
        p.name,
        p.supplier_id,
        s.name,
        p.default_pack_size
      ORDER BY s.name ASC, p.name ASC
      `,
      params
    );

    const data = (rows || []).map((r) => {
      const pack = Math.max(1, Number(r.display_pack) || 1);
      const pcs = Number(r.available_pcs) || 0;
      return {
        product_id: r.product_id,
        product_code: r.product_code,
        product_name: r.product_name,
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        display_pack: pack,
        available_pcs: pcs,
        available_boxes: Math.floor(pcs / pack),
        available_items: pcs % pack,
      };
    });

    res.json(data);
  } catch (e) {
    console.error("GET /api/admin/stock error:", e);
    res.status(500).json({ message: "Failed to fetch stock (admin)." });
  }
});

/**
 * ADMIN: Stock – supplier summary
 * GET /api/admin/stock/supplier-summary
 */
router.get("/stock/supplier-summary", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        s.supplier_id,
        s.name AS supplier_name,
        COALESCE(SUM(b.remaining_pcs), 0) AS total_pcs,
        COUNT(DISTINCT p.product_id)      AS product_count
      FROM suppliers s
      LEFT JOIN products p ON p.supplier_id = s.supplier_id
      LEFT JOIN inventory_batches b ON b.product_id = p.product_id
      GROUP BY s.supplier_id, s.name
      ORDER BY s.name ASC
      `
    );

    res.json(
      (rows || []).map((r) => ({
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        total_pcs: asInt(r.total_pcs),
        product_count: asInt(r.product_count),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/stock/supplier-summary error:", e);
    res.status(500).json({ message: "Failed to fetch supplier-wise stock." });
  }
});

// ===================== 2) BIN CARDS (admin uses same data as user) =====================
// NOTE: You already have /api/bincard for users. For admin panel, the frontend can
// call that same endpoint with the same query params (product_id, month).
// If you really want a separate /api/admin/bincard route, you can import the same
// logic here or delegate to the existing handler to avoid duplication.
// For now, we keep bin-card logic in one place (bincard.js).

// ===================== 3) GRNs – header list + items =====================

/**
 * ADMIN: GRN list (supplier + date filters)
 * GET /api/admin/grns?start=YYYY-MM-DD&end=YYYY-MM-DD&supplier_id=1
 */
router.get("/grns", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { start, end, supplier_id } = req.query;
    const supplierId = asInt(supplier_id, 0);

    const params = [];
    let where = " WHERE 1=1 ";

    if (supplierId) {
      where += " AND g.supplier_id = ? ";
      params.push(supplierId);
    }

    where += buildDateRangeClause("g.grn_date", start, end, params);

    const [rows] = await connection.query(
      `
      SELECT
        g.grn_id,
        g.grn_no,
        g.grn_date,
        g.supplier_id,
        s.name       AS supplier_name,
        g.lorry_id,
        l.lorry_no,
        l.lorry_name,
        (SELECT COUNT(*) FROM grn_items gi WHERE gi.grn_id = g.grn_id) AS item_count,
        (SELECT COALESCE(SUM(gi.quantity_received), 0)
           FROM grn_items gi
          WHERE gi.grn_id = g.grn_id) AS total_pcs
      FROM grn g
      LEFT JOIN suppliers s ON s.supplier_id = g.supplier_id
      LEFT JOIN lorries   l ON l.lorry_id = g.lorry_id
      ${where}
      ORDER BY g.grn_date DESC, g.grn_id DESC
      `,
      params
    );

    const data = (rows || []).map((r) => ({
      grn_id: r.grn_id,
      grn_no: r.grn_no,
      grn_date: r.grn_date,
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name,
      lorry_id: r.lorry_id,
      lorry_no: r.lorry_no,
      lorry_name: r.lorry_name,
      item_count: asInt(r.item_count),
      total_pcs: asInt(r.total_pcs),
    }));

    res.json(data);
  } catch (e) {
    console.error("GET /api/admin/grns error:", e);
    res.status(500).json({ message: "Failed to fetch GRNs (admin)." });
  } finally {
    connection.release();
  }
});

/**
 * ADMIN: GRN items (products and received quantities)
 * GET /api/admin/grns/:grn_id/items
 */
router.get("/grns/:grn_id/items", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const grnId = asInt(req.params.grn_id, 0);
    if (!grnId) {
      return res.status(400).json({ message: "Invalid grn_id" });
    }

    const [rows] = await connection.query(
      `
      SELECT
        gi.entry_id,
        gi.product_id,
        p.product_code,
        p.name AS product_name,
        gi.pack_size,
        gi.boxes_received,
        gi.items_received,
        gi.quantity_received AS total_pcs,
        gi.batch_id
      FROM grn_items gi
      LEFT JOIN products p ON p.product_id = gi.product_id
      WHERE gi.grn_id = ?
      ORDER BY gi.entry_id ASC
      `,
      [grnId]
    );

    res.json(
      (rows || []).map((r) => ({
        entry_id: r.entry_id,
        product_id: r.product_id,
        product_code: r.product_code,
        product_name: r.product_name,
        pack_size: asInt(r.pack_size),
        boxes_received: asInt(r.boxes_received),
        items_received: asInt(r.items_received),
        total_pcs: asInt(r.total_pcs),
        batch_id: r.batch_id,
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/grns/:grn_id/items error:", e);
    res.status(500).json({ message: "Failed to fetch GRN items (admin)." });
  } finally {
    connection.release();
  }
});

// ===================== 4) ISSUE NOTES – header + items =====================

/**
 * ADMIN: Issue Notes list
 * GET /api/admin/issue-notes?start=&end=&lorry_id=
 */


router.get("/issue-notes", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { start, end, supplier_id, product_id } = req.query;

    const params = [];
    let where = " WHERE 1=1 ";

    if (start && end) {
      where += " AND DATE(i.date_created) BETWEEN ? AND ? ";
      params.push(start, end);
    }

    // 🔹 Supplier filter: issue notes that have at least one item whose product belongs to this supplier
    if (supplier_id) {
      where += `
        AND EXISTS (
          SELECT 1
          FROM issue_items ii2
          JOIN products p2 ON p2.product_id = ii2.product_id
          WHERE ii2.issue_id = i.issue_id
            AND p2.supplier_id = ?
        )
      `;
      params.push(asInt(supplier_id));
    }

    // 🔹 Product filter (optional, if you decide to use it later)
    if (product_id) {
      where += `
        AND EXISTS (
          SELECT 1
          FROM issue_items ii3
          WHERE ii3.issue_id = i.issue_id
            AND ii3.product_id = ?
        )
      `;
      params.push(asInt(product_id));
    }

    const sql = `
      SELECT
        i.issue_id,
        i.issue_no,
        i.date_created,
        i.authenticator,
        i.lorry_id,
        il.lorry_no,
        il.lorry_name,
        i.initiator_id,
        cu.username AS creator_username,
        i.is_edited,
        i.edited_by,
        i.edited_at,
        eu.username AS editor_username,
        MIN(p.supplier_id) AS supplier_id,
        MIN(s.name)        AS supplier_name,
        (SELECT COUNT(*) FROM issue_items ii WHERE ii.issue_id = i.issue_id) AS item_count
      FROM issue_note i
      LEFT JOIN issue_lorries il ON il.lorry_id = i.lorry_id
      LEFT JOIN users cu         ON cu.user_id = i.initiator_id
      LEFT JOIN users eu         ON eu.user_id = i.edited_by
      LEFT JOIN issue_items ii   ON ii.issue_id = i.issue_id
      LEFT JOIN products p       ON p.product_id = ii.product_id
      LEFT JOIN suppliers s      ON s.supplier_id = p.supplier_id
      ${where}
      GROUP BY i.issue_id, i.issue_no, i.date_created, i.authenticator, i.lorry_id, il.lorry_no, il.lorry_name, i.initiator_id, cu.username, i.is_edited, i.edited_by, i.edited_at, eu.username
      ORDER BY i.date_created DESC, i.issue_id DESC
    `;

    const [rows] = await connection.query(sql, params);

    const data = (rows || []).map((r) => ({
      issue_id: r.issue_id,
      issue_no: r.issue_no,
      created_at: r.date_created,
      authenticator: r.authenticator,
      lorry_no: r.lorry_no,
      lorry_name: r.lorry_name,
      creator_username: r.creator_username,
      supplier_id: r.supplier_id,
      supplier_name: r.supplier_name,
      item_count: r.item_count || 0,
      is_edited: !!r.is_edited,
      edited_by_username: r.editor_username || null,
      edited_at: r.edited_at || null,
    }));

    res.json(data);
  } catch (e) {
    console.error("GET /api/admin/issue-notes error:", e);
    res.status(500).json({ message: "Failed to fetch issue notes (admin)." });
  } finally {
    connection.release();
  }
});


/**
 * ADMIN: Issue Note items
 * GET /api/admin/issue-notes/:issue_id/items
 */
router.get("/issue-notes/:issue_id/items", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const issueId = asInt(req.params.issue_id, 0);
    if (!issueId) {
      return res.status(400).json({ message: "Invalid issue_id" });
    }

    const [rows] = await connection.query(
      `
      SELECT
        ii.entry_id,
        ii.product_id,
        p.product_code,
        p.name AS product_name,
        ii.quantity_sent,
        ii.boxes_sent,
        ii.items_sent,
        ii.pieces_sent
      FROM issue_items ii
      LEFT JOIN products p ON p.product_id = ii.product_id
      WHERE ii.issue_id = ?
      ORDER BY ii.entry_id ASC
      `,
      [issueId]
    );

    res.json(
      (rows || []).map((r) => ({
        entry_id: r.entry_id,
        product_id: r.product_id,
        product_code: r.product_code,
        product_name: r.product_name,
        quantity_sent: asInt(r.quantity_sent),
        boxes_sent: asInt(r.boxes_sent),
        items_sent: asInt(r.items_sent),
        pieces_sent: asInt(r.pieces_sent),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/issue-notes/:issue_id/items error:", e);
    res
      .status(500)
      .json({ message: "Failed to fetch issue note items (admin)." });
  } finally {
    connection.release();
  }
});

// ===================== 5) UNLOAD NOTES – header + items =====================

/**
 * ADMIN: Unload Notes list
 * GET /api/admin/unload-notes?start=&end=
 */
router.get("/unload-notes", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { start, end, supplier_id } = req.query;
    const supplierId = asInt(supplier_id, 0);
    const params = [];
    let where = " WHERE 1=1 ";
    where += buildDateRangeClause("un.unload_date", start, end, params);

    if (supplierId) {
      where += " AND p.supplier_id = ? ";
      params.push(supplierId);
    }

    const [rows] = await connection.query(
      `
      SELECT
        un.id          AS unload_id,
        un.unload_no,
        un.unload_date,
        un.issue_id,
        i.issue_no,
        un.lorry_id,
        il.lorry_no,
        il.lorry_name,
        un.created_by,
        u.username    AS created_by_username,
        MIN(p.supplier_id) AS supplier_id,
        MIN(s.name)        AS supplier_name,
        COALESCE(COUNT(DISTINCT ui.product_id), 0) AS item_count,
        COALESCE(SUM(ui.quantity_returned), 0)     AS total_pcs
      FROM unload_note un
      LEFT JOIN unload_items ui   ON ui.unload_id = un.id
      LEFT JOIN products p        ON ui.product_id = p.product_id
      LEFT JOIN suppliers s       ON s.supplier_id = p.supplier_id
      LEFT JOIN issue_note    i   ON i.issue_id    = un.issue_id
      LEFT JOIN issue_lorries il  ON il.lorry_id   = un.lorry_id
      LEFT JOIN users         u   ON u.user_id     = un.created_by
      ${where}
      GROUP BY un.id, un.unload_no, un.unload_date, un.issue_id, i.issue_no, un.lorry_id, il.lorry_no, il.lorry_name, un.created_by, u.username
      ORDER BY un.unload_date DESC, un.id DESC
      `,
      params
    );

    res.json(
      (rows || []).map((r) => ({
        unload_id: r.unload_id,
        unload_no: r.unload_no,
        unload_date: r.unload_date,
        issue_id: r.issue_id,
        issue_no: r.issue_no,
        lorry_id: r.lorry_id,
        lorry_no: r.lorry_no,
        lorry_name: r.lorry_name,
        created_by_username: r.created_by_username,
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        item_count: asInt(r.item_count),
        total_pcs: asInt(r.total_pcs),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/unload-notes error:", e);
    res.status(500).json({ message: "Failed to fetch unload notes (admin)." });
  } finally {
    connection.release();
  }
});

/**
 * ADMIN: Unload Note items
 * GET /api/admin/unload-notes/:unload_id/items
 */
router.get("/unload-notes/:unload_id/items", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const unloadId = asInt(req.params.unload_id, 0);
    if (!unloadId) {
      return res.status(400).json({ message: "Invalid unload_id" });
    }

    const [rows] = await connection.query(
      `
      SELECT
        ui.id,
        ui.product_id,
        p.product_code,
        p.name AS product_name,
        ui.pack_size,
        ui.boxes_returned,
        ui.items_returned,
        ui.quantity_returned AS total_pcs
      FROM unload_items ui
      LEFT JOIN products p ON p.product_id = ui.product_id
      WHERE ui.unload_id = ?
      ORDER BY ui.id ASC
      `,
      [unloadId]
    );

    res.json(
      (rows || []).map((r) => ({
        id: r.id,
        product_id: r.product_id,
        product_code: r.product_code,
        product_name: r.product_name,
        pack_size: asInt(r.pack_size),
        boxes_returned: asInt(r.boxes_returned),
        items_returned: asInt(r.items_returned),
        total_pcs: asInt(r.total_pcs),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/unload-notes/:unload_id/items error:", e);
    res
      .status(500)
      .json({ message: "Failed to fetch unload note items (admin)." });
  } finally {
    connection.release();
  }
});

// ===================== 6) ADJUSTMENT NOTES – header + items =====================

// ===================== 7) EXPIRE STORE + EXPIRE NOTES / RETURN NOTES =====================

/**
 * ADMIN: Expire store stock
 * GET /api/admin/expire-store
 */
router.get("/expire-store", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        ess.id,
        ess.product_id,
        p.product_code,
        p.name AS product_name,
        ess.supplier_id,
        s.name AS supplier_name,
        ess.pack_size,
        ess.total_pcs,
        ess.boxes,
        ess.items,
        ess.updated_at
      FROM expire_store_stock ess
      LEFT JOIN products  p ON p.product_id    = ess.product_id
      LEFT JOIN suppliers s ON s.supplier_id   = ess.supplier_id
      ORDER BY s.name ASC, p.name ASC, ess.pack_size ASC
      `
    );

    res.json(
      (rows || []).map((r) => ({
        id: r.id,
        product_id: r.product_id,
        product_code: r.product_code,
        product_name: r.product_name,
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        pack_size: asInt(r.pack_size),
        total_pcs: asInt(r.total_pcs),
        boxes: asInt(r.boxes),
        items: asInt(r.items),
        updated_at: r.updated_at,
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/expire-store error:", e);
    res.status(500).json({ message: "Failed to fetch expire store stock." });
  }
});

/**
 * ADMIN: Expire receive notes (expired goods received from lorries)
 * GET /api/admin/expire-receive-notes?start=&end=
 */
router.get("/expire-receive-notes", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { start, end } = req.query;
    const params = [];
    let where = " WHERE 1=1 ";
    where += buildDateRangeClause("ern.note_date", start, end, params);

    const [rows] = await connection.query(
      `
      SELECT
        ern.id,
        ern.note_no,
        ern.note_date,
        ern.lorry_id,
        il.lorry_no,
        il.lorry_name,
        ern.created_by,
        u.username  AS created_by_username,
        ern.status,
        ern.remarks,
        (SELECT COUNT(*) FROM expire_receive_items eri WHERE eri.note_id = ern.id) AS item_count,
        (SELECT COALESCE(SUM(eri.total_pcs), 0)
           FROM expire_receive_items eri
          WHERE eri.note_id = ern.id) AS total_pcs
      FROM expire_receive_notes ern
      LEFT JOIN issue_lorries il ON il.lorry_id = ern.lorry_id
      LEFT JOIN users        u   ON u.user_id   = ern.created_by
      ${where}
      ORDER BY ern.note_date DESC, ern.id DESC
      `,
      params
    );

    res.json(
      (rows || []).map((r) => ({
        note_id: r.id,
        note_no: r.note_no,
        note_date: r.note_date,
        lorry_id: r.lorry_id,
        lorry_no: r.lorry_no,
        lorry_name: r.lorry_name,
        created_by_username: r.created_by_username,
        status: r.status,
        remarks: r.remarks,
        item_count: asInt(r.item_count),
        total_pcs: asInt(r.total_pcs),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/expire-receive-notes error:", e);
    res
      .status(500)
      .json({ message: "Failed to fetch expire receive notes (admin)." });
  } finally {
    connection.release();
  }
});

/**
 * ADMIN: Expire receive note items
 * GET /api/admin/expire-receive-notes/:note_id/items
 */
router.get("/expire-receive-notes/:note_id/items", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const noteId = asInt(req.params.note_id, 0);
    if (!noteId) {
      return res.status(400).json({ message: "Invalid note_id" });
    }

    const [rows] = await connection.query(
      `
      SELECT
        eri.id,
        eri.product_id,
        p.product_code,
        p.name AS product_name,
        eri.supplier_id,
        s.name AS supplier_name,
        eri.pack_size,
        eri.boxes,
        eri.items,
        eri.total_pcs,
        eri.expiry_date
      FROM expire_receive_items eri
      LEFT JOIN products  p ON p.product_id    = eri.product_id
      LEFT JOIN suppliers s ON s.supplier_id   = eri.supplier_id
      WHERE eri.note_id = ?
      ORDER BY eri.id ASC
      `,
      [noteId]
    );

    res.json(
      (rows || []).map((r) => ({
        id: r.id,
        product_id: r.product_id,
        product_code: r.product_code,
        product_name: r.product_name,
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        pack_size: asInt(r.pack_size),
        boxes: asInt(r.boxes),
        items: asInt(r.items),
        total_pcs: asInt(r.total_pcs),
        expiry_date: r.expiry_date,
      }))
    );
  } catch (e) {
    console.error(
      "GET /api/admin/expire-receive-notes/:note_id/items error:",
      e
    );
    res
      .status(500)
      .json({ message: "Failed to fetch expire receive items (admin)." });
  } finally {
    connection.release();
  }
});

/**
 * ADMIN: Expire return notes (expired goods returned to suppliers)
 * GET /api/admin/expire-return-notes?start=&end=&supplier_id=
 */
router.get("/expire-return-notes", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { start, end, supplier_id } = req.query;
    const supplierId = asInt(supplier_id, 0);

    const params = [];
    let where = " WHERE 1=1 ";

    if (supplierId) {
      where += " AND er.supplier_id = ? ";
      params.push(supplierId);
    }
    where += buildDateRangeClause("er.note_date", start, end, params);

    const [rows] = await connection.query(
      `
      SELECT
        er.id,
        er.note_no,
        er.note_date,
        er.supplier_id,
        s.name AS supplier_name,
        er.lorry_id,
        l.lorry_no,
        l.lorry_name,
        er.created_by,
        u.username AS created_by_username,
        er.status,
        er.remarks,
        (SELECT COUNT(*) FROM expire_return_items eri WHERE eri.note_id = er.id) AS item_count,
        (SELECT COALESCE(SUM(eri.total_pcs), 0)
           FROM expire_return_items eri
          WHERE eri.note_id = er.id) AS total_pcs
      FROM expire_return_notes er
      LEFT JOIN suppliers s ON s.supplier_id = er.supplier_id
      LEFT JOIN lorries   l ON l.lorry_id    = er.lorry_id
      LEFT JOIN users     u ON u.user_id     = er.created_by
      ${where}
      ORDER BY er.note_date DESC, er.id DESC
      `,
      params
    );

    res.json(
      (rows || []).map((r) => ({
        note_id: r.id,
        note_no: r.note_no,
        note_date: r.note_date,
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        lorry_id: r.lorry_id,
        lorry_no: r.lorry_no,
        lorry_name: r.lorry_name,
        created_by_username: r.created_by_username,
        status: r.status,
        remarks: r.remarks,
        item_count: asInt(r.item_count),
        total_pcs: asInt(r.total_pcs),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/expire-return-notes error:", e);
    res
      .status(500)
      .json({ message: "Failed to fetch expire return notes (admin)." });
  } finally {
    connection.release();
  }
});

/**
 * ADMIN: Expire return note items
 * GET /api/admin/expire-return-notes/:note_id/items
 */
router.get("/expire-return-notes/:note_id/items", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const noteId = asInt(req.params.note_id, 0);
    if (!noteId) {
      return res.status(400).json({ message: "Invalid note_id" });
    }

    const [rows] = await connection.query(
      `
      SELECT
        eri.id,
        eri.product_id,
        p.product_code,
        p.name AS product_name,
        eri.supplier_id,
        s.name AS supplier_name,
        eri.pack_size,
        eri.boxes,
        eri.items,
        eri.total_pcs
      FROM expire_return_items eri
      LEFT JOIN products  p ON p.product_id    = eri.product_id
      LEFT JOIN suppliers s ON s.supplier_id   = eri.supplier_id
      WHERE eri.note_id = ?
      ORDER BY eri.id ASC
      `,
      [noteId]
    );

    res.json(
      (rows || []).map((r) => ({
        id: r.id,
        product_id: r.product_id,
        product_code: r.product_code,
        product_name: r.product_name,
        supplier_id: r.supplier_id,
        supplier_name: r.supplier_name,
        pack_size: asInt(r.pack_size),
        boxes: asInt(r.boxes),
        items: asInt(r.items),
        total_pcs: asInt(r.total_pcs),
      }))
    );
  } catch (e) {
    console.error(
      "GET /api/admin/expire-return-notes/:note_id/items error:",
      e
    );
    res
      .status(500)
      .json({ message: "Failed to fetch expire return items (admin)." });
  } finally {
    connection.release();
  }
});

// ===================== 8) ADD NEW USERS =====================

/**
 * ADMIN: Create new system user
 * POST /api/admin/users
 * body: { full_name, nic, address, dob, mobile_no, username, password, role }
 */
router.post("/users", async (req, res) => {
  const {
    full_name,
    nic,
    address,
    dob,
    mobile_no,
    username,
    password,
    role,
  } = req.body || {};

  if (
    !full_name ||
    !nic ||
    !address ||
    !dob ||
    !mobile_no ||
    !username ||
    !password
  ) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const allowedRoles = ["user", "admin", "super_admin"];
  const finalRole = allowedRoles.includes(role) ? role : "user";

  try {
    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      INSERT INTO users
        (full_name, nic, address, dob, mobile_no, username, password, role)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        full_name,
        nic,
        address,
        dob,
        mobile_no,
        username,
        hashed,
        finalRole,
      ]
    );

    res.status(201).json({
      user_id: result.insertId,
      full_name,
      nic,
      address,
      dob,
      mobile_no,
      username,
      role: finalRole,
    });
  } catch (e) {
    console.error("POST /api/admin/users error:", e);
    // Likely unique constraint violation (username, nic, mobile)
    res.status(500).json({ message: "Failed to create user." });
  }
});

// ===================== 9) ADD NEW CASH COLLECTORS =====================
// Assuming "cash collectors" are stored in representatives table.

/**
 * ADMIN: Create new cash collector (representative)
 * POST /api/admin/cash-collectors
 * body: { nic, full_name, call_name, mobile_no, address, dob }
 */
router.post("/cash-collectors", async (req, res) => {
  const { nic, full_name, call_name, mobile_no, address, dob } = req.body || {};

  if (!nic || !full_name || !call_name || !mobile_no || !address || !dob) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const [result] = await pool.query(
      `
      INSERT INTO representatives
        (nic, full_name, call_name, mobile_no, address, dob)
      VALUES
        (?, ?, ?, ?, ?, ?)
      `,
      [nic, full_name, call_name, mobile_no, address, dob]
    );

    res.status(201).json({
      rep_id: result.insertId,
      nic,
      full_name,
      call_name,
      mobile_no,
      address,
      dob,
    });
  } catch (e) {
    console.error("POST /api/admin/cash-collectors error:", e);
    res.status(500).json({ message: "Failed to create cash collector." });
  }
});

/**
 * ADMIN: Unload Notes list
 * - Returns ALL unload notes (any user)
 * - Includes creator username
 * - Optional:
 *    ?start=YYYY-MM-DD&end=YYYY-MM-DD
 *    ?supplier_id=123  (filters by product supplier)
 *
 * Tables:
 *   unload_note(id, unload_no, unload_date, issue_id, lorry_id, created_by, remarks)
 *   unload_items(id, unload_id, product_id, pack_size, quantity_returned, ...)
 *   products(product_id, supplier_id, ...)
 *   users(user_id, username)
 *   issue_lorries(lorry_id, lorry_no, lorry_name)
 */
router.get("/unload-notes", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { start, end, supplier_id } = req.query;

    const params = [];
    let where = " WHERE 1=1 ";

    if (start && end) {
      where += " AND DATE(u.unload_date) BETWEEN ? AND ? ";
      params.push(start, end);
    }

    if (supplier_id) {
      // filter by supplier of products in unload_items
      where += " AND p.supplier_id = ? ";
      params.push(supplier_id);
    }

    const sql = `
      SELECT
        u.id,
        u.unload_no,
        u.unload_date,
        u.issue_id,
        u.lorry_id,
        il.lorry_no,
        il.lorry_name,
        u.created_by,
        cu.username AS creator_username,
        COUNT(DISTINCT ui.id)              AS item_count,
        COALESCE(SUM(ui.quantity_returned), 0) AS total_pcs
      FROM unload_note u
      LEFT JOIN unload_items ui
        ON ui.unload_id = u.id
      LEFT JOIN products p
        ON p.product_id = ui.product_id
      LEFT JOIN issue_lorries il
        ON il.lorry_id = u.lorry_id
      LEFT JOIN users cu
        ON cu.user_id = u.created_by
      ${where}
      GROUP BY
        u.id,
        u.unload_no,
        u.unload_date,
        u.issue_id,
        u.lorry_id,
        il.lorry_no,
        il.lorry_name,
        u.created_by,
        cu.username
      ORDER BY u.unload_date DESC, u.id DESC
    `;

    const [rows] = await connection.query(sql, params);

    const data = (rows || []).map((r) => ({
      id: r.id,
      unload_no: r.unload_no,
      unload_date: r.unload_date, // frontend will just display as string
      issue_id: r.issue_id,
      lorry_no: r.lorry_no,
      lorry_name: r.lorry_name,
      created_by_username: r.creator_username || null,
      item_count: r.item_count || 0,
      total_pcs: r.total_pcs || 0,
    }));

    res.json(data);
  } catch (e) {
    console.error("GET /api/admin/unload-notes error:", e);
    res.status(500).json({ message: "Failed to fetch unload notes (admin)." });
  } finally {
    connection.release();
  }
});

// =========================
// ADMIN – Adjustment Notes list (no drafts)
// GET /api/admin/adjustments
// =========================
router.get(
  "/adjustments",
  authenticateToken,
  async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const {
        start,
        end,
        reason_id,
        product_id,
        supplier_id,
        status,
        source_type,
      } = req.query || {};

      const params = [];
      // 🔴 base: completely hide DRAFTs
      let where = " WHERE UPPER(an.status) <> 'DRAFT' ";

      if (start && end) {
        where += " AND an.note_date BETWEEN ? AND ? ";
        params.push(start, end);
      }

      if (reason_id) {
        where += " AND an.reason_id = ? ";
        params.push(Number(reason_id));
      }

      if (status) {
        // this will never return DRAFT, because of base condition above
        where += " AND an.status = ? ";
        params.push(status);
      }

      if (source_type) {
        where += " AND an.source_type = ? ";
        params.push(source_type);
      }

      // filter by product
      if (product_id) {
        where += `
          AND EXISTS (
            SELECT 1
            FROM adjustment_items ai_p
            WHERE ai_p.note_id = an.note_id
              AND ai_p.product_id = ?
          )
        `;
        params.push(Number(product_id));
      }

      // filter by supplier (via products table)
      if (supplier_id) {
        where += `
          AND EXISTS (
            SELECT 1
            FROM adjustment_items ai_s
            JOIN products p_s ON p_s.product_id = ai_s.product_id
            WHERE ai_s.note_id = an.note_id
              AND p_s.supplier_id = ?
          )
        `;
        params.push(Number(supplier_id));
      }

      const sql = `
        SELECT
          base.note_id,
          base.note_no,
          base.note_date,
          base.reason_id,
          base.reason_name,
          base.remark,
          base.source_type,
          base.source_id,
          base.status,
          base.created_at,
          base.created_by_id,
          base.created_by_username,
          base.created_by_full_name,
          base.grn_no,
          base.issue_no,
          base.unload_no,
          base.item_count,
          base.total_delta_pcs,
          COALESCE(sup.supplier_id, base.grn_supplier_id)     AS supplier_id,
          COALESCE(sup.supplier_name, base.grn_supplier_name) AS supplier_name
        FROM (
          SELECT
            an.note_id,
            an.note_no,
            an.note_date,
            an.reason_id,
            ar.display_name        AS reason_name,
            an.remark,
            an.source_type,
            an.source_id,
            an.status,
            an.created_at,
            u.user_id              AS created_by_id,
            u.username             AS created_by_username,
            u.full_name            AS created_by_full_name,
            g.grn_no               AS grn_no,
            g.supplier_id         AS grn_supplier_id,
            sg.name               AS grn_supplier_name,
            ino.issue_no           AS issue_no,
            un.unload_no           AS unload_no,
            COUNT(DISTINCT ai.item_id) AS item_count,
            CASE
              WHEN SUM(aa.pieces_delta) IS NOT NULL THEN SUM(aa.pieces_delta)
              ELSE SUM(ai.delta_boxes * ai.pack_size + ai.delta_items)
            END AS total_delta_pcs
          FROM adjustment_notes an
          JOIN adjustment_reasons ar ON ar.reason_id = an.reason_id
          JOIN users u              ON u.user_id = an.created_by
          LEFT JOIN adjustment_items ai
                 ON ai.note_id = an.note_id
          LEFT JOIN adjustment_allocations aa
                 ON aa.adj_item_id = ai.item_id
          LEFT JOIN grn g
                 ON an.source_type = 'GRN' AND an.source_id = g.grn_id
             /* fallback supplier from GRN header if no product supplier resolved */
             LEFT JOIN suppliers sg
               ON g.supplier_id = sg.supplier_id
          LEFT JOIN issue_note ino
                 ON an.source_type = 'ISSUE' AND an.source_id = ino.issue_id
          LEFT JOIN unload_note un
                 ON an.source_type = 'UNLOAD' AND an.source_id = un.id
          ${where}
          GROUP BY
            an.note_id,
            an.note_no,
            an.note_date,
            an.reason_id,
            ar.display_name,
            an.remark,
            an.source_type,
            an.source_id,
            an.status,
            an.created_at,
            u.user_id,
            u.username,
            u.full_name,
            g.grn_no,
            g.supplier_id,
            sg.name,
            ino.issue_no,
            un.unload_no
        ) AS base
        LEFT JOIN (
          SELECT
            ai.note_id,
            MIN(p.supplier_id) AS supplier_id,
            MIN(s.name)        AS supplier_name
          FROM adjustment_items ai
          JOIN products p ON p.product_id = ai.product_id
          LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
          GROUP BY ai.note_id
        ) AS sup
          ON sup.note_id = base.note_id
        ORDER BY base.note_date DESC, base.note_id DESC
      `;

      const [rows] = await connection.query(sql, params);

      const data = (rows || []).map((r) => {
        let source_ref = null;
        if (r.source_type === "GRN") source_ref = r.grn_no;
        else if (r.source_type === "ISSUE") source_ref = r.issue_no;
        else if (r.source_type === "UNLOAD") source_ref = r.unload_no;

        return {
          note_id: r.note_id,
          note_no: r.note_no,
          note_date: r.note_date,
          reason_id: r.reason_id,
          reason_name: r.reason_name,
          remark: r.remark,
          source_type: r.source_type,
          source_id: r.source_id,
          source_ref,
          status: r.status,
          created_at: r.created_at,
          created_by_id: r.created_by_id,
          created_by_username: r.created_by_username,
          created_by_full_name: r.created_by_full_name,
          item_count: r.item_count || 0,
          total_delta_pcs: Number(r.total_delta_pcs) || 0,
          supplier_id: r.supplier_id || null,
          supplier_name: r.supplier_name || null,
        };
      });

      res.json(data);
    } catch (e) {
      console.error("GET /api/admin/adjustments error:", e);
      res
        .status(500)
        .json({ message: "Failed to fetch adjustment notes (admin)." });
    } finally {
      connection.release();
    }
  }
);

/**
 * ADMIN: Adjustment note items + allocations for a single note
 * - Returns per-item details (product, pack, delta) + linked batches
 */
// =========================
// ADMIN – Adjustment items with allocations
// GET /api/admin/adjustments/:noteId/items
// =========================
router.get(
  "/adjustments/:noteId/items",
  authenticateToken,
  async (req, res) => {
    const noteId = Number(req.params.noteId || 0);
    if (!noteId) {
      return res.status(400).json({ message: "Invalid note id" });
    }

    const connection = await pool.getConnection();
    try {
      // 1) Base item + net pcs (prefer allocations)
      const [itemRows] = await connection.query(
        `
        SELECT
          ai.item_id,
          ai.note_id,
          ai.product_id,
          p.product_code,
          p.name AS product_name,
          ai.pack_size,
          ai.expiry_date,

          CASE
            WHEN SUM(aa.pieces_delta) IS NOT NULL
            THEN SUM(aa.pieces_delta)
            ELSE (ai.delta_boxes * ai.pack_size + ai.delta_items)
          END AS net_pcs_raw,

          CASE
            WHEN SUM(aa.pieces_delta) IS NOT NULL
            THEN FLOOR(SUM(aa.pieces_delta) / ai.pack_size)
            ELSE ai.delta_boxes
          END AS delta_boxes_calc,

          CASE
            WHEN SUM(aa.pieces_delta) IS NOT NULL
            THEN SUM(aa.pieces_delta) % ai.pack_size
            ELSE ai.delta_items
          END AS delta_items_calc
        FROM adjustment_items ai
        JOIN products p ON p.product_id = ai.product_id
        LEFT JOIN adjustment_allocations aa
               ON aa.adj_item_id = ai.item_id
        WHERE ai.note_id = ?
        GROUP BY
          ai.item_id,
          ai.note_id,
          ai.product_id,
          p.product_code,
          p.name,
          ai.pack_size,
          ai.expiry_date,
          ai.delta_boxes,
          ai.delta_items
        ORDER BY ai.item_id
        `,
        [noteId]
      );

      if (!itemRows.length) {
        return res.json([]);
      }

      const itemIds = itemRows.map((r) => r.item_id);

      // 2) Load allocations for those items (with batch info)
      const [allocRows] = await connection.query(
        `
        SELECT
          aa.allocation_id,
          aa.adj_item_id,
          aa.batch_id,
          aa.pieces_delta,
          b.source_type AS batch_source_type,
          b.source_id   AS batch_source_id
        FROM adjustment_allocations aa
        JOIN inventory_batches b ON b.batch_id = aa.batch_id
        WHERE aa.adj_item_id IN (${itemIds.map(() => "?").join(",")})
        ORDER BY aa.allocation_id
        `,
        itemIds
      );

      const allocationsByItem = {};
      for (const row of allocRows) {
        if (!allocationsByItem[row.adj_item_id]) {
          allocationsByItem[row.adj_item_id] = [];
        }
        allocationsByItem[row.adj_item_id].push({
          allocation_id: row.allocation_id,
          batch_id: row.batch_id,
          pieces_delta: Number(row.pieces_delta) || 0,
          batch_source_type: row.batch_source_type,
          batch_source_id: row.batch_source_id,
        });
      }

      // 3) Shape final response to match frontend expectations
      const result = itemRows.map((r) => ({
        item_id: r.item_id,
        note_id: r.note_id,
        product_id: r.product_id,
        product_code: r.product_code,
        product_name: r.product_name,
        pack_size: Number(r.pack_size) || 1,
        expiry_date: r.expiry_date,
        delta_boxes: Number(r.delta_boxes_calc) || 0,
        delta_items: Number(r.delta_items_calc) || 0,
        net_pcs: Number(r.net_pcs_raw) || 0,
        allocations: allocationsByItem[r.item_id] || [],
      }));

      res.json(result);
    } catch (e) {
      console.error(
        "GET /api/admin/adjustments/:noteId/items error:",
        e
      );
      res
        .status(500)
        .json({ message: "Failed to fetch adjustment items (admin)." });
    } finally {
      connection.release();
    }
  }
);


module.exports = router;


