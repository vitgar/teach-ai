// routes/standards.js

const express = require('express');
const router = express.Router();
const Standard = require('../models/Standard');

// Get all standards
router.get('/', async (req, res) => {
  try {
    console.log('Fetching standards...');
    
    // Add timeout to the query
    const standards = await Standard.find()
      .lean()  // Convert to plain JS objects (faster)
      .maxTimeMS(5000)  // 5 second timeout
      .exec();
    
    console.log(`Found ${standards.length} standards`);
    res.json(standards);
  } catch (error) {
    console.error('Error fetching standards:', error);
    
    if (error.name === 'MongooseError' && error.message.includes('maxTimeMS')) {
      return res.status(504).json({ 
        error: 'Query timeout',
        message: 'The request took too long to process. Please try again.'
      });
    }
    
    res.status(500).json({ 
      error: 'Error fetching standards',
      message: error.message
    });
  }
});

// Get standard by ID
router.get('/:id', async (req, res) => {
  try {
    console.log('Fetching standard by ID:', req.params.id);
    
    const standard = await Standard.findById(req.params.id)
      .lean()
      .maxTimeMS(5000)
      .exec();
      
    if (!standard) {
      return res.status(404).json({ message: 'Standard not found' });
    }
    
    console.log('Found standard:', standard._id);
    res.json(standard);
  } catch (error) {
    console.error('Error fetching standard:', error);
    
    if (error.name === 'MongooseError' && error.message.includes('maxTimeMS')) {
      return res.status(504).json({ 
        error: 'Query timeout',
        message: 'The request took too long to process. Please try again.'
      });
    }
    
    res.status(500).json({ 
      error: 'Error fetching standard',
      message: error.message
    });
  }
});

module.exports = router;
