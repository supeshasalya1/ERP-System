// server/src/middleware/authenticateToken.js
const jwt = require("jsonwebtoken");

// use env if set; else fall back to 123 (match your login route)
const JWT_SECRET = process.env.JWT_SECRET || "123";

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    // user should look like { user_id, username, role }
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
