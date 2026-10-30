const express = require("express");
const OpenAI = require("openai");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const { toFile } = require("openai/uploads");

const router = express.Router();


router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Summary route is working!",
  });
});

router.use(protect);

// POST /api/summary/transcribe
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
    "audio/webm",
    "video/webm",
    "audio/mp4",
    "video/mp4",
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "video/ogg",
    ];

    const mimeType = file.mimetype
    .toLowerCase()
    .split(";")[0]
    .trim();

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

     return cb(new Error("Unsupported recording format."));
  },
});

router.post(
  "/transcribe",
  (req, res, next) => {
    upload.single("recording")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Recording upload failed.",
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload a meeting recording.",
        });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          success: false,
          message: "OPENAI_API_KEY is missing in server/.env",
        });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const audioFile = await toFile(
        req.file.buffer,
        req.file.originalname || "meeting.webm",
        { type: req.file.mimetype }
      );

      const result = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "gpt-4o-mini-transcribe",
      });

      const transcript = result.text?.trim();

      if (!transcript) {
        return res.status(422).json({
          success: false,
          message: "No speech was detected in the recording.",
        });
      }

      return res.json({
        success: true,
        transcript,
      });
    } catch (error) {
      console.error("Transcription error:", error.message);

      return res.status(500).json({
        success: false,
        message:
          "Transcription failed. Check your OpenAI API key, billing, and backend logs.",
      });
    }
  }
);

router.post("/", async (req, res) => {
  try {
    const { transcript } = req.body;

    if (typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter a meeting transcript.",
      });
    }

    if (transcript.length > 30000) {
      return res.status(400).json({
        success: false,
        message: "Transcript is too long. Please shorten it.",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "OPENAI_API_KEY is missing in server/.env",
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: `
You are an AI meeting assistant.
Summarize the transcript accurately without inventing facts.

Use these headings:
1. Meeting Summary
2. Key Discussion Points
3. Decisions Made
4. Action Items
5. Unresolved Questions

If information is missing, write "Not mentioned".
Keep the summary clear and readable.
`,
      input: transcript.trim(),
      max_output_tokens: 1500,
    });

    const summary = response.output_text?.trim();

    if (!summary) {
      return res.status(502).json({
        success: false,
        message: "The AI returned an empty summary. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("AI Summary Error:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });

    if (error.status === 401) {
      return res.status(502).json({
        success: false,
        message: "OpenAI API key is invalid. Check server/.env.",
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "OpenAI API quota or rate limit reached. Check API billing and limits.",
      });
    }

    if (error.status === 400) {
      return res.status(502).json({
        success: false,
        message:
          "OpenAI rejected the request. Check the model name and API request.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to generate AI summary. Check the backend terminal.",
    });
  }
});

module.exports = router;