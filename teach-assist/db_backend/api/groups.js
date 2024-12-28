// routes/groups.js

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Joi = require("joi");
const mongoose = require("mongoose");

// Import Models
const Group = require("../models/Group");
const Student = require("../models/Student");

// Validation Schema for Group
const groupSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow("").optional(),
  type: Joi.string().required(),
  students: Joi.array().items(Joi.string().length(24)).optional(),
});

// Utility Function to Validate Student IDs
const validateStudentIds = async (studentIds) => {
  if (!studentIds || studentIds.length === 0) return true;

  const validStudents = await Student.find({ _id: { $in: studentIds } });
  return validStudents.length === studentIds.length;
};

// Create a new Group
router.post("/", isAuthenticated, async (req, res) => {
  const { error, value } = groupSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((d) => d.message).join(", ") });
  }

  try {
    // Log the authenticated user ID
    console.log("Authenticated user ID:", req.user.id);

    // Validate Student IDs
    if (value.students && value.students.length > 0) {
      const isValid = await validateStudentIds(value.students);
      if (!isValid) {
        return res
          .status(400)
          .json({ error: "One or more student IDs are invalid." });
      }
    }

    // Convert teacherId to ObjectId using 'new'
    const teacherObjectId = new mongoose.Types.ObjectId(req.user.id);
    console.log("Assigned teacherObjectId:", teacherObjectId);

    const groupData = {
      ...value,
      teacherId: teacherObjectId,
    };
    const group = new Group(groupData);
    await group.save();

    // If students are provided, add groupId to each student
    if (value.students && value.students.length > 0) {
      await Student.updateMany(
        { _id: { $in: value.students } },
        { $addToSet: { groups: group._id } }
      );
    }

    res.status(201).json(group);
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Retrieve all Groups for the authenticated teacher with optional filtering
router.get('/', isAuthenticated, async (req, res) => {
  try {
    if (!req.user || (!req.user.id && !req.user.teacherId)) {
      return res.status(401).json({ error: "Unauthorized. User information missing." });
    }

    const { type } = req.query;
    const teacherId = req.user.id || req.user.teacherId;
    
    console.log('Fetching groups with query:', { teacherId, type });
    
    const query = { teacherId };
    if (type) {
      query.type = type;
    }

    const groups = await Group.find(query)
      .populate('students')
      .sort({ createdAt: -1 });

    console.log(`Found ${groups.length} groups`);
    
    // Return empty array instead of empty object if no groups found
    res.json(groups); // Changed from { groups } to groups
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Retrieve a single Group by ID
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Group ID." });
    }

    const group = await Group.findById(id).populate("students");
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    // Ensure the group belongs to the authenticated teacher
    if (group.teacherId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized access to this group." });
    }
    res.json(group);
  } catch (err) {
    console.error("Error fetching group:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Update Group
router.put("/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { name, description, type } = req.body;

  try {
    // Find the group
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Optional: Check if the teacher owns the group
    if (group.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: Not your group" });
    }

    // Update fields
    group.name = name;
    group.description = description;
    group.type = type;

    // Save updated group
    const updatedGroup = await group.save();

    res.json(updatedGroup);
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a Group
router.delete("/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;

  // Validate the Group ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Group ID." });
  }

  try {
    // Find the group by ID
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Check if the authenticated user is the teacher of the group
    if (group.teacherId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this group." });
    }

    // Remove group from students' groups arrays
    await Student.updateMany(
      { groups: group._id },
      { $pull: { groups: group._id } }
    );

    // Delete the group using findByIdAndDelete
    await Group.findByIdAndDelete(id);

    res.status(200).json({ message: "Group deleted successfully." });
  } catch (err) {
    console.error("Error deleting group:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /groups/:id/assign-students
router.post("/:id/assign-students", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { studentIds } = req.body;

  // Validate the Group ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Group ID." });
  }

  try {
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // Check if the authenticated user is the teacher of the group
    if (group.teacherId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized to modify this group." });
    }

    // Validate Student IDs
    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ error: "Invalid student IDs." });
    }

    // Remove the group from all students first to prevent duplicates
    await Student.updateMany(
      { groups: group._id },
      { $pull: { groups: group._id } }
    );

    if (studentIds.length > 0) {
      // Validate that all student IDs exist
      const validStudents = await Student.find({
        _id: { $in: studentIds },
      }).select("_id");
      if (validStudents.length !== studentIds.length) {
        return res
          .status(400)
          .json({ error: "One or more student IDs are invalid." });
      }

      // Add the group to the selected students
      await Student.updateMany(
        { _id: { $in: studentIds } },
        { $addToSet: { groups: group._id } }
      );

      // Update the group's students array
      group.students = studentIds;
      await group.save();
    } else {
      // If studentIds is empty, clear the group's students array
      group.students = [];
      await group.save();
    }

    res.status(200).json({ message: "Group Students updated successfully." });
  } catch (err) {
    console.error("Error assigning students:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
