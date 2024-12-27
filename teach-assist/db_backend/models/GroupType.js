const mongoose = require("mongoose");

const groupTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("GroupType", groupTypeSchema);
