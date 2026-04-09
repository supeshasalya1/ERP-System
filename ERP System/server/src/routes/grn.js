// server/src/routes/grn.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ---------------------------------------------------------------------
// Small helper that works with either db.executeQuery(...) or pool.query
// ---------------------------------------------------------------------
const run = async (sql, params = []) => {
  if (typeof db.executeQuery === 'function') return db.executeQuery(sql, params);
  if (typeof db.query === 'function') { const [rows] = await db.query(sql, params); return rows; }
  throw new Error('DB helper missing: executeQuery/query');
};

// Health check
router.get('/_test', (req, res) => res.json({ ok: true }));

// ---------------------------------------------------------------------
//                      Schema autodetection (once)
// ---------------------------------------------------------------------
let schema = null;

async function detectSchema() {
  if (schema) return schema;

  // grn_items columns
  const giCols = await run(`PRAGMA table_info(grn_items)`);
  const gi = new Set(giCols.map(c => c.name));

  const itemIdCol = ['entry_id', 'item_id', 'id', 'grn_item_id', 'gm_item_id']
    .find(c => gi.has(c)) || null;

  const giProductId = ['product_id', 'pid', 'productId']
    .find(c => gi.has(c)) || null;

  const giQtyCol = ['quantity_received', 'quantity', 'qty']
    .find(c => gi.has(c)) || null;

  const giHasUnitCost = gi.has('unit_cost');
  const giHasExpiry = gi.has('expiry_date');

  if (!itemIdCol) throw new Error('grn_items: could not find item id (entry_id/item_id/id/...)');
  if (!giProductId) throw new Error('grn_items: could not find product id (product_id/pid/...)');
  if (!giQtyCol) throw new Error('grn_items: could not find qty column (quantity_received/quantity/qty)');

  // products columns
  const pCols = await run(`PRAGMA table_info(products)`);
  const p = new Set(pCols.map(c => c.name));

  const prodIdCol = ['product_id', 'id'].find(c => p.has(c)) || null;
  const prodQtyCol = ['quantity', 'stock_quantity', 'qty'].find(c => p.has(c)) || null;
  const prodNameCol = ['product_name', 'name'].find(c => p.has(c)) || null;

  if (!prodIdCol) throw new Error('products: could not find id (product_id/id)');
  if (!prodQtyCol) throw new Error('products: could not find qty (quantity/stock_quantity/qty)');
  if (!prodNameCol) throw new Error('products: could not find name (product_name/name)');

  schema = {
    // grn_items
    itemIdCol, giProductId, giQtyCol, giHasUnitCost, giHasExpiry,
    // products
    prodIdCol, prodQtyCol, prodNameCol
  };
  return schema;
}

// ---------------------------------------------------------------------
//                           GRN LIST (header)
// ---------------------------------------------------------------------
// GET /api/grn/list?search=&limit=50
router.get('/list', async (req, res) => {
  try {
    //const limit = Math.min(Number(req.query.limit) || 50, 200);
    const search = (req.query.search || '').trim();
    const params = [];
    let where = '';

    if (search) {
      where = `WHERE g.grn_no LIKE ? OR s.name LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const rows = await run(
      `
      SELECT 
        g.grn_id,
        g.grn_no,
        g.grn_date,
        s.name AS supplier_name,
        EXISTS (SELECT 1 FROM grn_item_audit a WHERE a.grn_id = g.grn_id) AS edited
      FROM grn g
      LEFT JOIN suppliers s ON s.supplier_id = g.supplier_id
      ${where}
      ORDER BY g.grn_id DESC
      LIMIT 100000
      `,
      [...params]
    );

    res.json(rows || []);
  } catch (e) {
    console.error('GRN list error:', e);
    res.status(500).json({ error: e.message || 'Failed to load GRNs' });
  }
});

// ---------------------------------------------------------------------
//                       GRN DETAIL (header + items)
// ---------------------------------------------------------------------
// GET /api/grn/:grn_id
router.get('/:grn_id', async (req, res) => {
  const grnId = Number(req.params.grn_id);
  if (!grnId || Number.isNaN(grnId)) {
    return res.status(400).json({ error: 'Invalid grn_id' });
  }

  try {
    const s = await detectSchema();

    const header = await run(
      `
      SELECT 
        g.grn_id, g.grn_no, g.grn_date,
        s.name AS supplier_name
      FROM grn g
      LEFT JOIN suppliers s ON s.supplier_id = g.supplier_id
      WHERE g.grn_id = ?
      `,
      [grnId]
    );
    if (!header || header.length === 0) {
      return res.status(404).json({ error: 'GRN not found' });
    }

    const extraCost = s.giHasUnitCost ? ', gi.unit_cost' : ', NULL AS unit_cost';
    const extraExp = s.giHasExpiry ? ', gi.expiry_date' : ', NULL AS expiry_date';

    const items = await run(
      `
      SELECT
        gi.${s.itemIdCol}   AS item_id,
        gi.${s.giProductId} AS product_id,
        p.${s.prodNameCol}  AS product_name,
        gi.${s.giQtyCol}    AS grn_qty
        ${extraCost}
        ${extraExp}
      FROM grn_items gi
      JOIN products p ON p.${s.prodIdCol} = gi.${s.giProductId}
      WHERE gi.grn_id = ?
      ORDER BY gi.${s.itemIdCol} ASC
      `,
      [grnId]
    );

    res.json({ header: header[0], items: items || [] });
  } catch (e) {
    console.error('GRN get error:', e);
    res.status(500).json({ error: e.message || 'Failed to load GRN' });
  }
});

// ---------------------------------------------------------------------
//                     EDIT ONE LINE (re-stock + audit)
// ---------------------------------------------------------------------
// PATCH /api/grn/items/:item_id  body: { new_quantity: number }
router.patch('/items/:item_id', async (req, res) => {
  const itemId = Number(req.params.item_id);
  const { new_quantity } = req.body;

  if (!itemId || Number.isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid item_id' });
  }
  if (new_quantity === undefined || Number(new_quantity) < 0) {
    return res.status(400).json({ error: 'new_quantity must be >= 0' });
  }

  // fallback if you haven't wired auth yet
  const editedBy = (req.user && (req.user.user_id || req.user.id)) || 1;

  try {
    const s = await detectSchema();
    if (typeof db.beginTransaction === 'function') await db.beginTransaction();

    // 1) lock item + current product stock
    const rows = await run(
      `
      SELECT
        gi.grn_id,
        gi.${s.giProductId} AS product_id,
        gi.${s.giQtyCol}    AS old_qty,
        p.${s.prodQtyCol}   AS prod_qty
      FROM grn_items gi
      JOIN products p ON p.${s.prodIdCol} = gi.${s.giProductId}
      WHERE gi.${s.itemIdCol} = ?
      FOR UPDATE
      `,
      [itemId]
    );
    if (!rows || rows.length === 0) {
      if (typeof db.rollback === 'function') await db.rollback();
      return res.status(404).json({ error: 'GRN item not found' });
    }

    const { grn_id, product_id, old_qty, prod_qty } = rows[0];
    const newQty = Number(new_quantity);
    const delta = newQty - Number(old_qty);

    // 2) guard against negative stock
    if (delta < 0 && Number(prod_qty) + delta < 0) {
      if (typeof db.rollback === 'function') await db.rollback();
      return res.status(400).json({
        error: `Insufficient stock. Current product qty=${prod_qty}, cannot reduce by ${Math.abs(delta)}`
      });
    }

    // 3) update product stock (only the existing quantity column)
    await run(
      `UPDATE products SET ${s.prodQtyCol} = ${s.prodQtyCol} + ? WHERE ${s.prodIdCol} = ?`,
      [delta, product_id]
    );

    // 4) update grn_items quantity
    await run(
      `UPDATE grn_items SET ${s.giQtyCol} = ? WHERE ${s.itemIdCol} = ?`,
      [newQty, itemId]
    );

    // 5) audit (table must exist)
    await run(
      `
      INSERT INTO grn_item_audit
        (grn_id, item_id, product_id, old_qty, new_qty, edited_by)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [grn_id, itemId, product_id, old_qty, newQty, editedBy]
    );

    if (typeof db.commit === 'function') await db.commit();

    res.json({ grn_id, item_id: itemId, product_id, old_qty: Number(old_qty), new_qty: newQty, delta });
  } catch (e) {
    try { if (typeof db.rollback === 'function') await db.rollback(); } catch { }
    console.error('GRN edit error:', e);
    res.status(500).json({ error: e.message || 'Failed to edit GRN item' });
  }
});

module.exports = router;


