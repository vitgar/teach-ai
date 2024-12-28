// routes/groupTypes.js
const express = require("express");
const router = express.Router();
const GroupType = require("../models/GroupType");
const { isAuthenticated } = require("../middleware/auth");

// Get all group types
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const groupTypes = await GroupType.find();
    res.json(groupTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new group type
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Check if group type already exists
    const existingType = await GroupType.findOne({ name: name });
    if (existingType) {
      return res.json(existingType); // Return existing type if found
    }

    // Create new group type
    const groupType = new GroupType({ name });
    await groupType.save();
    res.status(201).json(groupType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
