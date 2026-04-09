// server/src/routes/metrics.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticateToken = require("./authMiddleware");

/** small helper for trying multiple SQL variants until one works */
async function tryQueries(variants, params = []) {
  for (const sql of variants) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (e) {
      if (e?.code !== "ER_BAD_FIELD_ERROR") throw e; // real error
      // else, try next variant
    }
  }
  throw new Error("No compatible query variant for this schema");
}

/** fill missing dates in last N days with 0 */
function normalizeDailyCounts(rows, days) {
  const map = new Map(rows.map(r => [String(r.d), Number(r.cnt)]));
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: map.get(key) ?? 0 });
  }
  return out;
}

/**
 * GET /api/metrics/grns?days=14
 * returns [{date: 'YYYY-MM-DD', count: n}, ...]
 */
router.get("/grns", authenticateToken, async (req, res) => {
  const days = Math.max(1, Math.min(90, Number(req.query.days) || 14));

  try {
    // Try common column names for GRN date
    const rows = await tryQueries(
      [
        // Variant A: grn_date column
        `
          SELECT DATE(g.grn_date)   AS d, COUNT(*) AS cnt
          FROM grn g
          WHERE g.grn_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY DATE(g.grn_date)
          ORDER BY d ASC
        `,
        // Variant B: date_created column
        `
          SELECT DATE(g.date_created) AS d, COUNT(*) AS cnt
          FROM grn g
          WHERE g.date_created >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY DATE(g.date_created)
          ORDER BY d ASC
        `,
        // Variant C: created_at column
        `
          SELECT DATE(g.created_at) AS d, COUNT(*) AS cnt
          FROM grn g
          WHERE g.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY DATE(g.created_at)
          ORDER BY d ASC
        `,
      ],
      [days]
    );

    return res.json(normalizeDailyCounts(rows, days));
  } catch (e) {
    console.error("metrics/grns error:", e);
    return res.status(500).json({ error: "Failed to compute GRN metrics" });
  }
});

/**
 * GET /api/metrics/issues?days=14
 * returns [{date: 'YYYY-MM-DD', count: n}, ...]
 */
router.get("/issues", authenticateToken, async (req, res) => {
  const days = Math.max(1, Math.min(90, Number(req.query.days) || 14));

  try {
    // Try common date columns on issue_note
    const rows = await tryQueries(
      [
        // A: date_created
        `
          SELECT DATE(n.date_created) AS d, COUNT(*) AS cnt
          FROM issue_note n
          WHERE n.date_created >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY DATE(n.date_created)
          ORDER BY d ASC
        `,
        // B: created_at
        `
          SELECT DATE(n.created_at) AS d, COUNT(*) AS cnt
          FROM issue_note n
          WHERE n.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY DATE(n.created_at)
          ORDER BY d ASC
        `,
        // C: issue_date
        `
          SELECT DATE(n.issue_date) AS d, COUNT(*) AS cnt
          FROM issue_note n
          WHERE n.issue_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          GROUP BY DATE(n.issue_date)
          ORDER BY d ASC
        `,
      ],
      [days]
    );

    return res.json(normalizeDailyCounts(rows, days));
  } catch (e) {
    console.error("metrics/issues error:", e);
    return res.status(500).json({ error: "Failed to compute Issue metrics" });
  }
});

module.exports = router;
