const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
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
  lexileLevel: {
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
    question: String,
    answers: [String],
    correctAnswer: String,
    explanation: String,
    standardReference: String
  }],
  isPairedPassage: {
    type: Boolean,
    default: false
  },
  passages: [{
    topic: String,
    genre: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

assessmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Assessment', assessmentSchema); 