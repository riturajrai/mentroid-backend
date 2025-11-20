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

// ==================== CORS CONFIG — NO WILDCARDS ====================
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

// ❌ REMOVE THIS (it breaks):
// app.options("/*", cors());

// ❌ REMOVE THIS TOO:
// app.options("*", cors());

// No wildcard at all → Node v22 safe

// ==================== DEFAULT ROUTE ====================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Mentoroid Auth Service is Running!",
    timestamp: new Date().toISOString(),
  });
});

// ==================== ROUTES ====================
app.use("/api/user", UserRoutes);

// ==================== 404 (NO WILDCARD) ====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await DatabaseConnection();
    console.log("MongoDB Connected Successfully!");

    app.listen(PORT, () => {
      console.log(`Auth Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
};

startServer();
