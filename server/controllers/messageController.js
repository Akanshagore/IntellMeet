const mongoose = require("mongoose");
const Message = require("../models/Message");

// Fetch messages for a meeting
exports.getMessages = async (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!mongoose.isValidObjectId(meetingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting ID",
      });
    }

    const messages = await Message.find({ meeting: meetingId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 })
      .limit(200);

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Get messages error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const text = req.body.text?.trim();

    if (!mongoose.isValidObjectId(meetingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting ID",
      });
    }

    if (!text || text.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Message must contain 1–2000 characters",
      });
    }

    const message = await Message.create({
      meeting: meetingId,
      sender: req.user._id,
      text,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name email");

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    console.error("Send message error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};