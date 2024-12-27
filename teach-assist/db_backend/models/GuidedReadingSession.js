const mongoose = require("mongoose");

const GuidedReadingSessionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    book: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "GuidedReadingSession",
  GuidedReadingSessionSchema
);
