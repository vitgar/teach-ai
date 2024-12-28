// routes/lessonPlans.js

const express = require("express");
const router = express.Router();
const Joi = require("joi");
const mongoose = require("mongoose");

// Import Models
const LessonPlan = require("../models/LessonPlan");
const Group = require("../models/Group");
const Teacher = require("../models/Teacher");

// Import Authentication Middleware
const { isAuthenticated } = require("../middleware/auth");

// Enable Mongoose Debugging (Optional)
mongoose.set("debug", true);

// Validation Schema for LessonPlan
const lessonPlanSchema = Joi.object({
  lesson: Joi.string().required(),
  resource: Joi.string().allow("").optional(),
  groupId: Joi.string().required(),
  date: Joi.date().iso().required(),
  lessonType: Joi.string().required(),
  teacherId: Joi.string().required(),
});

// @route   POST /lesson-plans
// @desc    Create a new LessonPlan
// @access  Private
router.post("/", async function(req, res) {
  try {
    const { error, value } = lessonPlanSchema.validate(req.body);

    if (error) {
      console.error("Validation error:", error.details);
      return res
        .status(400)
        .json({ error: error.details.map((d) => d.message).join(", ") });
    }

    const { lesson, resource, groupId, date, lessonType, teacherId } = value;

    // Ensure Group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Ensure Teacher exists and matches authenticated user
    if (teacherId !== req.user.id) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Teacher ID mismatch." });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found." });
    }

    // Convert date to Date object
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    console.log("Date before saving:", dateObj, typeof dateObj);

    const lessonPlan = new LessonPlan({
      lesson,
      resource,
      groupId,
      date: dateObj,
      lessonType,
      teacherId,
    });

    await lessonPlan.save();

    console.log("LessonPlan saved:", lessonPlan);

    res.status(201).json({
      message: "Lesson plan created successfully.",
      lessonPlanId: lessonPlan._id,
    });
  } catch (err) {
    console.error("Error creating lesson plan:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @route   GET /lesson-plans
// @desc    Retrieve LessonPlans by GroupId, Date, and LessonType
// @access  Private
router.get("/", async (req, res) => {
  const { groupId, date, lessonType } = req.query;

  if (!groupId || !date || !lessonType) {
    return res
      .status(400)
      .json({ error: "groupId, date, and lessonType are required." });
  }

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return res.status(400).json({ error: "Invalid groupId." });
  }

  try {
    // Ensure the teacher is accessing their own lesson plans
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found." });
    }

    // Parse and validate the date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    // Set time to start of the day
    parsedDate.setHours(0, 0, 0, 0);

    // Calculate the next day
    const nextDay = new Date(parsedDate);
    nextDay.setDate(parsedDate.getDate() + 1);

    console.log("Querying LessonPlans from:", parsedDate, "to:", nextDay);

    const lessonPlans = await LessonPlan.find({
      groupId,
      date: {
        $gte: parsedDate,
        $lt: nextDay,
      },
      lessonType,
      teacherId: req.user.id, // Ensure only the teacher's lesson plans are retrieved
    }).lean();

    // Optional: Log the retrieved lesson plans
    console.log("Retrieved LessonPlans:", lessonPlans);

    res.status(200).json(lessonPlans);
  } catch (err) {
    console.error("Error fetching lesson plans:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @route   GET /lesson-plans/:id
// @desc    Retrieve a single LessonPlan by ID
// @access  Private
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid LessonPlan ID." });
  }

  try {
    const lessonPlan = await LessonPlan.findById(id).lean();

    if (!lessonPlan) {
      return res.status(404).json({ error: "LessonPlan not found." });
    }

    // Ensure the teacher owns this lesson plan
    if (lessonPlan.teacherId.toString() !== req.user.id) {
      return res.status(401).json({ error: "Unauthorized: Access denied." });
    }

    console.log("Retrieved LessonPlan:", lessonPlan);

    res.status(200).json(lessonPlan);
  } catch (err) {
    console.error("Error fetching lesson plan:", err.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
