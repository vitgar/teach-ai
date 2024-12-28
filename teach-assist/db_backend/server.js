// server.js

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Import Middleware
const { isAuthenticated } = require("./middleware/auth");

// Import all models
require("./models");
console.log("Node Environment:", process.env.NODE_ENV);

// Import Routes
const authRoutes = require("./api/auth");
const lessonPlanRoutes = require("./api/lessonPlans");
const interventionRoutes = require("./api/interventions");
const teacherRoutes = require("./api/teachers");
const studentRoutes = require("./api/students");
const periodRoutes = require("./api/periods");
const groupRoutes = require("./api/groups");
const groupTypeRoutes = require("./api/groupTypes");
const guidedReadingRoutes = require("./api/guidedReading");
const nextStepsRoutes = require("./api/nextSteps");
const smallGroupLessonPlanRoutes = require('./api/smallGroupLessonPlans');
const studentObservationsRoutes = require('./api/studentObservations');
const detailedStandardRoutes = require('./api/detailedstandard');
const standardsRoutes = require('./api/standards');
const passagesRoutes = require('./api/passages');
const feedbackRoutes = require('./api/feedback');

const app = express();

// Global Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Public Routes (no authentication required)
app.use("/auth", authRoutes);
app.use('/api/standards', standardsRoutes);

// Protected Routes (authentication required)
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

// MongoDB connection
const mongoURI = process.env.NODE_ENV === 'production' 
  ? process.env.MONGODB_PROD_URI 
  : process.env.MONGODB_DEV_URI;

console.log(`Connecting to MongoDB in ${process.env.NODE_ENV || 'development'} mode`);

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: process.env.NODE_ENV === 'production' ? { 
    version: '1',
    strict: true,
    deprecationErrors: true 
  } : undefined
};

mongoose.connect(mongoURI, mongooseOptions);
mongoose.set("strictQuery", false);

// Connection Confirmation
const connection = mongoose.connection;
connection.once("open", () => {
  console.log(`MongoDB database connection established successfully on ${process.env.NODE_ENV || 'development'}`);
});

connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
