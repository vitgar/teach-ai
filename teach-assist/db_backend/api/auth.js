// routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { isAuthenticated } = require('../middleware/auth');
const Teacher = require('../models/Teacher');
const DetailedStandard = require('../models/DetailedStandard');
const passport = require('passport');
require('../config/passport-linkedin');
require('../config/passport-google');

// @route   POST /auth/signup
// @desc    Register a new teacher
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, gradeLevel, state } = req.body;

    // Check if teacher already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password for security
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new teacher with additional information
    const teacher = new Teacher({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      gradeLevel,
      state,
      teachingStandards: []
    });

    await teacher.save();

    // Generate JWT token
    const token = jwt.sign(
      { teacherId: teacher._id.toString() },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Teacher registered successfully',
      token,
      teacher
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error registering teacher' });
  }
});

// @route   PATCH /auth/complete-profile/:teacherId
// @desc    Complete teacher profile
// @access  Private
router.patch('/complete-profile/:teacherId', isAuthenticated, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { firstName, lastName, gradeLevel, teachingStandards } = req.body;

    // Debug logging
    console.log('Request user:', req.user);
    console.log('Teacher ID from params:', teacherId);

    // Compare teacherId from token with params
    if (req.user.teacherId !== teacherId) {
      return res.status(403).json({ 
        message: 'Unauthorized to update this profile',
        tokenTeacherId: req.user.teacherId,
        requestedTeacherId: teacherId
      });
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        firstName,
        lastName,
        gradeLevel,
        teachingStandards,
      },
      { new: true }
    ).populate('teachingStandards');

    if (!updatedTeacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.json(updatedTeacher);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// LinkedIn OAuth routes
router.get('/linkedin',
  (req, res, next) => {
    console.log('Starting LinkedIn OAuth...');
    console.log('Session:', req.session);
    passport.authenticate('linkedin', {
      scope: ['openid', 'profile', 'email'],
      state: true
    })(req, res, next);
  }
);

router.get('/linkedin/callback', 
  (req, res, next) => {
    console.log('LinkedIn callback received');
    
    passport.authenticate('linkedin', {
      failureRedirect: 'http://localhost:3000/login?error=auth_failed',
      session: true
    })(req, res, next);
  },
  async function(req, res) {
    try {
      console.log('LinkedIn auth successful');
      console.log('User:', req.user);
      
      // Generate JWT token - Make consistent with other routes
      const token = jwt.sign(
        { teacherId: req.user._id.toString() }, // Convert to string to ensure consistency
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Set the token in a cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Redirect with token
      const redirectUrl = new URL('http://localhost:3000/auth/linkedin/callback');
      redirectUrl.searchParams.append('token', token);
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('LinkedIn callback processing error:', error);
      res.redirect('http://localhost:3000/login?error=auth_failed');
    }
  }
);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:3000/login?error=auth_failed',
    session: true
  }),
  async function(req, res) {
    try {
      console.log('Google auth successful');
      console.log('User:', req.user);
      
      const token = jwt.sign(
        { teacherId: req.user._id.toString() },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      console.log('Generated token for redirect');
      const redirectUrl = `http://localhost:3000/auth/callback?token=${encodeURIComponent(token)}`;
      console.log('Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback processing error:', error);
      res.redirect('http://localhost:3000/login?error=auth_failed');
    }
  }
);

// @route   GET /auth/verify
// @desc    Verify token and return teacher data
// @access  Private
router.get('/verify', isAuthenticated, async (req, res) => {
  try {
    // Use teacherId from the decoded token and populate all necessary fields
    const teacher = await Teacher.findById(req.user.teacherId)
      .populate('teachingStandards')
      .select('-password'); // Exclude password field
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    console.log('Verified teacher:', teacher); // Add logging to debug
    res.json({ teacher });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /auth/login
// @desc    Login teacher
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find teacher by email and populate teaching standards
    const teacher = await Teacher.findOne({ email })
      .populate('teachingStandards')
      .select('+password'); // Include password field for verification

    if (!teacher) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if this is a LinkedIn user
    if (!teacher.password) {
      return res.status(401).json({ 
        message: 'Please login with LinkedIn for this account' 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Remove password from response
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    // Generate JWT token
    const token = jwt.sign(
      { teacherId: teacher._id.toString() },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      teacher: teacherResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
