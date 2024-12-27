import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Teacher } from '../models/Teacher';
import { Standard } from '../models/Standard';

const router = express.Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, gradeLevel, teachingStandards } = req.body;

    // Check if teacher already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Find the standard and its associated test if provided
    let standardizedTests;
    if (teachingStandards) {
      const standard = await Standard.findById(teachingStandards);
      if (!standard) {
        return res.status(400).json({ message: 'Invalid teaching standard selected' });
      }
      standardizedTests = standard.standardizedTests;
    }

    // Create new teacher
    const teacher = new Teacher({
      email,
      password: hashedPassword,
      gradeLevel,
      ...(teachingStandards && { teachingStandards }),
      ...(standardizedTests && { standardizedTests })
    });

    await teacher.save();

    // Generate JWT token
    const token = jwt.sign(
      { teacherId: teacher._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Populate the teacher data before sending response
    const populatedTeacher = await Teacher.findById(teacher._id)
      .populate('teachingStandards')
      .populate('standardizedTests');

    res.status(201).json({
      message: 'Teacher registered successfully',
      token,
      teacher: populatedTeacher
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error registering teacher' });
  }
});

router.patch('/complete-profile', async (req: Request, res: Response) => {
  try {
    const { gradeLevel, teachingStandards } = req.body;
    const teacherId = req.user.id; // This will come from the auth middleware

    // Find the standard and its associated test if provided
    let standardizedTests;
    if (teachingStandards) {
      const standard = await Standard.findById(teachingStandards);
      if (!standard) {
        return res.status(400).json({ message: 'Invalid teaching standard selected' });
      }
      standardizedTests = standard.standardizedTests;
    }

    // Update teacher profile
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        gradeLevel,
        ...(teachingStandards && { teachingStandards }),
        ...(standardizedTests && { standardizedTests })
      },
      { new: true }
    ).populate('teachingStandards').populate('standardizedTests');

    if (!updatedTeacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      teacher: updatedTeacher
    });

  } catch (error) {
    console.error('Profile completion error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

export default router; 