const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("../authRoutes/auth.js");
const profileRoutes = require("../ProfileRoutes/profile.js");
const VerifyToken = require('../../VerifyToken/VerifyToken.js')
const ForgetPasswordRoutes = require('../ForgetPasswordRoutes/forgetpassword.js')


// Users Routes Mount routes
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/token", VerifyToken)
router.use("/", ForgetPasswordRoutes)



module.exports = router;
