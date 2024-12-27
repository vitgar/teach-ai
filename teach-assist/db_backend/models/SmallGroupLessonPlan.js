const mongoose = require("mongoose");

const SmallGroupLessonPlanSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  standard: {
    code: String,
    description: String
  },
  lexileLevel: {
    type: String,
    required: true
  },
  story: {
    title: String,
    content: String
  },
  sections: {
    warmUp: String,
    introductionAndGuidedPractice: String,
    independentPractice: String,
    checkingComprehension: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("SmallGroupLessonPlan", SmallGroupLessonPlanSchema); 