const app = require('./index');
const mongoose = require('mongoose');

// Initialize MongoDB connection pool
let isConnected = false;
const connectToDatabase = async () => {
  if (isConnected) {
    console.log('=> Using existing database connection');
    return;
  }

  try {
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_PROD_URI 
      : process.env.MONGODB_DEV_URI;

    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    await mongoose.connect(mongoURI, mongooseOptions);
    isConnected = true;
    console.log('=> Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

module.exports = async (req, res) => {
  try {
    // Don't process preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Connect to database
    await connectToDatabase();

    // Handle both /api and non-/api routes
    if (req.url.startsWith('/api/')) {
      // Remove the /api prefix for internal routing
      req.url = req.url.replace('/api/', '/');
    }

    // Log incoming request for debugging
    console.log('Incoming request:', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      body: req.body
    });

    return app(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
}; 