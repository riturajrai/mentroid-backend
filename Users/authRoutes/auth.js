// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const transporter = require("../../mails/transporter");
const User = require("../models/User");
const Otp = require("../models/Otp");
const authMiddleware = require("../middleware/authMiddleware");
require("dotenv").config();

const router = express.Router();

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/* -------------------- REGISTER / SEND OTP -------------------- */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, email, and password",
      });
    }

    // Sanitize email
    const trimmedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered! Please use a different email.",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate OTP and set expiration
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove any previous OTPs for this email
    await Otp.deleteMany({ email: trimmedEmail });

    // Save temporary user data with OTP
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
    if (process.env.NODE_ENV !== "production") {
      console.log(`OTP sent to ${trimmedEmail}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully! Check your email.",
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

/* -------------------- VERIFY OTP & CREATE ACCOUNT -------------------- */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp || otp.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Valid email and 6-digit OTP are required",
      });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Find valid OTP
    const otpData = await Otp.findOne({
      email: trimmedEmail,
      expiresAt: { $gt: new Date() },
    });

    if (!otpData || otpData.otp !== otp) {
      return res.status(400).json({
        success: false,
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

    // Clean up used OTP
    await Otp.deleteOne({ _id: otpData._id });

    // Send welcome email
    await transporter.sendMail({
      from: `"Mentoroid App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Welcome to Mentoroid!",
      html: `
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <title>Welcome to Mentoroid!</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
            <tr>
              <td align="center">
                <table width="600" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                  <tr>
                    <td style="padding:20px 24px;border-bottom:1px solid #eef1f5;">
                      <img src="https://i.ibb.co/fdVSyZMW/mentoroid-app.png" alt="Mentoroid" width="40" height="40" style="border-radius:6px;">
                      <span style="float:right;font-weight:600;color:#0f172a;margin-top:10px;">Mentoroid App</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 24px;">
                      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Welcome ${user.name}!</h1>
                      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
                        Your account has been successfully verified. You can now start using Mentoroid!
                      </p>
                      <div style="text-align:center;margin:30px 0;">
                        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login" 
                           style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;font-weight:500;">
                          Login Now
                        </a>
                      </div>
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
    res.status(500).json({
      success: false,
      message: "Server error during verification",
    });
  }
});

/* -------------------- LOGIN (Returns JWT Token) -------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user and include passwordHash
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select("+passwordHash");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token, // Frontend saves this in localStorage
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* -------------------- GET CURRENT USER (Protected Route) -------------------- */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    // Get complete user data (excluding password)
    const user = await User.findById(req.user.id).select("-passwordHash");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Get User Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* -------------------- LOGOUT -------------------- */
router.post("/logout", (req, res) => {
  // No server-side cleanup needed for JWT
  // Frontend will remove token from localStorage
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = router;
