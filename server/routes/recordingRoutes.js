const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Recording = require("../models/Recording");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Recording folder तयार करणे
const uploadDir = path.join(__dirname, "../uploads/recordings");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + ".webm";

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});

// Get logged-in user's recordings
router.get("/my", protect, async (req, res) => {
  try {
    const recordings = await Recording.find({
      userId: req.user.id,
    })
      .populate("meetingId", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      recordings,
    });
  } catch (error) {
    console.error("Fetch recordings error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch recordings",
    });
  }
});

// Test recording route
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Recording route is working!",
  });
});

// Delete recording
router.delete("/:id", protect, async (req, res) => {
  try {
    const recording = await Recording.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: "Recording not found",
      });
    }

    const filePath = path.join(__dirname, "..", recording.filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await recording.deleteOne();

    res.json({
      success: true,
      message: "Recording deleted successfully",
    });
  } catch (error) {
    console.error("Delete recording error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete recording",
    });
  }
});

// Upload recording
router.post("/upload", protect, upload.single("recording"), async (req, res) => {
  try {
    const { meetingId, duration } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Recording file is required",
      });
    }

    if (!meetingId) {
      fs.unlinkSync(req.file.path);

      return res.status(400).json({
        success: false,
        message: "Meeting ID is required",
      });
    }

   
    const recording = await Recording.create({
      meetingId,
      userId: req.user.id,
      fileName: req.file.filename,
      filePath: `/uploads/recordings/${req.file.filename}`,
      duration: Number(duration) || 0,
      fileSize: req.file.size,
    });

    res.status(201).json({
      success: true,
      message: "Recording uploaded successfully!",
      recording,
    });
  } catch (error) {
    console.error("Recording upload error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to upload recording",
    });
  }
});

console.log("Recording routes loaded successfully!");
console.log("Registered recording test route:", router.stack.some(
  (layer) => layer.route?.path === "/test"
));

module.exports = router;