const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const transporter = require("../../mails/transporter");
const User = require("../models/User");
const ForgetPasswordOtp = require("../models/ForgetPasswordOtp");

/* -------------------- STEP 1: SEND OTP -------------------- */
router.post("/forget-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not registered" });
    // Remove old OTP if exists
    await ForgetPasswordOtp.deleteOne({ email });
    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // 5 min valid
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    // Save OTP in DB
    await ForgetPasswordOtp.create({ email, otp, otpExpires });

    // Send Reset Password OTP via email
    await transporter.sendMail({
      from: `"Mentoroid App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP to Reset Password",
      html: `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Reset Password - Mentoroid App</title>
    <style>
      @media only screen and (max-width: 480px) {
        .container { width: 100% !important; padding: 16px !important; }
        .otp-box { font-size: 20px !important; padding: 12px 16px !important; }
        .lead { font-size: 12px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(16,24,40,0.05);">
            
            <!-- Header -->
            <tr>
              <td style="padding:18px 24px;border-bottom:1px solid #eef1f5;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left">
                      <img src="https://i.ibb.co/fdVSyZMW/mentoroid-app.png" 
                           alt="Mentoroid App" 
                           width="40" height="40"
                           style="display:block;border-radius:6px;object-fit:contain;">
                    </td>
                    <td align="right" style="font-size:12px;color:#0f172a;font-weight:600;">
                      Mentoroid App
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:24px;">
                <p class="lead" style="margin:0 0 16px 0;font-size:12px;color:#475569;line-height:1.6;">
                  We received a request to reset your <strong>Mentoroid</strong> account password.  
                  Please use the one-time password (OTP) below to continue.  
                  This OTP is valid for <strong>5 minutes</strong>.
                </p>

                <!-- OTP BOX -->
                <div style="margin:16px 0;">
                  <div class="otp-box" style="display:inline-block;padding:14px 18px;border-radius:8px;background:#f8fafc;border:1px solid #e6eef6;font-family:Courier, 'Courier New', monospace;font-size:22px;letter-spacing:4px;color:#0b1220;">
                    ${otp}
                  </div>
                </div>

                <p style="margin:0 0 16px 0;font-size:12px;color:#64748b;line-height:1.6;">
                  If you did not request this password reset, please ignore this email — your account is safe.
                </p>

                <hr style="border:none;border-top:1px solid #eef1f5;margin:20px 0;">

                <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.4;">
                  Need help? Reply to this email or visit our 
                  <a href="https://your-domain.com/support" style="color:#0ea5a4;text-decoration:none;">support page</a>.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:14px 24px 20px 24px;background:#fbfdfe;border-top:1px solid #eef1f5;">
                <p style="margin:0;font-size:11px;color:#94a3b8;">
                  © ${new Date().getFullYear()} Mentoroid App. All rights reserved.<br/>
                  Mentoroid App | 123 Your Street, City, Country
                </p>
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
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong while sending OTP", error });
  }
});

/* -------------------- STEP 2: VERIFY OTP -------------------- */
router.post("/verify-forget-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpRecord = await ForgetPasswordOtp.findOne({ email });
    if (!otpRecord)
      return res.status(400).json({ message: "No OTP request found" });
    if (otpRecord.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });
    if (otpRecord.otpExpires < new Date())
      return res.status(400).json({ message: "OTP expired" });
    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong while verifying OTP", error });
  }
});

/* -------------------- STEP 3: RESET PASSWORD -------------------- */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const otpRecord = await ForgetPasswordOtp.findOne({ email });
    if (!otpRecord)
      return res.status(400).json({ message: "OTP verification required" });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ email }, { $set: { passwordHash: hashedPassword } });
    // Delete OTP record after reset
    await ForgetPasswordOtp.deleteOne({ email });
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong while resetting password", error });
  }
});

module.exports = router;
