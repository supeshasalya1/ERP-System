const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = "123"; // Must match the secret in login.js

async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.log("JWT verification error:", err.message);
    return res.status(403).json({ message: "Invalid or expired token" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT session_token FROM users WHERE user_id = ?",
      [decoded.user_id]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: "Account not found." });
    }

    const activeSessionToken = rows[0].session_token;
    if (!activeSessionToken || activeSessionToken !== decoded.session_token) {
      return res.status(401).json({ message: "Session invalidated. Please log in again." });
    }

    req.user = decoded; // attaches { user_id, username, role, session_token }
    next();
  } catch (dbError) {
    console.error("Authentication lookup failed:", dbError);
    return res.status(500).json({ message: "Authentication failed." });
  }
}

module.exports = authenticateToken;
