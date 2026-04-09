// dashboard.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("./authMiddleware"); // adjust path if needed

router.get("/", authenticateToken, (req, res) => {
  const user = req.user;
  res.json({
    message: `Welcome to your dashboard, ${user.username}!`,
    user,
  });
});

// Get logged-in user info

module.exports = router;
