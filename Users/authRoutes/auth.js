// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const transporter = require("../../mails/transporter");
const User = require("../models/User");
const Otp = require("../models/Otp");
const authMiddleware = require("../middleware/authMiddleware"); // IMPORTED
require("dotenv").config();

const router = express.Router();

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ==================== REGISTER / SEND OTP ====================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered!" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.deleteMany({ email: trimmedEmail });
    await Otp.create({ name: name.trim(), email: trimmedEmail, passwordHash, otp, expiresAt });

    await transporter.sendMail({
      from: `"Mentoroid App" <${process.env.EMAIL_USER}>`,
      to: trimmedEmail,
      subject: "Your OTP for Verification - Mentoroid",
      html: `<!-- Your full beautiful OTP HTML here -->`,
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`OTP for ${trimmedEmail}: ${otp}`);
    }

    res.status(200).json({ success: true, message: "OTP sent successfully!" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== VERIFY OTP ====================
router.post("/verify-otp", async (req, res) => {
  // ... same as before (no change needed)
  // (code chahiye toh bata dena, yahan short rakha hai)
});

// ==================== LOGIN - Returns Token ====================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== GET CURRENT USER (Protected) ====================
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ==================== LOGOUT (Frontend clears token) ====================
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
