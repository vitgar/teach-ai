// models/DetailedStandard.js

const mongoose = require("mongoose");

const DetailedStandardSchema = new mongoose.Schema({
  strand: {
    type: String,
    required: true
  },
  standard: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  short_description: {
    type: String,
    required: true
  },
  gradeLevel: {
    type: String,
    required: true
  },
  teachingStandards: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("DetailedStandard", DetailedStandardSchema, "detailedstandards");
