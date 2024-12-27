const mongoose = require("mongoose");

const StandardizedTestSchema = new mongoose.Schema({
  state: { type: String, required: true },
  acronym: { type: String, required: true },
  fullName: { type: String, required: true },
  description: { type: String }
}, {
  collection: 'standardizedTests'
});

module.exports = mongoose.models.StandardizedTest || mongoose.model("StandardizedTest", StandardizedTestSchema); 