const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const DatabaseConnection = require("./database/config");
const UserRoutes = require("./Users/routes/routes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://mentoroid-frontend.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get('/', async (req, res) => {
  res.status(200).json({ message: "Your server is Running" })
})

// Start server after DB connectioN
const startServer = async () => {

  try {
    await DatabaseConnection();
    console.log("MongoDB connected successfully!");
    app.use("/api/user", UserRoutes);
    app.listen(4000, () => console.log("Auth Service running on port 4000"))
  } catch (err) {
    console.error("Failed to start Auth Service:", err.message);
    process.exit(1)
  }
};

startServer();

