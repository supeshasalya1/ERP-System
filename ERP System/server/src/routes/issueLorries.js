// server/src/routes/issueLorries.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const authenticateToken = require("./authMiddleware");

// GET /api/issue-lorries/list  -> for dropdowns etc.
router.get("/list", authenticateToken, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT
          lorry_id,
          lorry_name,
          lorry_no
        FROM issue_lorries
        ORDER BY lorry_name ASC, lorry_no ASC
      `
    );

    res.json(rows || []);
  } catch (e) {
    console.error("GET /api/issue-lorries/list error:", e);
    res.status(500).json({ message: "Failed to load issue lorries." });
  }
});

// POST /api/issue-lorries/add  -> user can add a new lorry
router.post("/add", authenticateToken, async (req, res) => {
  const { lorry_name, lorry_no } = req.body || {};

  if (!lorry_name || !lorry_no) {
    return res.status(400).json({ message: "lorry_name and lorry_no are required." });
  }

  try {
    const [result] = await pool.query(
      `
        INSERT INTO issue_lorries (lorry_name, lorry_no)
        VALUES (?, ?)
      `,
      [lorry_name, lorry_no]
    );

    res.status(201).json({
      lorry_id: result.insertId,
      lorry_name,
      lorry_no,
    });
  } catch (e) {
    console.error("POST /api/issue-lorries/add error:", e);
    res.status(500).json({ message: "Failed to create issue lorry." });
  }
});

module.exports = router;
