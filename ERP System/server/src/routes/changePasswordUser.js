const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

const validateNewPassword = (password) => {
  if (!password || typeof password !== "string") {
    return "New password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (!hasLetter || !hasNumber) {
    return "Password must include both letters and numbers.";
  }

  return null;
};

router.post("/", async (req, res) => {
  try {
    const authUserId = req.user && req.user.user_id;
    if (!authUserId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All password fields are required." });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password and confirmation do not match." });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from the current password." });
    }

    const passwordValidationError = validateNewPassword(newPassword);
    if (passwordValidationError) {
      return res.status(400).json({ message: passwordValidationError });
    }

    const [rows] = await pool.query("SELECT user_id, password FROM users WHERE user_id = ?", [authUserId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const existingUser = rows[0];
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existingUser.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query(
      "UPDATE users SET password = ?, session_token = NULL WHERE user_id = ?",
      [hashedPassword, authUserId]
    );

    if (req.session) {
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.warn("Failed to destroy session after password change:", sessionErr);
        }
      });
    }
    res.clearCookie("connect.sid");

    return res.json({
      message: "Password updated successfully. Please log in again.",
      logout: true,
    });
  } catch (error) {
    console.error("User change password error:", error);
    return res.status(500).json({ message: "Failed to update password." });
  }
});

module.exports = router;
