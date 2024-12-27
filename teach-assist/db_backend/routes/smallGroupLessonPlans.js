const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middleware/auth");
const SmallGroupLessonPlan = require("../models/SmallGroupLessonPlan");
const StudentObservation = require("../models/StudentObservation");

// @route   POST api/small-group-lesson-plans
// @desc    Save or update a small group lesson plan
// @access  Private
router.post("/", isAuthenticated, async function(req, res) {
  try {
    const {
      _id,
      groups,
      standard,
      lexileLevel,
      story,
      sections
    } = req.body;

    if (_id) {
      // Update existing lesson plan
      const updatedLessonPlan = await SmallGroupLessonPlan.findOneAndUpdate(
        { _id, teacher: req.user.id },
        {
          groups,
          standard,
          lexileLevel,
          story,
          sections
        },
        { new: true }
      );

      if (!updatedLessonPlan) {
        return res.status(404).json({ error: "Lesson plan not found or unauthorized" });
      }

      return res.json({
        message: "Lesson plan updated successfully",
        lessonPlanId: updatedLessonPlan._id
      });
    }

    // Create new lesson plan
    const lessonPlan = new SmallGroupLessonPlan({
      teacher: req.user.id,
      groups,
      standard,
      lexileLevel,
      story,
      sections
    });

    await lessonPlan.save();

    res.status(201).json({
      message: "Lesson plan saved successfully",
      lessonPlanId: lessonPlan._id
    });

  } catch (error) {
    console.error("Error saving/updating lesson plan:", error);
    res.status(500).json({ error: "Failed to save/update lesson plan" });
  }
});

// @route   GET api/small-group-lesson-plans
// @desc    Fetch small group lesson plans
// @access  Private
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.query;
    console.log('Fetching lesson plans with params:', { groupId, teacherId: req.user.id });
    
    // Get today's date at midnight UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get all observations before today to check for previously used stories
    const previousObservations = await StudentObservation.find({
      teacher: req.user.id,
      group: groupId,
      date: { $lt: today }
    });

    // Get story titles that were used before today
    const usedStories = new Set(
      previousObservations
        .filter(obs => obs.storyTitle)
        .map(obs => obs.storyTitle)
    );

    // Get all lesson plans
    let query = { teacher: req.user.id };
    if (groupId) {
      query.groups = groupId;
    }

    const allLessonPlans = await SmallGroupLessonPlan.find(query)
      .sort({ createdAt: -1 });

    // Filter out lessons with stories used before today
    const availableLessonPlans = allLessonPlans.filter(plan => 
      !usedStories.has(plan.story.title)
    );

    console.log(`Found ${availableLessonPlans.length} available lesson plans out of ${allLessonPlans.length} total`);
    
    res.json(availableLessonPlans);
  } catch (error) {
    console.error("Error fetching lesson plans:", error);
    res.status(500).json({ error: "Failed to fetch lesson plans" });
  }
});

// @route   DELETE api/small-group-lesson-plans/:id
// @desc    Delete a small group lesson plan
// @access  Private
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const lessonPlan = await SmallGroupLessonPlan.findOneAndDelete({
      _id: req.params.id,
      teacher: req.user.id // Ensure the teacher owns this lesson plan
    });

    if (!lessonPlan) {
      return res.status(404).json({ error: "Lesson plan not found or unauthorized" });
    }

    res.json({ message: "Lesson plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson plan:", error);
    res.status(500).json({ error: "Failed to delete lesson plan" });
  }
});

module.exports = router; 