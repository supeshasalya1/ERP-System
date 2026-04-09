const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require("./authMiddleware");

// ----------------- GET /list -----------------
router.get('/list', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT 
        p.product_id,
        p.product_code,
        p.name AS product_name,
        b.brand_name,
        s.name AS supplier_name,
        s.supplier_id AS supplier_id,
        p.quantity AS quantity

      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
      ORDER BY p.product_id DESC
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message || err });
  }
});

// ----------------- POST /add -----------------
router.post('/add', async (req, res) => {
  const { product_code, name, brand, supplier_id } = req.body;
  if (!product_code || !name || !brand || !supplier_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Find or insert brand
    const [brandRows] = await conn.query(
      'SELECT brand_id FROM brands WHERE brand_name = ?',
      [brand]
    );
    let brandId;
    if (brandRows.length === 0) {
      const [insertBrand] = await conn.query(
        'INSERT INTO brands (brand_name) VALUES (?)',
        [brand]
      );
      brandId = insertBrand.insertId;
    } else {
      brandId = brandRows[0].brand_id;
    }

    // Insert product
    const [productResult] = await conn.query(
      'INSERT INTO products (product_code,name, brand_id, supplier_id) VALUES (?, ?, ?,?)',
      [product_code, name, brandId, supplier_id]
    );

    await conn.commit();
    res.status(201).json({
      success: true,
      product_id: productResult.insertId
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Error adding product:', err);
    res.status(500).json({ error: err.message || err });
  } finally {
    if (conn) conn.release();
  }
});

// ----------------- PUT /update/:id -----------------
router.put('/update/:id', async (req, res) => {
  const productId = req.params.id;
  const { product_code, name, brand, supplier_id } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Find or insert brand
    let brandId = null;
    if (brand) {
      const [brandRows] = await conn.query(
        'SELECT brand_id FROM brands WHERE brand_name = ?',
        [brand]
      );
      if (brandRows.length === 0) {
        const [insertBrand] = await conn.query(
          'INSERT INTO brands (brand_name) VALUES (?)',
          [brand]
        );
        brandId = insertBrand.insertId;
      } else {
        brandId = brandRows[0].brand_id;
      }
    }

    const [updateResult] = await conn.query(
      `UPDATE products
       SET 
            product_code = COALESCE(?, product_code),
            name = COALESCE(?, name),
           brand_id = COALESCE(?, brand_id),
           supplier_id = COALESCE(?, supplier_id)
       WHERE product_id = ?`,
      [product_code, name, brandId, supplier_id, productId]
    );

    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await conn.commit();
    res.json({ success: true, message: "Product updated successfully" });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message || err });
  } finally {
    if (conn) conn.release();
  }
});

// ----------------- DELETE /delete/:id -----------------
router.delete('/delete/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM products WHERE product_id = ?', [productId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message || err });
  }
});

// ----------------- GET suppliers list -----------------
router.get('/suppliers/list', async (req, res) => {
  try {
    const [suppliers] = await pool.query("SELECT supplier_id, name FROM suppliers ORDER BY name");
    res.json(suppliers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
});

// ----------------- GET brands by supplier -----------------
router.get('/brands/by-supplier/:supplierId', async (req, res) => {
  const supplierId = req.params.supplierId;
  try {
    const [brands] = await pool.query(`
      SELECT b.brand_id, b.brand_name
      FROM brands b
      JOIN supplier_brands sb ON b.brand_id = sb.brand_id
      WHERE sb.supplier_id = ?
      ORDER BY b.brand_name
    `, [supplierId]);
    res.json(brands);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || err });
  }
});


// ======= NEW: GET /api/products/with-stock[?supplier_id=] =======
const run = async (sql, params = []) => {
  if (typeof db.executeQuery === 'function') return db.executeQuery(sql, params);
  if (typeof db.query === 'function') { const [rows] = await db.query(sql, params); return rows; }
  throw new Error('DB helper missing');
};

router.get('/with-stock', authenticateToken, async (req, res) => {
  try {
    const supplierId = req.query.supplier_id ? Number(req.query.supplier_id) : null;

    // detect batches table
    let hasBatches = false;
    try { await run(`PRAGMA table_info(inventory_batches)`); hasBatches = true; } catch { }

    const supplierFilter = supplierId ? `WHERE p.supplier_id = ?` : ``;
    const params = supplierId ? [supplierId] : [];

    const displayPackSQL = `
      COALESCE(
        p.default_pack_size,
        (SELECT ib.pack_size
           FROM inventory_batches ib
          WHERE ib.product_id = p.product_id
          ORDER BY ib.created_at DESC
          LIMIT 1),
        1
      )
    `;
    const distinctPacksNowSQL = `
      (SELECT COUNT(DISTINCT ib2.pack_size)
         FROM inventory_batches ib2
        WHERE ib2.product_id = p.product_id
          AND ib2.remaining_pcs > 0)
    `;

    let rows;
    if (hasBatches) {
      rows = await run(
        `
        SELECT
          p.product_id,
          p.product_code AS product_code,
          p.name AS product_name,
          ${displayPackSQL} AS display_pack,
          COALESCE(SUM(b.remaining_pcs),0) AS available_qty_pcs,
          (COALESCE(SUM(b.remaining_pcs),0) / ${displayPackSQL}) AS boxes_equiv,
          (COALESCE(SUM(b.remaining_pcs),0) % ${displayPackSQL}) AS items_equiv,
          (${distinctPacksNowSQL} > 1) AS mixed_pack
        FROM products p
        LEFT JOIN inventory_batches b ON b.product_id = p.product_id
        ${supplierFilter}
        GROUP BY p.product_id, p.product_code, p.name
        ORDER BY p.name ASC
        `,
        params
      );
    } else {
      rows = await run(
        `
        SELECT
          p.product_id,
          p.product_code AS product_code,
          p.name AS product_name,
          ${displayPackSQL} AS display_pack,
          COALESCE(p.quantity,0) AS available_qty_pcs,
          (COALESCE(p.quantity,0) / ${displayPackSQL}) AS boxes_equiv,
          (COALESCE(p.quantity,0) % ${displayPackSQL}) AS items_equiv,
          FALSE AS mixed_pack
        FROM products p
        ${supplierFilter}
        ORDER BY p.name ASC
        `,
        params
      );
    }
    res.json(rows || []);
  } catch (err) {
    console.error('products/with-stock error:', err);
    res.status(500).json({ error: 'Failed to load products with stock' });
  }
});


// GET /api/products/:productId/packs
router.get('/:productId/packs', authenticateToken, async (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isFinite(productId)) {
    return res.status(400).json({ error: 'Invalid productId' });
  }

  try {
    // Try inventory_batches first, union with product.default_pack_size
    const [rows] = await pool.query(
      `
      SELECT DISTINCT pack_size
      FROM inventory_batches
      WHERE product_id = ? AND pack_size IS NOT NULL
      UNION
      SELECT default_pack_size AS pack_size
      FROM products
      WHERE product_id = ? AND default_pack_size IS NOT NULL
      ORDER BY pack_size
      `,
      [productId, productId]
    );

    // Normalize and filter > 0
    const sizes = (rows || [])
      .map(r => Number(r.pack_size))
      .filter(n => Number.isFinite(n) && n > 0);

    // If nothing found, fall back to [1] so UI still works
    res.json(sizes.length ? sizes : [1]);
  } catch (e) {
    console.error('GET /api/products/:productId/packs error:', e);
    // Soft fallback so the UI still works
    res.json([1]);
  }
});


module.exports = router;
