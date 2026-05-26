require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const passport = require("passport");
require("./config/passport");

const uploadRoutes = require("./routes/upload");
const analyzeRoutes = require("./routes/analyze");
const fileRoutes = require("./routes/files");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection
const mongoose = require("mongoose");
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/datalens";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("✓ MongoDB Connected Successfully"))
  .catch(err => console.error("✗ MongoDB Connection Error:", err));

// Ensure uploads directory exists at startup
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: "Too many analysis requests, please slow down." },
});
app.use("/api/analyze", analyzeLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/analyze", analyzeRoutes);
app.use("/api/files", fileRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Root route
app.get("/", (req, res) => {
  res.send("DataLens AI Backend API is running.");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 DataLens AI Backend running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `   Gemini API:    ${process.env.GEMINI_API_KEY ? "✓ configured" : "✗ MISSING — add GEMINI_API_KEY to backend/.env"}\n`
  );
});

module.exports = app;
// Triggering nodemon restart 2
