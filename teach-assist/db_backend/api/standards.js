// routes/standards.js

const express = require('express');
const router = express.Router();
const Standard = require('../models/Standard');

// Get all standards
router.get('/', async (req, res) => {
  try {
    const standards = await Standard.find();
    res.json(standards);
  } catch (error) {
    console.error('Error fetching standards:', error);
    res.status(500).json({ message: 'Error fetching standards' });
  }
});

// Get standard by ID
router.get('/:id', async (req, res) => {
  try {
    const standard = await Standard.findById(req.params.id);
    if (!standard) {
      return res.status(404).json({ message: 'Standard not found' });
    }
    res.json(standard);
  } catch (error) {
    console.error('Error fetching standard:', error);
    res.status(500).json({ message: 'Error fetching standard' });
  }
});

module.exports = router;
