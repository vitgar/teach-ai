const router = require('express').Router();
const AssessmentPassage = require('../models/AssessmentPassage');
const { isAuthenticated } = require('../middleware/auth');

// Create a new assessment passage
router.post('/', isAuthenticated, async (req, res) => {
  try {
    // Ensure passage is set for paired passages
    if (req.body.isPairedPassage && req.body.passages && req.body.passages.length === 2) {
      req.body.passage = `${req.body.passages[0].content}\n\n---\n\n${req.body.passages[1].content}`;
    }

    const assessmentPassage = new AssessmentPassage(req.body);
    const savedAssessmentPassage = await assessmentPassage.save();
    res.json(savedAssessmentPassage);
  } catch (err) {
    console.error('Error saving assessment passage:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get all assessment passages for a teacher
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const assessmentPassages = await AssessmentPassage.find({ teacherId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(assessmentPassages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a specific assessment passage
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const assessmentPassage = await AssessmentPassage.findById(req.params.id);
    if (!assessmentPassage) {
      return res.status(404).json({ message: 'Assessment passage not found' });
    }
    res.json(assessmentPassage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update an assessment passage
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const assessmentPassage = await AssessmentPassage.findById(req.params.id);
    if (!assessmentPassage) {
      return res.status(404).json({ message: 'Assessment passage not found' });
    }
    
    if (assessmentPassage.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this assessment passage' });
    }

    // Handle paired passage updates
    if (req.body.isPairedPassage && req.body.passages && req.body.passages.length === 2) {
      req.body.passage = `${req.body.passages[0].content}\n\n---\n\n${req.body.passages[1].content}`;
    }

    Object.assign(assessmentPassage, req.body);
    const updatedAssessmentPassage = await assessmentPassage.save();
    res.json(updatedAssessmentPassage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete an assessment passage
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const assessmentPassage = await AssessmentPassage.findById(req.params.id);
    if (!assessmentPassage) {
      return res.status(404).json({ message: 'Assessment passage not found' });
    }
    
    if (assessmentPassage.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this assessment passage' });
    }

    await assessmentPassage.deleteOne();
    res.json({ message: 'Assessment passage deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 