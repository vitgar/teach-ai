// routes/periods.js
const express = require("express");
const router = express.Router();
const Joi = require("joi");
const mongoose = require("mongoose");

// Import Models
const Period = require("../models/Period");

// Validation Schema for Period
const periodSchema = Joi.object({
  name: Joi.string().required(),
  startTime: Joi.string().required(), // e.g., "09:00 AM"
  endTime: Joi.string().required(), // e.g., "10:00 AM"
  // Add other fields as necessary
});

// Create a new Period
router.post("/", async (req, res) => {
  const { error, value } = periodSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((d) => d.message).join(", ") });
  }

  try {
    const period = new Period(value);
    await period.save();
    res
      .status(201)
      .json({ message: "Period created successfully.", periodId: period._id });
  } catch (err) {
    console.error("Error creating period:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Retrieve all Periods
router.get("/", async (req, res) => {
  try {
    const periods = await Period.find().lean();
    res.status(200).json(periods);
  } catch (err) {
    console.error("Error fetching periods:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Retrieve a single Period by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Period ID." });
  }

  try {
    const period = await Period.findById(id).lean();
    if (!period) {
      return res.status(404).json({ error: "Period not found." });
    }
    res.status(200).json(period);
  } catch (err) {
    console.error("Error fetching period:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Update a Period
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Period ID." });
  }

  const { error, value } = periodSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((d) => d.message).join(", ") });
  }

  try {
    const updatedPeriod = await Period.findByIdAndUpdate(id, value, {
      new: true,
    });
    if (!updatedPeriod) {
      return res.status(404).json({ error: "Period not found." });
    }
    res
      .status(200)
      .json({ message: "Period updated successfully.", period: updatedPeriod });
  } catch (err) {
    console.error("Error updating period:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Delete a Period
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Period ID." });
  }

  try {
    const deletedPeriod = await Period.findByIdAndDelete(id);
    if (!deletedPeriod) {
      return res.status(404).json({ error: "Period not found." });
    }
    res.status(200).json({ message: "Period deleted successfully." });
  } catch (err) {
    console.error("Error deleting period:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
