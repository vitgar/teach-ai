const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  answers: [{
    type: String
  }],
  correctAnswer: String,
  explanation: {
    type: String,
    default: ''
  },
  bloomsLevel: String,
  standardReference: String
});

const PassageSchema = new mongoose.Schema({
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
    default: false
  },
  includeAnswerKey: {
    type: Boolean,
    default: false
  },
  answerKey: {
    type: String,
    default: ''
  },
  lexileLevel: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    required: false
  },
  questions: [QuestionSchema],
  targetStandards: [{
    type: String
  }],
  gradeLevel: String,
  dateCreated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Passage', PassageSchema); 