require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

// Import Middleware
const { isAuthenticated } = require("../../middleware/auth");

// Import all models
require("../../models");

// Import Routes
const authRoutes = require("../auth");
const lessonPlanRoutes = require("../lessonPlans");
const interventionRoutes = require("../interventions");
const teacherRoutes = require("../teachers");
const studentRoutes = require("../students");
const periodRoutes = require("../periods");
const groupRoutes = require("../groups");
const groupTypeRoutes = require("../groupTypes");
const guidedReadingRoutes = require("../guidedReading");
const nextStepsRoutes = require("../nextSteps");
const smallGroupLessonPlanRoutes = require('../smallGroupLessonPlans');
const studentObservationsRoutes = require('../studentObservations');
const detailedStandardRoutes = require('../detailedstandard');
const standardsRoutes = require('../standards');
const passagesRoutes = require('../passages');
const feedbackRoutes = require('../feedback');

const app = express();

// Global Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://teach-assist.vercel.app', 'https://teach-assist-git-main-vitgars.vercel.app'] 
    : 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Only use session middleware for auth routes
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_PROD_URI 
      : process.env.MONGODB_DEV_URI,
    ttl: 24 * 60 * 60, // 1 day
    autoRemove: 'native',
    touchAfter: 24 * 3600 // time period in seconds
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

// Add request timeout middleware
app.use((req, res, next) => {
  // Set a timeout for all requests
  req.setTimeout(8000); // 8 seconds
  res.setTimeout(8000);
  
  // Add a timeout handler
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Timeout',
        message: 'Request took too long to process'
      });
    }
  }, 8000);
  
  // Clear timeout when response is sent
  res.on('finish', () => clearTimeout(timeout));
  next();
});

// Passport initialization (only for auth routes)
app.use('/auth', [sessionMiddleware, passport.initialize(), passport.session()]);

mongoose.set("strictQuery", false);

// API Info
const apiInfo = {
  name: 'TeachAssist API',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  status: 'healthy',
  timestamp: new Date().toISOString(),
  endpoints: {
    auth: '/auth',
    standards: '/api/standards',
    lessonPlans: '/api/lesson-plans',
    interventions: '/api/interventions',
    teachers: '/api/teachers',
    students: '/api/students',
    periods: '/api/periods',
    groups: '/api/groups',
    groupTypes: '/api/group-types',
    guidedReading: '/api/guided-reading',
    nextSteps: '/api/next-steps',
    smallGroupLessonPlans: '/api/small-group-lesson-plans',
    studentObservations: '/api/student-observations',
    passages: '/api/passages',
    detailedStandards: '/api/detailedstandards',
    feedback: '/api/feedback'
  }
};

// Root routes
app.get('/', (req, res) => {
  res.json({
    ...apiInfo,
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({
    ...apiInfo,
    timestamp: new Date().toISOString()
  });
});

// Public Routes
app.use("/auth", authRoutes);
app.use('/api/standards', standardsRoutes);

// Protected Routes
const protectedRoutes = [
  { path: "/api/lesson-plans", router: lessonPlanRoutes },
  { path: "/api/interventions", router: interventionRoutes },
  { path: "/api/teachers", router: teacherRoutes },
  { path: "/api/students", router: studentRoutes },
  { path: "/api/periods", router: periodRoutes },
  { path: "/api/groups", router: groupRoutes },
  { path: "/api/group-types", router: groupTypeRoutes },
  { path: "/api/guided-reading", router: guidedReadingRoutes },
  { path: "/api/next-steps", router: nextStepsRoutes },
  { path: '/api/small-group-lesson-plans', router: smallGroupLessonPlanRoutes },
  { path: '/api/student-observations', router: studentObservationsRoutes },
  { path: '/api/passages', router: passagesRoutes },
  { path: "/api/detailedstandards", router: detailedStandardRoutes },
  { path: '/api/feedback', router: feedbackRoutes }
];

// Apply authentication middleware to protected routes
protectedRoutes.forEach(({ path, router }) => {
  console.log('Registering protected route:', path);
  app.use(path, router);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Export the Express API
module.exports = app; 