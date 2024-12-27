// routes/nextSteps.js

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { isAuthenticated } = require("../middleware/auth");
const NextSteps = require("../models/NextSteps");
const Joi = require("joi");

// Add validation schema
const nextStepsSchema = Joi.object({
  nextSteps: Joi.string().required(),
  resources: Joi.array().items(Joi.object({
    type: Joi.string(),
    title: Joi.string(),
    content: Joi.string(),
    metadata: Joi.object({
      instructions: Joi.string(),
      grade_level: Joi.string(),
      subject: Joi.string()
    })
  })),
  groupId: Joi.string().required(),
  date: Joi.date().iso().required(),
  nextStepsType: Joi.string().required(),
  teacherId: Joi.string().required(),
  book: Joi.string().allow('', null)
});

// Add validation function
const validateNextSteps = (data) => {
  return nextStepsSchema.validate(data);
};

// @route   GET /next-steps
// @desc    Get next steps for a specific group, date, and type
// @access  Private
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { groupId, date, nextStepsType } = req.query;

    if (!groupId || !date || !nextStepsType) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Convert date string to Date object for MongoDB query
    const queryDate = new Date(date);
    
    // Set time to start of day
    queryDate.setUTCHours(0, 0, 0, 0);
    
    // Create end of day date
    const nextDay = new Date(queryDate);
    nextDay.setUTCHours(23, 59, 59, 999);

    console.log('Querying NextSteps with:', {
      groupId,
      dateRange: { start: queryDate, end: nextDay },
      nextStepsType,
      teacherId: req.user.id
    });

    // Query the NextSteps collection for the specific group, date range, and type
    const nextSteps = await NextSteps.findOne({
      groupId,
      date: {
        $gte: queryDate,
        $lte: nextDay
      },
      nextStepsType,
      teacherId: req.user.id
    }).lean(); // Use lean() for better performance

    console.log('Found NextSteps:', nextSteps); // Debug log

    if (!nextSteps) {
      return res.json({ nextSteps: null });
    }

    // Convert string resources to array if needed
    let resourcesArray = nextSteps.resources;
    if (typeof nextSteps.resources === 'string') {
      resourcesArray = [{
        type: 'worksheet',
        title: 'Guided Reading Resource',
        content: nextSteps.resources,
        metadata: {
          instructions: 'Complete the following activity',
          grade_level: 'Elementary',
          subject: 'Reading'
        }
      }];
    }

    // Return the next steps data including resources
    return res.json({
      nextSteps: {
        _id: nextSteps._id,
        nextSteps: nextSteps.nextSteps,
        resources: resourcesArray,
        date: nextSteps.date,
        groupId: nextSteps.groupId,
        teacherId: nextSteps.teacherId,
        book: nextSteps.book,
        createdAt: nextSteps.createdAt,
        updatedAt: nextSteps.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching next steps:', error);
    return res.status(500).json({ error: 'Failed to fetch next steps' });
  }
});

// @route   POST /next-steps
// @desc    Save next steps to the database
// @access  Private
router.post("/", isAuthenticated, async (req, res) => {
  const { nextSteps, resources, groupId, date, nextStepsType, teacherId } = req.body;

  // Validate the request body
  const { error } = validateNextSteps(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    // Create a new NextSteps document
    const newNextSteps = new NextSteps(req.body);

    // Save the document
    await newNextSteps.save();
    res.status(201).json({ nextStepsId: newNextSteps._id });
  } catch (err) {
    console.error('Error saving next steps:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
