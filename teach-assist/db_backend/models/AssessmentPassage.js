const mongoose = require('mongoose');

const assessmentPassageSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  passage: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    required: true
  },
  isAIGenerated: {
    type: Boolean,
    default: true
  },
  includeAnswerKey: {
    type: Boolean,
    default: false
  },
  answerKey: {
    type: String
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    answers: [{
      type: String,
      required: true
    }],
    correctAnswer: String,
    explanation: String,
    standardReference: String,
    bloomsLevel: String
  }],
  isPairedPassage: {
    type: Boolean,
    default: false
  },
  passages: [{
    topic: String,
    genre: String,
    content: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('AssessmentPassage', assessmentPassageSchema); 