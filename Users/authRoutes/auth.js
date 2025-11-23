const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const transporter = require("../../mails/transporter");
const User = require("../models/User");
const Otp = require("../models/Otp");
require("dotenv").config();

const router = express.Router();

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Environment flags
const isProduction = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,          
  sameSite: isProduction ? "none" : "lax",  
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

/* -------------------- REGISTER / SEND OTP -------------------- */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered!" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12); // 12 is better than 10
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove previous OTPs
    await Otp.deleteMany({ email: trimmedEmail });

    // Save temporary user + OTP
    await Otp.create({
      name: name.trim(),
      email: trimmedEmail,
      passwordHash,
      otp,
      expiresAt,
    });

    // Send OTP Email
    await transporter.sendMail({
      from: `"Mentoroid App" <${process.env.EMAIL_USER}>`,
      to: trimmedEmail,
      subject: "Your OTP for Verification - Mentoroid",
      html: `
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <title>Mentoroid OTP Verification</title>
          <style>
            @media only screen and (max-width: 480px) {
              .container { width: 100% !important; padding: 16px !important; }
              .otp-box { font-size: 24px !important; padding: 14px 20px !important; letter-spacing: 6px !important; }
            }
          </style>
        </head>
        <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
            <tr>
              <td align="center">
                <table class="container" width="600" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding:20px 24px;border-bottom:1px solid #eef1f5;">
                      <img src="https://i.ibb.co/fdVSyZMW/mentoroid-app.png" alt="Mentoroid" width="40" height="40" style="border-radius:6px;">
                      <span style="float:right;font-weight:600;color:#0f172a;margin-top:10px;">Mentoroid App</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 24px;">
                      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Hello ${name.trim()},</h1>
                      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
                        Thanks for signing up! Use the OTP below to verify your email.<br/>
                        <strong>This OTP is valid for 10 minutes only.</strong>
                      </p>
                      <div style="text-align:center;margin:30px 0;">
                        <div class="otp-box" style="display:inline-block;padding:16px 32px;background:#f8fafc;border:2px dashed #0ea5e9;border-radius:12px;font-size:32px;font-weight:bold;letter-spacing:10px;color:#0f172a;">
                          ${otp}
                        </div>
                      </div>
                      <p style="font-size:13px;color:#64748b;">
                        If you didn't request this, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 24px;background:#fbfdfe;border-top:1px solid #eef1f5;text-align:center;font-size:12px;color:#94a3b8;">
                      © ${new Date().getFullYear()} Mentoroid App. All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    // Only log OTP in development
    if (!isProduction) {
      console.log(`OTP sent to ${trimmedEmail}: ${otp}`);
    }

    res.status(200).json({ message: "OTP sent successfully! Check your email." });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

/* -------------------- VERIFY OTP -------------------- */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || otp.length !== 6) {
      return res.status(400).json({ message: "Valid email and 6-digit OTP are required" });
    }

    const trimmedEmail = email.toLowerCase().trim();

    const otpData = await Otp.findOne({
      email: trimmedEmail,
      expiresAt: { $gt: new Date() },
    });

    if (!otpData || otpData.otp !== otp) {
      return res.status(400).json({
        message: "Invalid or expired OTP. Please request a new one.",
      });
    }

    // Create verified user
    const user = await User.create({
      name: otpData.name,
      email: otpData.email,
      passwordHash: otpData.passwordHash,
      isVerified: true,
    });

    // Clean up OTP
    await Otp.deleteOne({ _id: otpData._id });

    // Welcome Email
    await transporter.sendMail({
      from: `"Mentoroid App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Welcome to Mentoroid!",
      html: `
        <!-- Welcome email HTML (same as before, just cleaned) -->
        <p>Welcome ${user.name}! Your account is ready.</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login">Login Now</a>
      `,
      // You can keep full HTML like before if needed
    });

    res.status(200).json({
      success: true,
      message: "Account verified & created successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "Server error during verification" });
  }
});

/* -------------------- LOGIN -------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* -------------------- GET CURRENT USER -------------------- */
router.get("/me", async (req, res) => {
  try {
    const token = req.cookies.token;
    console.log(token)
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("Token verification failed:", err.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

/* -------------------- LOGOUT -------------------- */
router.post("/logout", (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;