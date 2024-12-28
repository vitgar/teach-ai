// routes/students.js
const express = require("express");
const router = express.Router();
const Joi = require("joi");
const mongoose = require("mongoose");

// Import Models
const Student = require("../models/Student");
const Group = require("../models/Group");

// Import Authentication Middleware
const { isAuthenticated } = require("../middleware/auth");

// Validation Schema for Student
const studentSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  studentId: Joi.string().required(),
  gradeLevel: Joi.string().required(),
  readingLevel: Joi.string().required(),
  teacherId: Joi.string().required(),
  periodId: Joi.string().allow('', null).optional(),
  groupIds: Joi.array().items(Joi.string()).optional(),
}).unknown(true);

// Create a new Student
router.post("/", isAuthenticated, async function(req, res) {
  try {
    const { error, value } = studentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: error.details.map((d) => d.message).join(", ") 
      });
    }

    const student = new Student(value);
    await student.save();

    res.status(201).json({
      message: "Student created successfully.",
      student: student
    });
  } catch (err) {
    console.error("Error creating student:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Retrieve all Students
router.get("/", isAuthenticated, async function(req, res) {
  try {
    const { teacherId } = req.query;
    
    // If teacherId is provided, filter by it
    const query = teacherId ? { teacherId } : {};
    
    const students = await Student.find(query);
    res.json(students);
  } catch (err) {
    console.error("Error fetching students:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Retrieve a single Student by ID
router.get("/:id", isAuthenticated, async function(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Student ID." });
  }

  try {
    const student = await Student.findById(id).lean();
    if (!student) {
      return res.status(404).json({ error: "Student not found." });
    }
    res.status(200).json(student);
  } catch (err) {
    console.error("Error fetching student:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Update a Student
router.put("/:id", isAuthenticated, async function(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Student ID." });
  }

  const { error, value } = studentSchema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ error: error.details.map((d) => d.message).join(", ") });
  }

  try {
    const updatedStudent = await Student.findByIdAndUpdate(id, value, {
      new: true,
    });
    if (!updatedStudent) {
      return res.status(404).json({ error: "Student not found." });
    }
    res.status(200).json({
      message: "Student updated successfully.",
      student: updatedStudent,
    });
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Delete a Student
router.delete("/:id", isAuthenticated, async function(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Student ID." });
  }

  try {
    const deletedStudent = await Student.findByIdAndDelete(id);
    if (!deletedStudent) {
      return res.status(404).json({ error: "Student not found." });
    }

    // Remove student from any groups
    await Group.updateMany(
      { students: deletedStudent._id },
      { $pull: { students: deletedStudent._id } }
    );

    res.status(200).json({ message: "Student deleted successfully." });
  } catch (err) {
    console.error("Error deleting student:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// @route   POST /students/bulk-create
// @desc    Create multiple students
// @access  Private
router.post('/bulk-create', async (req, res) => {
  try {
    const { students } = req.body;

    // Convert teacherId strings to ObjectIds and ensure unique studentIds
    const studentsToCreate = students.map(student => {
      const timestamp = Date.now().toString();
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return {
        ...student,
        teacherId: new mongoose.Types.ObjectId(student.teacherId),
        // Generate a unique studentId using firstName, lastName, timestamp, and random number
        studentId: `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}.${timestamp}.${randomNum}`
      };
    });

    // Use insertMany with ordered: false to continue even if some inserts fail
    const createdStudents = await Student.insertMany(studentsToCreate, { 
      ordered: false,
      // Return any write errors
      rawResult: true
    });

    res.status(201).json({
      message: 'Students created successfully',
      count: createdStudents.insertedCount,
      students: createdStudents.ops
    });
  } catch (error) {
    console.error('Error creating students:', error);
    
    // Handle duplicate key errors specifically
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Duplicate student IDs found',
        details: 'Some students could not be added due to duplicate IDs. Please try again.',
        duplicates: error.writeErrors?.map(e => e.err.op.studentId) || []
      });
    }

    res.status(500).json({
      error: 'Error creating students',
      details: error.toString()
    });
  }
});

// Add this route to handle bulk deletes
router.post('/bulk-delete', isAuthenticated, async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ error: 'studentIds must be an array' });
    }

    // Delete the students
    await Student.deleteMany({ _id: { $in: studentIds } });

    // Remove students from any groups they're in
    await Group.updateMany(
      { students: { $in: studentIds } },
      { $pull: { students: { $in: studentIds } } }
    );

    res.json({ message: 'Students deleted successfully' });
  } catch (error) {
    console.error('Error deleting students:', error);
    res.status(500).json({ error: 'Error deleting students' });
  }
});

module.exports = router;
