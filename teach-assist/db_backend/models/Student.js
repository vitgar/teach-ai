const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  studentId: { 
    type: String, 
    required: true,
    unique: true 
  },
  gradeLevel: { type: String, required: true },
  readingLevel: { type: String, required: true },
  teacherId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true 
  },
  periodId: { type: String },
  groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }]
});

module.exports = mongoose.model('Student', StudentSchema);
