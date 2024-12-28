const express = require('express');
const router = express.Router();
const Passage = require('../models/Passage');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all routes in this router
router.use(isAuthenticated);

// @route   POST /passages
// @desc    Save a generated passage
// @access  Private
router.post('/', async (req, res) => {
  try {
    const {
      teacherId,
      title,
      passage,
      genre,
      lexileLevel,
      isAIGenerated,
      includeAnswerKey,
      answerKey,
      questions
    } = req.body;

    // Verify the authenticated user matches the teacherId
    if (req.user.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized: Teacher ID mismatch' });
    }

    const newPassage = new Passage({
      teacherId,
      title,
      passage,
      genre,
      lexileLevel,
      isAIGenerated,
      includeAnswerKey,
      answerKey,
      questions,
      dateCreated: new Date()
    });

    await newPassage.save();
    res.status(201).json(newPassage);
  } catch (error) {
    console.error('Error saving passage:', error);
    res.status(500).json({ error: 'Failed to save passage' });
  }
});

// @route   GET /passages
// @desc    Get all passages for a teacher
// @access  Private
router.get('/', async (req, res) => {
  try {
    const passages = await Passage.find({ teacherId: req.user.id })
      .sort({ dateCreated: -1 });
    res.json(passages);
  } catch (error) {
    console.error('Error fetching passages:', error);
    res.status(500).json({ error: 'Error fetching passages' });
  }
});

// @route   GET /passages/:id
// @desc    Get a specific passage
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const passage = await Passage.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!passage) {
      return res.status(404).json({ error: 'Passage not found' });
    }

    res.json(passage);
  } catch (error) {
    console.error('Error fetching passage:', error);
    res.status(500).json({ error: 'Error fetching passage' });
  }
});

// @route   DELETE /passages/:id
// @desc    Delete a passage
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const passage = await Passage.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!passage) {
      return res.status(404).json({ error: 'Passage not found' });
    }

    res.json({ message: 'Passage deleted successfully' });
  } catch (error) {
    console.error('Error deleting passage:', error);
    res.status(500).json({ error: 'Error deleting passage' });
  }
});

module.exports = router; 