// routes/user/profile.js

const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middleware/authMiddleware");
const Profile = require("../models/profileSchema");
const User = require("../models/User");

// POST /api/user/profile/create
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { studentWhatsapp, parentWhatsapp, schoolName, board, class: studentClass } = req.body;

    if (!studentWhatsapp || !board || !studentClass || !schoolName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await Profile.findOne({ user: userId });
    if (existing) {
      return res.status(400).json({ message: "Profile already exists. Use update instead." });
    }

    const profile = new Profile({
      user: userId,
      studentWhatsapp,
      parentWhatsapp,
      schoolName,
      board,
      class: studentClass,
    });

    await profile.save();

    res.status(201).json({
      success: true,
      message: "Profile created successfully",
      profile,
    });
  } catch (error) {
    console.error("Create Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// PUT /api/user/profile/update
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      studentWhatsapp,
      parentWhatsapp,
      schoolName,
      board,
      class: studentClass
    } = req.body;

    // Update the name in User model
    if (name) {
      await User.findByIdAndUpdate(userId, { name }, { new: true });
    }

    // Try to find profile
    let profile = await Profile.findOne({ user: userId });

    //  If profile doesn't exist → CREATE IT AUTOMATICALLY
    if (!profile) {
      profile = new Profile({
        user: userId,
        studentWhatsapp,
        parentWhatsapp,
        schoolName,
        board,
        class: studentClass,
      });

      await profile.save();

      return res.json({
        success: true,
        message: "Profile created automatically",
        profile,
      });
    }

    //  Otherwise update profile
    profile.studentWhatsapp = studentWhatsapp ?? profile.studentWhatsapp;
    profile.parentWhatsapp = parentWhatsapp ?? profile.parentWhatsapp;
    profile.schoolName = schoolName ?? profile.schoolName;
    profile.board = board ?? profile.board;
    profile.class = studentClass ?? profile.class;

    await profile.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/user/profile/get
router.get("/get", authMiddleware, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate("user", "name email");

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.json({
      success: true,
      profile: {
        name: profile.user.name,
        email: profile.user.email,
        studentWhatsapp: profile.studentWhatsapp,
        parentWhatsapp: profile.parentWhatsapp,
        schoolName: profile.schoolName,
        board: profile.board,
        class: profile.class,
      },
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;