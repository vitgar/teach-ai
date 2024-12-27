const mongoose = require("mongoose");

// Backend GuidedReadingActivitySchema (No changes needed)
const GuidedReadingActivitySchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GuidedReadingSession",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    activity: {
      type: String,
    },
    comments: {
      type: String,
    },
    nextStepsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NextSteps",
    },
    duration: {
      type: Number,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "GuidedReadingActivity",
  GuidedReadingActivitySchema
);
