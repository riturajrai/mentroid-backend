// server.js or app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const DatabaseConnection = require("./database/config");
const UserRoutes = require("./Users/routes/routes"); // Yeh tumhara auth routes hoga

const app = express();

// ==================== MIDDLEWARES ====================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser rakh sakte ho (harmless), future mein use ho sakta hai
app.use(cookieParser());

// ==================== CORS CONFIG (PERFECT FOR BEARER TOKEN) ====================
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://mentoroid-frontend.vercel.app",
      "https://mentoroid-app.vercel.app",
      // Add more origins if needed
    ],
    credentials: true, // Important if cookies ever used (safe to keep)
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",        // Critical for Bearer Token
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Optional: Handle preflight requests globally
app.options("*", cors());

// ==================== TEST ROUTE ====================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mentoroid Auth Service is Running!",
    timestamp: new Date().toISOString(),
    service: "Auth API",
  });
});

// ==================== ROUTES ====================
// Tumhare saare auth routes yahan load honge
// Example: /api/user/register, /api/user/login, /api/user/me etc.
app.use("/api/user", UserRoutes);

// 404 Handler (Agar koi route na mile)
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global Error Handler (Optional but recommended)
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ==================== START SERVER AFTER DB CONNECT ====================
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

// Start the server
startServer();
