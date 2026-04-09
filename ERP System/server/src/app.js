// -------------------- MODULE IMPORTS --------------------
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8000;
const host = process.env.HOST || "127.0.0.1"

// -------------------- MIDDLEWARE SETUP --------------------
app.use(cors({
  origin: "http://localhost:3000", // frontend URL
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: "supersecretkey", // change in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour
      httpOnly: true,
    },
  })
);

// -------------------- URL SANITIZER --------------------
app.use((req, res, next) => {
  // Remove accidental spaces, tabs, or newlines from the request URL
  req.url = req.url.trim();
  next();
});


// -------------------- ROUTE IMPORTS --------------------
console.log("🧩 Loading route modules...");
const loginRoute = require("./routes/login");
const supplierRoutes = require("./routes/supplier");
const issueRoutes = require("./routes/issue");

const productRoutes = require("./routes/products");
const stocksRoutes = require("./routes/stocks");
const signupRoute = require("./routes/signupp");
//const stockPreviewRoute = require("./routes/stockPreview");
const metricsRoute = require("./routes/metrics");
const expiredRoutes = require("./routes/expire"); // 👈 add this
const adjustmentsRouter = require("./routes/adjustments");
const verifyToken = require("./routes/authMiddleware");
const dashboardRoute = require("./routes/dashboard");
const stockViewRoute = require("./routes/stockview");
const binCardRoutes = require("./routes/bincard");
const issueLorriesRouter = require("./routes/issueLorries");

const changePasswordUserRoute = require("./routes/changePasswordUser");
const changePasswordAdminRoute = require("./routes/changePasswordAdmin");

const unloadRoutes = require("./routes/unload");
//const authenticateToken = require("./middleware/authenticateToken");
const adminOnly = require("./routes/requireAdmin");
const adminRoutes = require("./routes/admin");


// -------------------- ROUTE SETUP --------------------
console.log("⚙️  Mounting routes...");

// ✅ Public routes (no token required)
app.use("/api/login", loginRoute);
//app.use("/api/auth", authRoute);

// ✅ Protected routes (token required)
//app.use("/api/categories", verifyToken, categoriesRoute);
app.use("/api/suppliers", verifyToken, supplierRoutes);
app.use("/api/stocks", verifyToken, stocksRoutes);
app.use("/api/issue", verifyToken, issueRoutes);
console.log("🔗 Mounting /api/products route...");
app.use("/api/products", verifyToken, productRoutes);
//app.use("/api/stock", stockPreviewRoute);
//app.use("/api/grn", grnRoute);
app.use("/api/metrics", verifyToken, metricsRoute);
//app.use('/api/stock', require('./routes/stock'));
//app.use("/api/signup", verifyToken, signupRoute);
app.use("/api/adjustments", verifyToken, adjustmentsRouter);
app.use("/api/dashboard", verifyToken, dashboardRoute);
app.use("/api/inventory", verifyToken, stockViewRoute);
app.use("/api/admin", verifyToken, adminOnly, adminRoutes);
app.use("/api/signup", verifyToken, adminOnly, signupRoute);
app.use("/api/expire", verifyToken, expiredRoutes); // 👈 add this
app.use("/api/bincard", verifyToken, binCardRoutes);
app.use("/api/issue-lorries", verifyToken, issueLorriesRouter);
app.use("/api/password", verifyToken, changePasswordUserRoute);
app.use("/api/admin/password", verifyToken, adminOnly, changePasswordAdminRoute);

app.use("/api/unload", unloadRoutes);
// -------------------- TEST ROUTES --------------------
app.get("/", (req, res) => {
  res.json({ message: "Server running. Use /api/... routes" });
});




app.get("/api/profile", verifyToken, (req, res) => {
  res.json({
    message: "User authenticated",
    user: req.user, // contains id, email, role
  });
});

app.get("/api/admin", verifyToken, (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Access denied" });
  }
  res.json({ message: "Welcome Admin!", user: req.user });
});

// -------------------- ERROR HANDLER --------------------
app.use((req, res) => {
  console.warn("⚠️ Invalid route accessed:", req.originalUrl);
  res.status(404).json({ message: "Invalid route" });
});

// -------------------- SERVER START --------------------
app.listen(port, host, (err) => {
  if (err) return console.error("❌ Server startup failed:", err);
  console.log(`✅ Server running at http://${host}:${port}/`);
});
