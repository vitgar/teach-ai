// models/Intervention.js

const mongoose = require("mongoose");

const InterventionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    intervention: { type: String, required: true },
    interventionResults: { type: String, required: true },
    date: { type: Date, required: true },
    duration: { type: Number, required: true }, // Duration in minutes
    lessonPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LessonPlan",
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Intervention", InterventionSchema);
