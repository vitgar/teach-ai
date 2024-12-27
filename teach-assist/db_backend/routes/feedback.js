const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { isAuthenticated } = require('../middleware/auth');

// @route   POST /api/feedback
// @desc    Submit user feedback
// @access  Private
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { page, rating, comment, timestamp } = req.body;
    
    const feedback = new Feedback({
      page,
      rating,
      comment,
      timestamp,
      teacherId: req.user.id
    });

    await feedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Error submitting feedback' });
  }
});

module.exports = router; 