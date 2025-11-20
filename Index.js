// =============================
// server.js / Index.js
// =============================

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const DatabaseConnection = require("./database/config");
const UserRoutes = require("./Users/routes/routes");

const app = express();

// ==================== MIDDLEWARES ====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// ==================== CORS CONFIG ====================
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://mentoroid-frontend.vercel.app",
      "https://mentoroid-app.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Preflight globally
app.options("/*", cors());

// ==================== TEST ROUTE ====================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mentoroid Auth Service is Running!",
    timestamp: new Date().toISOString(),
    service: "Auth API",
  });
});

// ==================== USER ROUTES ====================
app.use("/api/user", UserRoutes);

// ==================== 404 ROUTE (SAFE FOR NODE v22) ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ==================== GLOBAL ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await DatabaseConnection();
    console.log("MongoDB Connected Successfully!");

    app.listen(PORT, () => {
      console.log(`Auth Service running on http://localhost:${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api/user`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down...");
  process.exit(0);
});

startServer();
