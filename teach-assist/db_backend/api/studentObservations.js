const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const StudentObservation = require("../models/StudentObservation");
const SmallGroupLessonPlan = require("../models/SmallGroupLessonPlan");

// @route   POST api/student-observations
// @desc    Save student observations
// @access  Private
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { observations, groupId, lessonPlanId, date } = req.body;

    // First get the lesson plan to access the story title
    const lessonPlan = await SmallGroupLessonPlan.findById(lessonPlanId);
    if (!lessonPlan) {
      return res.status(404).json({ error: "Lesson plan not found" });
    }

    // Process each observation
    const savedObservations = await Promise.all(
      observations.map(async (obs) => {
        const observation = new StudentObservation({
          teacher: req.user.id,
          student: obs.studentId,
          group: groupId,
          lessonPlan: lessonPlanId,
          observation: obs.observation,
          date: new Date(date),
          storyTitle: lessonPlan.story.title
        });
        return await observation.save();
      })
    );

    res.status(201).json({
      message: "Observations saved successfully",
      observations: savedObservations
    });
  } catch (error) {
    console.error("Error saving observations:", error);
    res.status(500).json({ error: "Failed to save observations" });
  }
});

// @route   GET api/student-observations
// @desc    Get student observations
// @access  Private
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { groupId, date } = req.query;
    console.log('Fetching observations with params:', { groupId, date });
    
    let query = { teacher: req.user.id };
    if (groupId) query.group = groupId;
    if (date) {
      // Convert the input date to UTC midnight
      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setUTCHours(23, 59, 59, 999);

      console.log('Date range:', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });

      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    console.log('MongoDB query:', JSON.stringify(query, null, 2));

    const observations = await StudentObservation.find(query)
      .sort({ date: -1, createdAt: -1 })
      .populate('student', 'firstName lastName')
      .populate({
        path: 'lessonPlan',
        populate: {
          path: 'standard',
          select: 'code description'
        }
      });

    console.log(`Found ${observations.length} observations`);
    if (observations.length > 0) {
      console.log('Sample observation:', {
        date: observations[0].date,
        studentId: observations[0].student?._id
      });
    }

    // Get unique lesson plans from observations
    const uniqueLessonPlans = observations.reduce((acc, obs) => {
      if (obs.lessonPlan && !acc.some(plan => plan._id.toString() === obs.lessonPlan._id.toString())) {
        acc.push(obs.lessonPlan);
      }
      return acc;
    }, []);

    const lessonPlanId = uniqueLessonPlans.length > 0 ? uniqueLessonPlans[0]._id : null;

    res.json({
      observations,
      lessonPlanId,
      lessonPlans: uniqueLessonPlans
    });
  } catch (error) {
    console.error("Error fetching observations:", error);
    console.error("Error details:", error.stack);
    res.status(500).json({ error: "Failed to fetch observations" });
  }
});

// @route   GET api/student-observations/history
// @desc    Get observation history for a group (excluding today)
// @access  Private
router.get("/history", isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.query;
    
    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    // Get today's date at midnight UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const observations = await StudentObservation.find({
      teacher: req.user.id,
      group: groupId,
      date: { $lt: today } // Only get observations before today
    })
    .sort({ date: -1, createdAt: -1 })
    .populate('student', 'firstName lastName')
    .populate('lessonPlan', 'standard');

    res.json({ observations });
  } catch (error) {
    console.error("Error fetching observation history:", error);
    res.status(500).json({ error: "Failed to fetch observation history" });
  }
});

module.exports = router; 