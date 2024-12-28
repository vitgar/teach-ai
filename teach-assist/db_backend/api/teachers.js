// routes/teachers.js

const express = require("express");
const router = express.Router();
const Joi = require("joi");
const mongoose = require("mongoose");

// Import Models
const Teacher = require("../models/Teacher");
const Standard = require("../models/DetailedStandard");

// Import Authentication Middleware
const { isAuthenticated } = require("../middleware/auth"); // Adjust path as needed

// Validation Schema for Teacher
const teacherSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  teachingStandards: Joi.array()
    .items(
      Joi.string().custom((value, helpers) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          return helpers.error("any.invalid");
        }
        return value;
      }, "ObjectId Validation")
    )
    .required(),
});

// @route   POST /teachers
// @desc    Create a new Teacher
// @access  Private
router.post("/", isAuthenticated, async (req, res) => {
  const { error, value } = teacherSchema.validate(req.body);

  if (error) {
    console.error("Validation error:", error.details);
    return res
      .status(400)
      .json({ error: error.details.map((d) => d.message).join(", ") });
  }

  const { name, email, teachingStandards } = value;

  try {
    // Check if email already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res
        .status(400)
        .json({ error: "Teacher with this email already exists." });
    }

    // Ensure Standards exist
    const standards = await Standard.find({ _id: { $in: teachingStandards } });
    if (standards.length !== teachingStandards.length) {
      return res
        .status(404)
        .json({ error: "One or more Standards not found." });
    }

    const teacher = new Teacher({
      name,
      email,
      teachingStandards, // Array of ObjectIds
    });

    await teacher.save();

    console.log("Teacher saved:", teacher);

    res.status(201).json({
      message: "Teacher created successfully.",
      teacherId: teacher._id,
    });
  } catch (err) {
    console.error("Error creating teacher:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @route   GET /teachers/:id
// @desc    Retrieve a single Teacher by ID with teachingStandards populated
// @access  Private
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  // Validate the ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Teacher ID." });
  }

  try {
    // Find the teacher and populate the 'teachingStandards' field
    const teacher = await Teacher.findById(id)
      .populate("teachingStandards", "name description") // Populate 'teachingStandards' with name and description
      .lean();

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found." });
    }

    res.status(200).json(teacher);
  } catch (err) {
    console.error("Error fetching teacher:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Add the update subscription endpoint
router.post('/:id/subscription', async (req, res) => {
  try {
    const { id } = req.params;
    const { subscription, paymentProviders } = req.body;

    if (!id || !subscription) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Update subscription data
    teacher.subscription = subscription;

    // Update payment provider data if provided
    if (paymentProviders) {
      teacher.paymentProviders = {
        ...teacher.paymentProviders,
        ...paymentProviders
      };
    }

    await teacher.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
