// server/src/routes/inventory.js
const express = require("express");
const router = express.Router();
const pool = require("../db");

const run = async (sql, params = []) => {
  if (typeof pool.executeQuery === "function") return pool.executeQuery(sql, params);
  const [rows] = await pool.query(sql, params);
  return rows;
};

// GET /api/inventory/stock-by-pack
// One row per (product_id, pack_size) with positive stock.
// Columns: product_id, product_name, pack_size, available_qty_pcs
/*router.get("/stock-by-pack", async (req, res) => {
  try {
    // If table doesn't exist, return []
    try {
      await run("SHOW COLUMNS FROM inventory_batches");
    } catch {
      return res.json([]);
    }

    const rows = await run(
      `
      SELECT
        p.product_id AS product_id,
        p.name       AS product_name,
        b.pack_size  AS pack_size,
        COALESCE(SUM(b.available_qty_pcs), 0) AS available_qty_pcs
      FROM inventory_batches b
      JOIN products p ON p.product_id = b.product_id
      GROUP BY p.product_id, p.name, b.pack_size
      HAVING COALESCE(SUM(b.available_qty_pcs), 0) > 0
      ORDER BY p.name ASC, b.pack_size ASC
      `
    );

    res.json(rows || []);
  } catch (err) {
    console.error("GET /api/inventory/stock-by-pack error:", err);
    res.status(500).json({ error: err.message });
  }
});*/

// GET /api/inventory/stock-summary
// Groups pack variants per product; no packsize=1 fallback.
/*router.get("/stock-summary", async (req, res) => {
  try {
    try {
      await run("SHOW COLUMNS FROM inventory_batches");
    } catch {
      return res.json([]);
    }

    const rows = await run(
      `
      SELECT
        p.product_id AS product_id,
        p.name       AS product_name,
        b.pack_size  AS pack_size,
        COALESCE(SUM(b.available_qty_pcs), 0) AS available_qty_pcs
      FROM inventory_batches b
      JOIN products p ON p.product_id = b.product_id
      GROUP BY p.product_id, p.name, b.pack_size
      HAVING COALESCE(SUM(b.available_qty_pcs), 0) > 0
      ORDER BY p.name ASC, b.pack_size ASC
      `
    );

    const map = new Map();
    for (const r of rows) {
      const k = String(r.product_id);
      if (!map.has(k)) {
        map.set(k, {
          product_id: r.product_id,
          product_name: r.product_name,
          total_pcs: 0,
          packs: [],
        });
      }
      const e = map.get(k);
      e.total_pcs += Number(r.available_qty_pcs || 0);
      e.packs.push({
        pack_size: Number(r.pack_size),
        available_qty_pcs: Number(r.available_qty_pcs || 0),
      });
    }

    res.json(Array.from(map.values()));
  } catch (err) {
    console.error("GET /api/inventory/stock-summary error:", err);
    res.status(500).json({ error: err.message });
  }
});*/

// GET /api/inventory/stock-by-pack
router.get("/stock-by-pack", async (req, res) => {
  try {
    // Ensure table exists
    try {
      await run("PRAGMA table_info(inventory_batches)");
    } catch {
      return res.json([]);
    }

    const supplierId = req.query.supplier_id ? Number(req.query.supplier_id) : null;
    const productId = req.query.product_id ? Number(req.query.product_id) : null;

    const params = [];
    let where = "WHERE 1 = 1";

    if (supplierId) {
      where += " AND p.supplier_id = ?";
      params.push(supplierId);
    }

    if (productId) {
      where += " AND p.product_id = ?";
      params.push(productId);
    }

    const rows = await run(
      `
      SELECT
        p.product_id    AS product_id,
        p.product_code  AS product_code,
        p.name          AS product_name,
        b.pack_size     AS pack_size,
        COALESCE(SUM(b.remaining_pcs), 0) AS available_qty_pcs
      FROM inventory_batches b
      JOIN products p ON p.product_id = b.product_id
      ${where}
      GROUP BY p.product_id, p.product_code, p.name, b.pack_size
      HAVING COALESCE(SUM(b.remaining_pcs), 0) > 0
      ORDER BY p.product_code ASC, p.name ASC, b.pack_size ASC
      `,
      params
    );

    res.json(rows || []);
  } catch (err) {
    console.error("GET /api/inventory/stock-by-pack error:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET /api/inventory/stock-summary
router.get("/stock-summary", async (req, res) => {
  try {
    try {
      await run("PRAGMA table_info(inventory_batches)");
    } catch {
      return res.json([]);
    }

    const supplierId = req.query.supplier_id ? Number(req.query.supplier_id) : null;
    const productId = req.query.product_id ? Number(req.query.product_id) : null;

    const params = [];
    let where = "WHERE 1 = 1";

    if (supplierId) {
      where += " AND p.supplier_id = ?";
      params.push(supplierId);
    }

    if (productId) {
      where += " AND p.product_id = ?";
      params.push(productId);
    }

    const rows = await run(
      `
      SELECT
        p.product_id    AS product_id,
        p.product_code  AS product_code,
        p.name          AS product_name,
        b.pack_size     AS pack_size,
        COALESCE(SUM(b.remaining_pcs), 0) AS available_qty_pcs
      FROM inventory_batches b
      JOIN products p ON p.product_id = b.product_id
      ${where}
      GROUP BY p.product_id, p.product_code, p.name, b.pack_size
      HAVING COALESCE(SUM(b.remaining_pcs), 0) > 0
      ORDER BY p.product_code ASC, p.name ASC, b.pack_size ASC
      `,
      params
    );

    const map = new Map();
    for (const r of rows) {
      const k = String(r.product_id);
      if (!map.has(k)) {
        map.set(k, {
          product_id: r.product_id,
          product_code: r.product_code,
          product_name: r.product_name,
          total_pcs: 0,
          packs: [],
        });
      }
      const e = map.get(k);
      e.total_pcs += Number(r.available_qty_pcs || 0);
      e.packs.push({
        pack_size: Number(r.pack_size),
        available_qty_pcs: Number(r.available_qty_pcs || 0),
      });
    }

    res.json(Array.from(map.values()));
  } catch (err) {
    console.error("GET /api/inventory/stock-summary error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/products
// For stock view dropdown: product_id, product_code, product_name
router.get("/products", async (req, res) => {
  try {
    const rows = await run(
      `
      SELECT
        p.product_id,
        p.product_code,
        p.name AS product_name
      FROM products p
      ORDER BY p.product_code ASC, p.name ASC
      `
    );
    res.json(rows || []);
  } catch (err) {
    console.error("GET /api/inventory/products error:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
