const mongoose = require("mongoose");

const studentObservationSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  lessonPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SmallGroupLessonPlan",
    required: true,
  },
  observation: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  storyTitle: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("StudentObservation", studentObservationSchema); 