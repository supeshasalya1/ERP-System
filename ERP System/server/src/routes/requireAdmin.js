// server/src/middleware/adminOnly.js
module.exports = function adminOnly(req, res, next) {
  // normalize role to lowercase string just in case
  const role = req.user && req.user.role
    ? String(req.user.role).toLowerCase()
    : null;

  if (!role || role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

  // ✅ user is admin, allow request to continue
  next();
};
