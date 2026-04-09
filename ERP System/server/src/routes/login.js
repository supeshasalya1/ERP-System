const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const pool = require("../db");

// Secret key for signing JWTs
const JWT_SECRET = "123"; // move this to .env later

// POST /api/auth/login
router.post("/", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [users] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const sessionToken = crypto.randomUUID
      ? crypto.randomUUID()
      : crypto.randomBytes(32).toString("hex");

    await pool.query(
      "UPDATE users SET session_token = ? WHERE user_id = ?",
      [sessionToken, user.user_id]
    );

    // Create JWT token
    const tokenPayload = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      session_token: sessionToken,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "10h" });

    res.json({
      message: "Login successful",
      token,
      role: user.role,
      username: user.username,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
