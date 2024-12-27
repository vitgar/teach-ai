// models/LessonPlan.js

const mongoose = require("mongoose");

const LessonPlanSchema = new mongoose.Schema({
  lesson: { type: String, required: true },
  resource: { type: String }, // Optional field
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  date: { type: Date, required: true },
  lessonType: { type: String, required: true },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
});

// Optional: Add a pre-save hook to ensure 'date' is a Date object
LessonPlanSchema.pre("save", function (next) {
  if (!(this.date instanceof Date)) {
    this.date = new Date(this.date);
  }
  if (isNaN(this.date.getTime())) {
    return next(new Error("Invalid date format."));
  }
  next();
});

module.exports = mongoose.model("LessonPlan", LessonPlanSchema);
