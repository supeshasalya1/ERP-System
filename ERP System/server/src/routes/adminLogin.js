const express = require("express");
const router = express.Router();
const pool = require("../db"); // ✅ connect to database

// ADMIN LOGIN
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log("🔍 Incoming login:", username, password);

  try {
    const [rows] = await pool.query(
      "SELECT * FROM admins WHERE username = ? AND password = ?",
      [username, password]
    );

    console.log("🧾 Query result:", rows);

    if (rows.length > 0) {
      return res.status(200).json({
        success: true,
        role: "admin",
        message: "Login successful",
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;





