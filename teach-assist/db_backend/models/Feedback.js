const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  page: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  }
});

module.exports = mongoose.model('Feedback', FeedbackSchema); 