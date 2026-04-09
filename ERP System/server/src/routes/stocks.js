// server/src/routes/stocks.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require("./authMiddleware");
const { getLocalTimestamp } = require("../utils/datetime");

/*
NEW GRN item format (preferred):
items: [
  { product_id: 1, pack_size: 20, boxes_received: 50, items_received: 20 },
  { product_id: 2, pack_size: 25, boxes_received: 10, items_received: 0 }
]

Backward-compatible (old):
items: [
  { product_id: 1, quantity: 10 },   // treated as 10 pieces, pack_size=1
]
*/

const asInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ----------------- POST /api/stocks/add -----------------
router.post('/add', authenticateToken, async (req, res) => {
  const { grn_no, supplier_id, lorry_id, items } = req.body;

  if (!grn_no || !supplier_id || !lorry_id || !items || !items.length) {
    return res.status(400).json({ error: "Missing required fields or items" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Insert GRN (include grn_date only if provided)
    let grn_id;

    const [grnResult] = await conn.query(
      'INSERT INTO grn (grn_no, grn_date, supplier_id, lorry_id) VALUES (?, ?, ?, ?)',
      [grn_no, getLocalTimestamp(), supplier_id, lorry_id]
    );
    grn_id = grnResult.insertId;

    // Handle each GRN line
    for (const raw of items) {
      // Accept new or old shape
      let {
        product_id,
        pack_size,
        boxes_received,
        items_received,
        quantity, // old single "pieces"
      } = raw;

      // Backward compatibility (quantity only)
      if (!pack_size && (boxes_received == null && items_received == null)) {
        pack_size = 1;
        boxes_received = 0;
        items_received = Number(quantity) || 0;
      }

      pack_size = Number(pack_size) || 1;
      boxes_received = Number(boxes_received) || 0;
      items_received = Number(items_received) || 0;

      if (!product_id) {
        await conn.rollback();
        return res.status(400).json({ error: "product_id is required for each item" });
      }

      const received_pcs = boxes_received * pack_size + items_received;
      if (received_pcs <= 0) {
        await conn.rollback();
        return res.status(400).json({ error: "Each item must receive a positive quantity" });
      }

      // Insert GRN item with new columns
      const [giRes] = await conn.query(
        `INSERT INTO grn_items
           (grn_id, product_id, quantity_received, pack_size, boxes_received, items_received)
         VALUES (?,?,?,?,?,?)`,
        [grn_id, product_id, received_pcs, pack_size, boxes_received, items_received]
      );
      const grn_item_id = giRes.insertId;

      // Create an inventory batch (this is what Issue uses for allocations)
      await conn.query(
        `INSERT INTO inventory_batches
           (product_id, source_type, source_id, pack_size,
            received_pcs, remaining_pcs, received_boxes, received_items)
         VALUES (?,?,?,?,?,?,?,?)`,
        [product_id, 'GRN', grn_item_id, pack_size,
          received_pcs, received_pcs, boxes_received, items_received]
      );

      // Link the batch to grn_items (best-effort; ignore if table/column missing)
      try {
        const [batchRow] = await conn.query(
          `SELECT batch_id
             FROM inventory_batches
            WHERE source_type='GRN' AND source_id=?`,
          [grn_item_id]
        );
        if (batchRow && batchRow[0]) {
          await conn.query(
            `UPDATE grn_items SET batch_id = ? WHERE entry_id = ?`,
            [batchRow[0].batch_id, grn_item_id]
          );
        }
      } catch (_) {
        // ignore if column missing
      }

      // Increment product stock (canonical unit = pieces)
      await conn.query(
        'UPDATE products SET quantity = quantity + ? WHERE product_id = ?',
        [received_pcs, product_id]
      );

      // If product.default_pack_size is null, populate it with first used pack_size
      try {
        await conn.query(
          'UPDATE products SET default_pack_size = COALESCE(default_pack_size, ?) WHERE product_id = ?',
          [pack_size, product_id]
        );
      } catch (_) {
        // ignore if column missing
      }
    }

    await conn.commit();
    res.json({ success: true, grn_id });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Error creating GRN:', err);
    res.status(500).json({ error: err.message || err });
  } finally {
    if (conn) conn.release();
  }
});

// ----------------- GET /api/stocks/grn/list -----------------
router.get('/grn/list', authenticateToken, async (req, res) => {
  try {
    const [grns] = await pool.query(`
      SELECT g.grn_id,
             g.grn_no,
             g.grn_date,
             s.name       AS supplier_name,
             l.lorry_no   AS lorry_number
      FROM grn g
      JOIN suppliers s ON g.supplier_id = s.supplier_id
      JOIN lorries   l ON g.lorry_id = l.lorry_id
      ORDER BY g.grn_date DESC
    `);
    res.json(grns);
  } catch (err) {
    console.error("Error fetching GRN list:", err);
    res.status(500).json({ error: err.message || err });
  }
});

// ----------------- GET /api/stocks/grn/items/:grnId -----------------
router.get('/grn/items/:grnId', authenticateToken, async (req, res) => {
  const grnId = req.params.grnId;
  try {
    const [items] = await pool.query(
      `
      SELECT
        gi.entry_id,
        gi.product_id,
        p.product_code AS product_code,
        p.name AS product_name,
        gi.quantity_received AS pieces_received,
        COALESCE(gi.pack_size, 1) AS pack_size,
        COALESCE(gi.boxes_received, 0) AS boxes_received,
        COALESCE(gi.items_received, gi.quantity_received) AS items_received,
        gi.batch_id
      FROM grn_items gi
      JOIN products p ON gi.product_id = p.product_id
      WHERE gi.grn_id = ?
      `,
      [grnId]
    );
    res.json(items);
  } catch (err) {
    console.error("Error fetching GRN items:", err);
    res.status(500).json({ error: err.message || err });
  }
});

router.get('/grn/filter', authenticateToken, async (req, res) => {
  const { fromDate, toDate, productId, supplierId } = req.query;
  try {
    let query = `
      SELECT DISTINCT g.grn_id,
             g.grn_no,
             g.grn_date,
             g.supplier_id,
             s.name     AS supplier_name,
             l.lorry_no AS lorry_number
      FROM grn g
      JOIN suppliers s ON g.supplier_id = s.supplier_id
      JOIN lorries   l ON g.lorry_id = l.lorry_id
      LEFT JOIN grn_items gi ON g.grn_id = gi.grn_id
      WHERE 1 = 1
    `;
    const params = [];

    if (fromDate) { query += " AND DATE(g.grn_date) >= ?"; params.push(fromDate); }
    if (toDate) { query += " AND DATE(g.grn_date) <= ?"; params.push(toDate); }
    if (supplierId) { query += " AND g.supplier_id = ?"; params.push(supplierId); }
    if (productId) { query += " AND gi.product_id = ?"; params.push(productId); }

    query += " ORDER BY g.grn_date DESC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error filtering GRNs:", err);
    res.status(500).json({ error: err.message || err });
  }
});


// ----------------- GET /api/stocks/lorries/:supplierId -----------------
router.get("/lorries/:supplierId", authenticateToken, async (req, res) => {
  const supplierId = req.params.supplierId;
  try {
    const [rows] = await pool.query(
      `
      SELECT l.lorry_id,
             l.lorry_no
      FROM lorries l
      JOIN supplier_lorries sl ON l.lorry_id = sl.lorry_id
      WHERE sl.supplier_id = ?
      ORDER BY l.lorry_no ASC
      `,
      [supplierId]
    );
    res.json(rows);
  } catch (err) {
    console.error("🔥 Error fetching lorries:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ----------------- GET /api/stocks/products/:supplierId -----------------
router.get('/products/:supplierId', authenticateToken, async (req, res) => {
  const supplierId = req.params.supplierId;
  try {
    const [rows] = await pool.query(
      `SELECT p.product_id,
              p.product_code AS product_code,
              p.name,
              p.default_pack_size
       FROM products p
       WHERE p.supplier_id = ?
       ORDER BY p.name ASC`,
      [supplierId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: err.message || err });
  }
});

/* ===================================================================
 * PACK HISTORY (for GRN pack chips)
 * GET /api/stocks/pack-history/:productId
 *  - Returns recent pack sizes used for that product
 * =================================================================== */
router.get("/pack-history/:productId", authenticateToken, async (req, res) => {
  const productId = Number(req.params.productId) || 0;
  if (!productId) return res.json([]);

  try {
    const [rows] = await pool.query(
      `
      SELECT pack_size,
             COUNT(*)              AS occurrences,
             MAX(created_at)       AS last_used
        FROM inventory_batches
       WHERE product_id = ?
         AND pack_size IS NOT NULL
         AND pack_size > 0
       GROUP BY pack_size
       ORDER BY last_used DESC
       LIMIT 5
      `,
      [productId]
    );

    // front-end only cares about pack_size, but we send extra info too
    res.json(
      rows.map(r => ({
        pack_size: asInt(r.pack_size),
        occurrences: asInt(r.occurrences),
        last_used: r.last_used,
      }))
    );
  } catch (err) {
    console.error("Error fetching pack-history:", err);
    // don't break the page – return empty if anything fails
    res.json([]);
  }
});

// GET /api/stocks/grn/:id  -> header + items for editing
router.get('/grn/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  const conn = await pool.getConnection();
  try {
    const [[head]] = await conn.query(
      `SELECT g.grn_id, g.grn_no, g.grn_date, g.supplier_id, g.lorry_id
         FROM grn g
        WHERE g.grn_id = ?`, [id]
    );
    if (!head) return res.status(404).json({ message: 'GRN not found' });

    const [items] = await conn.query(
      `SELECT gi.entry_id, gi.product_id, p.product_code AS product_code, p.name AS product_name,
              gi.pack_size, gi.boxes_received, gi.items_received, gi.quantity_received
         FROM grn_items gi
         JOIN products p ON p.product_id = gi.product_id
        WHERE gi.grn_id = ?
        ORDER BY gi.entry_id`, [id]
    );

    res.json({ ...head, items });
  } catch (e) {
    console.error('GET /grn/:id failed', e);
    res.status(500).json({ message: 'Failed to load GRN' });
  } finally {
    conn.release();
  }
});


// ----------------- GET /api/stocks/grn-picker -----------------
// Returns rows for the GRN product picker:
// - Existing batch rows: one row per (product_id, pack_size) with remaining_pcs sum
// - New products with no batches: one row with display_pack = COALESCE(default_pack_size, 1), available_qty_pcs = 0
// Columns returned:
//   product_id, product_name, supplier_id, display_pack, available_qty_pcs
router.get("/grn-picker", authenticateToken, async (req, res) => {
  const supplierId = req.query.supplier_id ? Number(req.query.supplier_id) : null;

  try {
    // Ensure products table exists
    await pool.query("PRAGMA table_info(products)");

    // Check if inventory_batches exists
    let batchesExist = true;
    try {
      await pool.query("PRAGMA table_info(inventory_batches)");
    } catch {
      batchesExist = false;
    }

    let rows;
    if (batchesExist) {
      // UNION: (1) existing batches grouped by product+pack  (2) products with no batches -> zero stock row
      const params = [];
      let whereA = "";
      let whereB = "WHERE b2.product_id IS NULL";
      if (supplierId) {
        whereA = "WHERE p.supplier_id = ?";
        whereB += " AND p.supplier_id = ?";
        params.push(supplierId, supplierId);
      }

      const [result] = await pool.query(
        `
        SELECT
          p.product_id,
          p.product_code AS product_code,
          p.name AS product_name,
          p.supplier_id,
          b.pack_size                       AS display_pack,
          COALESCE(SUM(b.remaining_pcs),0)  AS available_qty_pcs
        FROM inventory_batches b
        JOIN products p ON p.product_id = b.product_id
        ${whereA}
        GROUP BY p.product_id, p.product_code, p.name, p.supplier_id, b.pack_size

        UNION ALL

        SELECT
          p.product_id,
          p.product_code AS product_code,
          p.name AS product_name,
          p.supplier_id,
          COALESCE(p.default_pack_size, 1)  AS display_pack,
          0                                 AS available_qty_pcs
        FROM products p
        LEFT JOIN inventory_batches b2 ON b2.product_id = p.product_id
        ${whereB}
        ORDER BY product_name ASC, display_pack ASC
        `,
        params
      );
      rows = result;
    } else {
      // No batches table yet -> every product is zero-stock with default pack or 1
      const params = [];
      let where = "";
      if (supplierId) {
        where = "WHERE p.supplier_id = ?";
        params.push(supplierId);
      }
      const [result] = await pool.query(
        `
        SELECT
          p.product_id,
          p.product_code AS product_code,
          p.name AS product_name,
          p.supplier_id,
          COALESCE(p.default_pack_size, 1) AS display_pack,
          0                                AS available_qty_pcs
        FROM products p
        ${where}
        ORDER BY product_name ASC, display_pack ASC
        `,
        params
      );
      rows = result;
    }

    res.json(rows || []);
  } catch (err) {
    console.error("GET /api/stocks/grn-picker error:", err);
    res.status(500).json({ error: err.message || err });
  }
});


module.exports = router;
