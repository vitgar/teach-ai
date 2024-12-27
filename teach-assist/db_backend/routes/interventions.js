// routes/interventions.js

const express = require("express");
const router = express.Router();
const Joi = require("joi");
const mongoose = require("mongoose");

// Import Models
const Intervention = require("../models/Intervention");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Group = require("../models/Group");

// Import Authentication Middleware
const { isAuthenticated } = require("../middleware/auth");

// Validation Schema for Intervention
const interventionSchema = Joi.object({
  _id: Joi.string().optional(),
  studentId: Joi.string().required(),
  intervention: Joi.string().required(),
  interventionResults: Joi.string().allow("").optional(),
  date: Joi.date().iso().required(),
  duration: Joi.number().required(),
  lessonPlanId: Joi.string().optional(),
  groupId: Joi.string().required(),
});

// @route   GET /interventions
// @desc    Retrieve interventions based on student IDs and date
// @access  Private
router.get("/", isAuthenticated, async function(req, res) {
  try {
    const { studentIds, date } = req.query;

    if (!studentIds || !date) {
      return res.status(400).json({ error: "studentIds and date are required." });
    }

    const studentIdArray = studentIds.split(",");
    const parsedDate = new Date(date);
    parsedDate.setHours(0, 0, 0, 0); // Start of the day

    const nextDay = new Date(parsedDate);
    nextDay.setDate(parsedDate.getDate() + 1);

    const interventions = await Intervention.find({
      studentId: { $in: studentIdArray },
      date: {
        $gte: parsedDate,
        $lt: nextDay,
      },
      // teacherId: req.user.id, // Removed teacherId from the query
    }).lean();

    res.status(200).json(interventions);
  } catch (err) {
    console.error("Error fetching interventions:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @route   POST /interventions
// @desc    Create or update interventions
// @access  Private
router.post("/", isAuthenticated, async (req, res) => {
  const interventions = req.body;

  if (!Array.isArray(interventions)) {
    return res.status(400).json({ error: "Invalid data format." });
  }

  try {
    const validatedInterventions = [];

    for (const interventionData of interventions) {
      const { error, value } = interventionSchema.validate(interventionData);

      if (error) {
        console.error("Validation error:", error.details);
        return res
          .status(400)
          .json({ error: error.details.map((d) => d.message).join(", ") });
      }

      const {
        _id,
        studentId,
        intervention,
        interventionResults,
        date,
        duration,
        lessonPlanId,
        groupId,
      } = value;

      // Ensure Student exists
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found." });
      }

      // Ensure Group exists
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found." });
      }

      let interventionDoc;

      if (_id) {
        // Update existing intervention
        interventionDoc = await Intervention.findOneAndUpdate(
          { _id },
          {
            studentId,
            intervention,
            interventionResults,
            date,
            duration,
            lessonPlanId,
            groupId,
          },
          { new: true }
        );
      } else {
        // Create new intervention
        interventionDoc = new Intervention({
          studentId,
          teacherId: req.user.id,
          intervention,
          interventionResults,
          date,
          duration,
          lessonPlanId,
          groupId,
        });
        await interventionDoc.save();
      }

      validatedInterventions.push(interventionDoc);
    }

    res.status(200).json({
      message: "Interventions saved successfully.",
      data: validatedInterventions,
    });
  } catch (err) {
    console.error("Error saving interventions:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
