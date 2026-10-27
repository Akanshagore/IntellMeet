
const mongoose = require("mongoose");
const crypto = require("crypto");

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Meeting title is required"],
      trim: true,
      minlength: 3,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    scheduledAt: {
      type: Date,
      required: [true, "Meeting start time is required"],
      index: true,
    },

    endAt: {
      type: Date,
      required: [true, "Meeting end time is required"],
    },

    participants: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          validate: {
            validator: (email) =>
              /^\S+@\S+\.\S+$/.test(email),
            message: "Invalid participant email address",
          },
        },
      ],
      default: [],
      validate: {
        validator: (participants) => participants.length <= 100,
        message: "A maximum of 100 participants is allowed",
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },

    meetingLink: {
      type: String,
      default: "",
    },

    inviteToken: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },

    allowGuestJoin: {
      type: Boolean,
      default: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Validate meeting dates before saving.
meetingSchema.pre("validate", function () {
  if (
    this.scheduledAt &&
    this.endAt &&
    !Number.isNaN(new Date(this.scheduledAt).getTime()) &&
    !Number.isNaN(new Date(this.endAt).getTime()) &&
    new Date(this.endAt).getTime() <=
      new Date(this.scheduledAt).getTime()
  ) {
    this.invalidate(
      "endAt",
      "Meeting end time must be after start time"
    );
  }
});

module.exports = mongoose.model("Meeting", meetingSchema);
