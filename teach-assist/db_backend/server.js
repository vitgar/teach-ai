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
const authRoutes = require("./routes/auth");
const lessonPlanRoutes = require("./routes/lessonPlans");
const interventionRoutes = require("./routes/interventions");
const teacherRoutes = require("./routes/teachers");
const studentRoutes = require("./routes/students");
const periodRoutes = require("./routes/periods");
const groupRoutes = require("./routes/groups");
const groupTypeRoutes = require("./routes/groupTypes");
const guidedReadingRoutes = require("./routes/guidedReading");
const nextStepsRoutes = require("./routes/nextSteps");
// const openaiRoutes = require('./routes/generateWarmup');
const smallGroupLessonPlanRoutes = require('./routes/smallGroupLessonPlans');
const studentObservationsRoutes = require('./routes/studentObservations');
const detailedStandardRoutes = require('./routes/detailedstandard');

const Passage = require('./models/Passage');

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
app.use("/auth", authRoutes); // Auth routes (login, signup, LinkedIn)
app.use('/api/standards', require('./routes/standards')); // Public standards endpoint

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
  { path: '/api/passages', router: require('./routes/passages') },
  { path: "/api/detailedstandards", router: detailedStandardRoutes }
];

// Apply authentication middleware to protected routes
protectedRoutes.forEach(({ path, router }) => {
  console.log('Registering protected route:', path);
  app.use(path, router);
});

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/teacherDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("strictQuery", false);

// Connection Confirmation
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

// Remove or comment out the static file serving if not needed
// app.use(express.static(path.join(__dirname, "client/build")));

// Remove or comment out the catch-all route
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "client/build", "index.html"));
// });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/group-types", groupTypeRoutes);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/standards', require('./routes/standards'));
app.use('/api/detailedstandards', require('./routes/detailedstandard'));
app.use('/api/passages', require('./routes/passages'));
app.use('/api/small-group-lesson-plans', require('./routes/lessonPlans'));
app.use('/api/feedback', require('./routes/feedback'));

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
