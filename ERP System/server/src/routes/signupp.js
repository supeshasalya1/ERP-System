// server/src/routes/signupp.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../db");

// NOTE:
// - Token + adminOnly are applied in app.js:
//   app.use("/api/signup", verifyToken, adminOnly, signupRoute);

// POST /api/signup  (ADMIN ONLY)
router.post("/", async (req, res) => {
  const {
    full_name,
    nic,
    address,
    dob,
    mobile_no,
    username,
    password,
    role,
  } = req.body;

  // Basic validation
  if (!full_name || !username || !password || !role) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    // Check if username already exists
    const [existingUser] = await pool.query(
      "SELECT user_id FROM users WHERE username = ?",
      [username]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Username already exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await pool.query(
      `
      INSERT INTO users (
        full_name,
        nic,
        address,
        dob,
        mobile_no,
        username,
        password,
        role,
        date_added
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'))
      `,
      [full_name, nic, address, dob, mobile_no, username, hashedPassword, role]
    );

    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).json({ message: "Server error.", error: err.message });
  }
});

module.exports = router;
