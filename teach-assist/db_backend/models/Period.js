const mongoose = require("mongoose");

const periodSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  startTime: { type: String }, // Consider using Date if needed
  endTime: { type: String },
  gradeLevels: [{ type: String }], // e.g., ["9", "10"]
  daysOfWeek: [{ type: String }], // e.g., ["Monday", "Wednesday"]
  subject: { type: String },
  roomNumber: { type: String },
});

module.exports = mongoose.model("Period", periodSchema);
