const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  type: String,
  title: String,
  content: String,
  metadata: {
    instructions: String,
    grade_level: String,
    subject: String
  }
}, { _id: false });

const nextStepsSchema = new mongoose.Schema({
  nextSteps: {
    type: String,
    required: true,
  },
  resources: {
    type: [resourceSchema], // Define as an array of resources
    default: [],
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  nextStepsType: {
    type: String,
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  book: String,
}, {
  timestamps: true,
});

// Create indexes for efficient querying
nextStepsSchema.index({ groupId: 1, date: 1, nextStepsType: 1 });

const NextSteps = mongoose.model('NextSteps', nextStepsSchema);

module.exports = NextSteps;
