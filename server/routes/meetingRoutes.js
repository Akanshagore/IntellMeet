const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const Meeting = require("../models/Meeting");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Calculate meeting status from its scheduled start and end times.
function getDisplayStatus(meeting) {
  if (meeting.status === "cancelled") {
    return "cancelled";
  }

  const now = Date.now();
  const start = new Date(meeting.scheduledAt).getTime();
  const end = meeting.endAt
    ? new Date(meeting.endAt).getTime()
    : NaN;

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return "invalid_schedule";
  }

  if (now < start) return "upcoming";
  if (now >= end) return "expired";

  return "live";
}

// Add a calculated displayStatus to a meeting.
function meetingWithDisplayStatus(meeting) {
  const item = meeting.toObject
    ? meeting.toObject()
    : { ...meeting };

  item.displayStatus = getDisplayStatus(item);

  return item;
}

// PUBLIC: Validate a guest invitation link.
// GET /api/meetings/invite/:token
router.get("/invite/:token", async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      inviteToken: req.params.token,
    }).select(
      "title description scheduledAt endAt status allowGuestJoin inviteToken"
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "This meeting link is invalid or unavailable.",
      });
    }

    if (meeting.allowGuestJoin !== true) {
      return res.status(403).json({
        success: false,
        message: "Guest joining is disabled for this meeting.",
      });
    }

    const displayStatus = getDisplayStatus(meeting);

    if (displayStatus === "cancelled") {
      return res.status(403).json({
        success: false,
        message: "This meeting has been cancelled.",
      });
    }

    if (displayStatus === "expired") {
      return res.status(403).json({
        success: false,
        message: "This meeting has expired. You can no longer join.",
        status: "expired",
      });
    }

    if (displayStatus === "invalid_schedule") {
      return res.status(400).json({
        success: false,
        message: "This meeting has an invalid schedule.",
      });
    }

    return res.status(200).json({
      success: true,
      meeting: {
        _id: meeting._id,
        title: meeting.title,
        description: meeting.description,
        scheduledAt: meeting.scheduledAt,
        endAt: meeting.endAt,
        status: displayStatus,
        displayStatus,
        allowGuestJoin: meeting.allowGuestJoin,
      },
    });
  } catch (error) {
    console.error("Validate invite error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to validate meeting link.",
    });
  }
});

// All routes below require a valid JWT.
router.use(protect);

// CREATE/REUSE INVITATION LINK
// POST /api/meetings/:id/invite
router.post("/:id/invite", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting ID.",
      });
    }

     
const meeting = await Meeting.findOne({
  _id: req.params.id,
  createdBy: req.user._id,
});

console.log("Meeting found:", !!meeting);
console.log("Existing invite token:", meeting?.inviteToken);


    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found or access denied.",
      });
    }

    if (meeting.allowGuestJoin !== true) {
      return res.status(403).json({
        success: false,
        message: "Guest joining is disabled.",
      });
    }

    const displayStatus = getDisplayStatus(meeting);

    if (displayStatus === "expired") {
      return res.status(403).json({
        success: false,
        message: "This meeting has expired.",
      });
    }

    if (displayStatus === "invalid_schedule") {
      return res.status(400).json({
        success: false,
        message: "This meeting has an invalid schedule.",
      });
    }

    if (displayStatus === "cancelled") {
      return res.status(403).json({
        success: false,
        message: "This meeting has been cancelled.",
      });
    }

    if (!meeting.inviteToken) {
      meeting.inviteToken = crypto.randomBytes(32).toString("hex");
      await meeting.save();
    }

    return res.status(200).json({
      success: true,
      inviteToken: meeting.inviteToken,
      inviteLink: `${process.env.CLIENT_URL || "http://localhost:5173"}/meeting/${meeting.inviteToken}`,
    });
  } catch (error) {
    console.error("Create invite error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create invitation link.",
    });
  }
});

// GET ALL MEETINGS CREATED BY THE LOGGED-IN USER
// GET /api/meetings
router.get("/", async (req, res) => {
  try {
    const meetings = await Meeting.find({
      createdBy: req.user._id,
    }).sort({ scheduledAt: 1 });

    return res.status(200).json({
      success: true,
      count: meetings.length,
      meetings: meetings.map(meetingWithDisplayStatus),
    });
  } catch (error) {
    console.error("Get meetings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load meetings.",
    });
  }
});

// CREATE MEETING
// POST /api/meetings
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description = "",
      scheduledAt,
      endAt,
      participants = [],
    } = req.body;

    if (
      typeof title !== "string" ||
      title.trim().length < 3 ||
      title.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Meeting title must be between 3 and 100 characters.",
      });
    }

    if (
      typeof description !== "string" ||
      description.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting description.",
      });
    }

    if (
      typeof scheduledAt !== "string" ||
      !scheduledAt.trim() ||
      !Number.isFinite(Date.parse(scheduledAt))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid start date and time.",
      });
    }

    if (
      typeof endAt !== "string" ||
      !endAt.trim() ||
      !Number.isFinite(Date.parse(endAt))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid end date and time.",
      });
    }

    const startDate = new Date(scheduledAt);
    const endDate = new Date(endAt);

    if (startDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Meeting start time must be in the future.",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time.",
      });
    }

    if (
      !Array.isArray(participants) ||
      participants.length > 100 ||
      !participants.every(
        (email) =>
          typeof email === "string" &&
          /^\S+@\S+\.\S+$/.test(email.trim())
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Participants must be valid email addresses.",
      });
    }

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description.trim(),
      scheduledAt: startDate,
      endAt: endDate,
      participants: [
        ...new Set(
          participants.map((email) =>
            email.trim().toLowerCase()
          )
        ),
      ],
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Meeting created successfully.",
      meeting: meetingWithDisplayStatus(meeting),
    });
  } catch (error) {
    console.error("Create meeting error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create meeting.",
    });
  }
});

// UPDATE MEETING
// PUT /api/meetings/:id
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting ID.",
      });
    }

    const {
      title,
      description,
      scheduledAt,
      endAt,
      participants,
    } = req.body;

    if (
      typeof title !== "string" ||
      title.trim().length < 3 ||
      title.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Title must be between 3 and 100 characters.",
      });
    }

    if (
      typeof description !== "string" ||
      description.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid description.",
      });
    }

    if (
      typeof scheduledAt !== "string" ||
      !scheduledAt.trim() ||
      !Number.isFinite(Date.parse(scheduledAt))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid start date and time are required.",
      });
    }

    if (
      typeof endAt !== "string" ||
      !endAt.trim() ||
      !Number.isFinite(Date.parse(endAt))
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid end date and time are required.",
      });
    }

    if (
      !Array.isArray(participants) ||
      participants.length > 100 ||
      !participants.every(
        (email) =>
          typeof email === "string" &&
          /^\S+@\S+\.\S+$/.test(email.trim())
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid participant email addresses.",
      });
    }

    const startDate = new Date(scheduledAt);
    const endDate = new Date(endAt);

    if (startDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Meeting start time must be in the future.",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time.",
      });
    }

    const meeting = await Meeting.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user._id,
      },
      {
        $set: {
          title: title.trim(),
          description: description.trim(),
          scheduledAt: startDate,
          endAt: endDate,
          participants: [
            ...new Set(
              participants.map((email) =>
                email.trim().toLowerCase()
              )
            ),
          ],
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Meeting updated successfully.",
      meeting: meetingWithDisplayStatus(meeting),
    });
  } catch (error) {
    console.error("Update meeting error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update meeting.",
    });
  }
});

// DELETE MEETING
// DELETE /api/meetings/:id
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid meeting ID.",
      });
    }

    const meeting = await Meeting.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Meeting deleted successfully.",
    });
  } catch (error) {
    console.error("Delete meeting error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete meeting.",
    });
  }
});

module.exports = router;