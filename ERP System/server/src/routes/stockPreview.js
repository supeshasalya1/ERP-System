// server/routes/stockPreview.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticateToken = require("./authMiddleware");

// Try a query; if it fails with missing-column, try a fallback
async function tryQueries(queries) {
  for (const q of queries) {
    try {
      const [rows] = await pool.query(q.sql, q.params || []);
      return rows;
    } catch (e) {
      // Only fall back on "unknown column" errors; rethrow others
      if (e?.code !== "ER_BAD_FIELD_ERROR") throw e;
    }
  }
  // If we got here, all variants failed with unknown columns
  throw new Error("No compatible stock preview query for your schema.");
}

/**
 * GET /api/stock/preview
 * Returns up to 8 products with the *lowest* quantity.
 * Works with either:
 *  - products(product_id, product_name, quantity, brand_id, supplier_id) + brands + suppliers
 *  - products(product_id, name, quantity, brand (TEXT), supplier_id) + suppliers
 */
router.get("/preview", authenticateToken, async (_req, res) => {
  try {
    const rows = await tryQueries([
      // Variant A: product_name + brand_id join + suppliers.name
      {
        sql: `
          SELECT
            p.product_id,
            p.product_code,
            p.product_name,
            COALESCE(p.quantity, 0) AS qty,
            b.brand_name,
            s.name AS supplier_name
          FROM products p
          LEFT JOIN brands b    ON b.brand_id = p.brand_id
          LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
          ORDER BY qty ASC
          LIMIT 8
        `,
      },
      // Variant B: name (instead of product_name) + brand as TEXT + suppliers.name
      {
        sql: `
          SELECT
            p.product_id,
            p.product_code,
            p.name AS product_name,
            COALESCE(p.quantity, 0) AS qty,
            p.brand AS brand_name,
            s.name AS supplier_name
          FROM products p
          LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
          ORDER BY qty ASC
          LIMIT 8
        `,
      },
      // Variant C: name + suppliers.supplier_name column (some schemas use this)
      {
        sql: `
          SELECT
            p.product_id,
            p.product_code,
            p.name AS product_name,
            COALESCE(p.quantity, 0) AS qty,
            p.brand AS brand_name,
            s.supplier_name AS supplier_name
          FROM products p
          LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
          ORDER BY qty ASC
          LIMIT 8
        `,
      },
    ]);

    res.json(rows);
  } catch (e) {
    console.error("stock/preview error (final):", e);
    res.status(500).json({ error: "Failed to load stock preview" });
  }
});

module.exports = router;

