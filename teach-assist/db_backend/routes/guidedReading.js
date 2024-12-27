// routes/guidedReading.js

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { isAuthenticated } = require("../middleware/auth");

// Models
const GuidedReadingSession = require("../models/GuidedReadingSession");
const GuidedReadingActivity = require("../models/GuidedReadingActivity");
const Group = require("../models/Group");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const NextSteps = require("../models/NextSteps");

// Validation Schema
const Joi = require("joi");

const sessionSchema = Joi.object({
  date: Joi.date().iso().required(),
  book: Joi.string().required(),
  level: Joi.string().required(),
  nextSteps: Joi.string().allow(""),
  groupId: Joi.string().required(),
  teacherId: Joi.string().required(),
  duration: Joi.number().optional(),
});

const activitySchema = Joi.object({
  sessionId: Joi.string().required(),
  studentId: Joi.string().required(),
  activity: Joi.string().allow("").optional(),
  comments: Joi.string().allow("").optional(),
});

// Routes

// @route   POST /guided-reading/sessions
// @desc    Create or update a guided reading session
// @access  Private
router.post("/sessions", isAuthenticated, async (req, res) => {
  // Validate the request body
  const { error, value } = sessionSchema.validate(req.body);

  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((d) => d.message).join(", ") });
  }

  // Destructure validated fields
  const { date, book, level, nextSteps, duration, groupId, teacherId } = value;

  try {
    // Ensure the group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Ensure the teacher is the authenticated user
    if (teacherId !== req.user.id) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    // Check if a session already exists for this date and group
    let session = await GuidedReadingSession.findOne({
      date,
      groupId,
      teacherId,
    });

    if (session) {
      // Update existing session
      session.book = book; // Update book
      session.level = level; // Update level
      session.nextSteps = nextSteps;
      await session.save();
    } else {
      // Create new session with separate book and level fields
      session = new GuidedReadingSession({
        date,
        book, // Separate Book field
        level, // Separate Level field
        nextSteps,
        groupId,
        teacherId,
      });
      await session.save();
    }

    res.status(200).json({ message: "Session saved successfully.", session });
  } catch (err) {
    console.error("Error saving session:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @route   POST /guided-reading/activities
// @desc    Save activities and comments for students
// @access  Private
router.post("/activities", isAuthenticated, async (req, res) => {
  const activities = req.body;

  if (!Array.isArray(activities)) {
    return res.status(400).json({ error: "Invalid data format." });
  }

  try {
    const validatedActivities = [];

    for (const activityData of activities) {
      const { error, value } = activitySchema.validate(activityData);

      if (error) {
        return res
          .status(400)
          .json({ error: error.details.map((d) => d.message).join(", ") });
      }

      const { sessionId, studentId, activity, comments } = value;

      // Ensure session exists
      const session = await GuidedReadingSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found." });
      }

      // Ensure student exists
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found." });
      }

      // Check if activity already exists for this student and session
      let activityDoc = await GuidedReadingActivity.findOne({
        sessionId,
        studentId,
      });

      if (activityDoc) {
        // Update existing activity
        activityDoc.activity = activity;
        activityDoc.comments = comments;
        await activityDoc.save();
      } else {
        // Create new activity
        activityDoc = new GuidedReadingActivity({
          sessionId,
          studentId,
          activity,
          comments,
        });
        await activityDoc.save();
      }

      validatedActivities.push(activityDoc);
    }

    res.status(200).json({
      message: "Activities saved successfully.",
      data: validatedActivities,
    });
  } catch (err) {
    console.error("Error saving activities:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @route   GET /guided-reading/sessions
// @desc    Get guided reading sessions for a group and date
// @access  Private
router.get("/sessions", isAuthenticated, async (req, res) => {
  const { groupId, date } = req.query;

  if (!groupId || !date) {
    return res.status(400).json({ error: "groupId and date are required." });
  }

  try {
    // Parse the date string into a Date object
    const queryDate = new Date(date);
    queryDate.setUTCHours(0, 0, 0, 0);
    
    // Create end of day date
    const nextDay = new Date(queryDate);
    nextDay.setUTCHours(23, 59, 59, 999);
    
    // Find session for specific group and date range
    const session = await GuidedReadingSession.findOne({
      groupId,
      teacherId: req.user.id,
      date: {
        $gte: queryDate,
        $lt: nextDay
      }
    });

    if (!session) {
      return res.status(200).json({ session: null });
    }

    res.status(200).json({ session });
  } catch (err) {
    console.error("Error fetching session:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @route   GET /guided-reading/activities
// @desc    Get activities for a session
// @access  Private
router.get("/activities", isAuthenticated, async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required." });
  }

  try {
    const activities = await GuidedReadingActivity.find({ sessionId })
      .select("sessionId studentId activity comments createdAt updatedAt __v")
      .lean();

    res.status(200).json({ activities });
  } catch (err) {
    console.error("Error fetching activities:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @route   POST /guided-reading
// @desc    Save guided reading session and activities
// @access  Private
// @route   GET /guided-reading/activities
// @desc    Get activities for a session
// @access  Private
router.post("/guided-readings", isAuthenticated, async (req, res) => {
  const guidedReadings = req.body; // Array of guided reading activities

  try {
    const savedGuidedReadings = await GuidedReadingActivity.insertMany(
      guidedReadings
    );
    res.status(201).json({ guidedReadings: savedGuidedReadings });
  } catch (error) {
    console.error("Error saving guided readings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add this route to get next steps for guided reading
router.get('/next-steps', isAuthenticated, async (req, res) => {
  try {
    const { groupId, date, nextStepsType } = req.query;

    if (!groupId || !date || !nextStepsType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Query the NextSteps collection for the specific group, date, and type
    const nextSteps = await NextSteps.findOne({
      groupId,
      date,
      nextStepsType,
    });

    if (!nextSteps) {
      return res.json({ nextSteps: null });
    }

    // Return the next steps data including resources
    return res.json({
      nextSteps: {
        nextSteps: nextSteps.nextSteps,
        resources: nextSteps.resources,
      }
    });

  } catch (error) {
    console.error('Error fetching next steps:', error);
    return res.status(500).json({ error: 'Failed to fetch next steps' });
  }
});

module.exports = router;
