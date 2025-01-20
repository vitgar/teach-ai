const router = require('express').Router();
const Assessment = require('../models/Assessment');
const { isAuthenticated } = require('../middleware/auth');

// Create a new assessment
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const assessment = new Assessment(req.body);
    const savedAssessment = await assessment.save();
    res.json(savedAssessment);
  } catch (err) {
    console.error('Error saving assessment:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all assessments for a teacher
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const assessments = await Assessment.find({ teacherId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(assessments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific assessment
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update an assessment
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    
    if (assessment.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this assessment' });
    }
    
    Object.assign(assessment, req.body);
    const updatedAssessment = await assessment.save();
    res.json(updatedAssessment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete an assessment
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    
    if (assessment.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this assessment' });
    }
    
    await assessment.deleteOne();
    res.json({ message: 'Assessment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 