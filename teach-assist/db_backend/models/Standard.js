const mongoose = require("mongoose");

const StandardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  state: { type: String, required: true },
});

module.exports = mongoose.model("Standard", StandardSchema); 