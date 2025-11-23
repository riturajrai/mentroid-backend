const express = require("express");
const ChatHistory = require("../models/askAnythingsSchema/ChatHistory");
const auth = require("../../middleware/authMiddleware");
const router = express.Router();

/* ADD MESSAGE */
router.post("/add", auth, async (req, res) => {
  try {
    const { role, text } = req.body;

    if (!role || !text) {
      return res.status(400).json({ success: false, message: "Role and text are required" });
    }

    let chat = await ChatHistory.findOne({ userId: req.user.id });

    if (!chat) {
      chat = new ChatHistory({
        userId: req.user.id,
        messages: []
      });
    }

    chat.messages.push({
      role,
      text,
      createdAt: new Date()
    });

    await chat.save();

    res.json({ success: true, chat });
  } catch (err) {
    console.error("Error adding message:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* GET FULL CHAT HISTORY WITH USER ID */
router.get("/history", auth, async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({ userId: req.user.id });

    res.json({
      success: true,
      userId: req.user.id,
      chatid: req.params.id,
      messages: chat ? chat.messages : []
    });
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* DELETE SINGLE MESSAGE BY ID */
router.delete("/message/:messageId", auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    let chat = await ChatHistory.findOne({ userId: req.user.id });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    chat.messages = chat.messages.filter(msg => msg._id.toString() !== messageId);

    await chat.save();

    res.json({ success: true, chat });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* DELETE FULL CHAT HISTORY */
router.delete("/history", auth, async (req, res) => {
  try {
    let chat = await ChatHistory.findOne({ userId: req.user.id });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

    chat.messages = [];
    await chat.save();

    res.json({ success: true, message: "All chat history deleted", chat });
  } catch (err) {
    console.error("Error deleting chat history:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
