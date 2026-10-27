const express = require("express");
const Message = require("../models/Message");

const router = express.Router();

// Get previous messages for a meeting
router.get("/:meetingId", async (req, res) => {
  try {
    const messages = await Message.find({
      meetingId: req.params.meetingId,
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to load messages" });
  }
});

// Save a message
router.post("/", async (req, res) => {
  try {
    const { meetingId, senderId, senderName, text } = req.body;

    if (
      !meetingId?.trim() ||
      !senderId?.trim() ||
      !senderName?.trim() ||
      !text?.trim()
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        message: "Message cannot exceed 5000 characters",
      });
    }

    const message = await Message.create({
      meetingId: meetingId.trim(),
      senderId: senderId.trim(),
      senderName: senderName.trim(),
      text: text.trim(),
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to save message" });
  }
});

module.exports = router;
