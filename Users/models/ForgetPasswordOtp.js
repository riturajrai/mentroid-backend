const mongoose = require("mongoose");

const forgetPasswordOtpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true },
});

module.exports = mongoose.model("ForgetPasswordOtp", forgetPasswordOtpSchema);
