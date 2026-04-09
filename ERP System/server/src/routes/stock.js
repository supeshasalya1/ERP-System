// server/src/routes/stock.js
const express = require('express');
const router = express.Router();

const db = require('../db');
let auth;
try { auth = require('../middleware/authenticateToken'); } catch { auth = (req, res, next) => next(); }

// helper that works with either db.executeQuery or pool.query
const run = async (sql, params = []) => {
  if (typeof db.executeQuery === 'function') return db.executeQuery(sql, params);
  if (typeof db.query === 'function') { const [rows] = await db.query(sql, params); return rows; }
  throw new Error('DB helper missing: executeQuery/query');
};

// --- auto-detect the schema once ---
let detected = null;
async function detect() {
  if (detected) return detected;

  const pcols = await run(`PRAGMA table_info(products)`);
  const pset = new Set(pcols.map(c => c.name));

  // products: id / name / qty
  const prodId = ['product_id', 'id'].find(c => pset.has(c)) || 'id';
  const prodName = ['product_name', 'name', 'title'].find(c => pset.has(c)) || 'name';
  const prodCode = ['product_code', 'code', 'sku'].find(c => pset.has(c)) || 'product_code';
  const prodQty = ['quantity', 'stock_quantity', 'qty', 'available_qty'].find(c => pset.has(c)) || 'quantity';

  // optional FKs on products
  const hasBrandId = pset.has('brand_id');
  const hasSupplierId = pset.has('supplier_id');

  // brands table?
  let brand = null;
  let brandNameSel = `'-'`;
  if (hasBrandId) {
    try {
      const bcols = await run(`PRAGMA table_info(brands)`);
      const bset = new Set(bcols.map(c => c.name));
      const brandId = ['brand_id', 'id'].find(c => bset.has(c)) || 'brand_id';
      const brandName = ['brand_name', 'name', 'title'].find(c => bset.has(c)) || 'brand_name';
      brand = { brandId, brandName };
      brandNameSel = `COALESCE(b.${brandName}, '-')`;
    } catch { /* brands may not exist */ }
  }

  // suppliers table?
  let supplier = null;
  let suppNameSel = `'-'`;
  if (hasSupplierId) {
    try {
      const scols = await run(`PRAGMA table_info(suppliers)`);
      const sset = new Set(scols.map(c => c.name));
      const supplierId = ['supplier_id', 'id'].find(c => sset.has(c)) || 'supplier_id';
      const supplierName = ['name', 'supplier_name', 'title'].find(c => sset.has(c)) || 'name';
      supplier = { supplierId, supplierName };
      suppNameSel = `COALESCE(s.${supplierName}, '-')`;
    } catch { /* suppliers may not exist */ }
  }

  // inventory_batches availability?
  let hasBatches = false;
  try {
    const ibcols = await run(`PRAGMA table_info(inventory_batches)`);
    const ibset = new Set(ibcols.map(c => c.name));
    hasBatches = ibset.has('product_id') && ibset.has('remaining_pcs');
  } catch { /* table not created yet */ }

  detected = {
    prodId, prodName, prodQty,
    hasBrandId, hasSupplierId,
    brand, supplier,
    brandNameSel, suppNameSel,
    hasBatches
  };
  return detected;
}

// GET /api/stock/current
router.get('/current', auth, async (_req, res) => {
  try {
    const s = await detect();

    const joinBrand = s.hasBrandId && s.brand
      ? `LEFT JOIN brands b ON b.${s.brand.brandId} = p.brand_id`
      : ``;

    const joinSupp = s.hasSupplierId && s.supplier
      ? `LEFT JOIN suppliers s ON s.${s.supplier.supplierId} = p.supplier_id`
      : ``;

    // Suggest a display pack: prefer product.default_pack_size else latest batch.pack_size else 1
    const displayPackSQL = `
      COALESCE(
        p.default_pack_size,
        (SELECT ib.pack_size
           FROM inventory_batches ib
          WHERE ib.product_id = p.${s.prodId}
          ORDER BY ib.created_at DESC
          LIMIT 1),
        1
      )
    `;

    // Count how many distinct pack sizes exist right now (non-empty batches)
    const distinctPacksNowSQL = `
      (SELECT COUNT(DISTINCT ib2.pack_size)
         FROM inventory_batches ib2
        WHERE ib2.product_id = p.${s.prodId}
          AND ib2.remaining_pcs > 0)
    `;

    if (s.hasBatches) {
      const rows = await run(
        `
        SELECT
          p.${s.prodId}      AS id,
          p.${s.prodName}    AS product_name,
          p.${s.prodCode}    AS product_code,
          ${s.brandNameSel}  AS brand,
          ${s.suppNameSel}   AS supplier,

          COALESCE(SUM(b.remaining_pcs), 0)                    AS available_qty_pcs,
          ${displayPackSQL}                                    AS display_pack,
          (COALESCE(SUM(b.remaining_pcs), 0) / ${displayPackSQL}) AS boxes_equiv,
          (COALESCE(SUM(b.remaining_pcs), 0) % ${displayPackSQL}) AS items_equiv,
          (${distinctPacksNowSQL} > 1)                         AS mixed_pack

        FROM products p
        LEFT JOIN inventory_batches b ON b.product_id = p.${s.prodId}
        ${joinBrand}
        ${joinSupp}
        GROUP BY
          p.${s.prodId}, p.${s.prodCode}, p.${s.prodName},p brand, supplier
        ORDER BY p.${s.prodName} ASC
        `
      );
      const shaped = (rows || []).map(r => ({
        ...r,
        available_qty: r.available_qty_pcs // preserve old alias
      }));
      return res.json(shaped);
    } else {
      // Fallback: old behavior (no batches yet)
      const rows = await run(
        `
        SELECT
          p.${s.prodId}      AS id,
          p.${s.prodCode}    AS product_code,
          p.${s.prodName}    AS product_name,
          ${s.brandNameSel}  AS brand,
          ${s.suppNameSel}   AS supplier,
          COALESCE(p.${s.prodQty}, 0)                          AS available_qty_pcs,
          ${displayPackSQL}                                    AS display_pack,
          (COALESCE(p.${s.prodQty}, 0) / ${displayPackSQL})  AS boxes_equiv,
          (COALESCE(p.${s.prodQty}, 0) % ${displayPackSQL})  AS items_equiv,
          FALSE                                                AS mixed_pack
        FROM products p
        ${joinBrand}
        ${joinSupp}
        ORDER BY p.${s.prodName} ASC
        `
      );
      const shaped = (rows || []).map(r => ({
        ...r,
        available_qty: r.available_qty_pcs
      }));
      return res.json(shaped);
    }
  } catch (e) {
    console.error('stock/current error:', e);
    res.status(500).json({ error: 'Failed to load current stock' });
  }
});

// OPTIONAL: per-batch breakdown for a product
router.get('/batches/:product_id', auth, async (req, res) => {
  try {
    const s = await detect();
    if (!s.hasBatches) return res.json([]);

    const productId = Number(req.params.product_id);
    if (!Number.isFinite(productId)) return res.status(400).json({ error: 'Invalid product_id' });

    const rows = await run(
      `
      SELECT
        b.batch_id,
        b.pack_size,
        b.remaining_pcs,
        (b.remaining_pcs / b.pack_size) AS boxes_equiv,
        (b.remaining_pcs % b.pack_size) AS items_equiv,
        b.expiry_date,
        b.created_at
      FROM inventory_batches b
      WHERE b.product_id = ?
      ORDER BY COALESCE(b.expiry_date, '9999-12-31'), b.created_at
      `,
      [productId]
    );
    res.json(rows || []);
  } catch (e) {
    console.error('stock/batches error:', e);
    res.status(500).json({ error: 'Failed to load batch breakdown' });
  }
});

module.exports = router;
