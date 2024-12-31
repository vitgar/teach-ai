const app = require('./index');
const mongoose = require('mongoose');

// Initialize MongoDB connection pool
let isConnected = false;
let connectionPromise = null;

const connectToDatabase = async () => {
  // If we have an existing connection promise, return it
  if (connectionPromise) {
    return connectionPromise;
  }

  // If already connected, return immediately
  if (isConnected && mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  try {
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_PROD_URI 
      : process.env.MONGODB_DEV_URI;

    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      keepAlive: true,
      keepAliveInitialDelay: 300000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverApi: process.env.NODE_ENV === 'production' ? { 
        version: '1',
        strict: true,
        deprecationErrors: true 
      } : undefined
    };

    // Create a new connection promise
    connectionPromise = mongoose.connect(mongoURI, mongooseOptions)
      .then(() => {
        isConnected = true;
        console.log('=> Connected to MongoDB');
      })
      .catch((error) => {
        isConnected = false;
        connectionPromise = null;
        console.error('MongoDB connection error:', error);
        throw error;
      });

    return connectionPromise;
  } catch (error) {
    isConnected = false;
    connectionPromise = null;
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Add connection event handlers
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
  isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  isConnected = false;
  connectionPromise = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  isConnected = false;
  connectionPromise = null;
});

module.exports = async (req, res) => {
  try {
    // Don't process preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Set a timeout for the entire request
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ 
          error: 'Timeout',
          message: 'Request took too long to process'
        });
      }
    }, 9000); // 9 seconds timeout

    try {
      // Connect to database with timeout
      await Promise.race([
        connectToDatabase(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 5000)
        )
      ]);

      // Log incoming request for debugging
      console.log('Incoming request:', {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        path: req.path,
        body: req.body
      });

      // Handle route mapping
      if (req.url.startsWith('/api/')) {
        req.url = req.url.replace('/api/', '/');
      } else if (req.url.startsWith('/auth/')) {
        req.url = req.url.replace('/auth/', '/auth/');
      }

      // Call the Express app with error handling
      await new Promise((resolve, reject) => {
        app(req, res, (err) => {
          if (err) reject(err);
          resolve();
        });
      });

      // Clear the timeout if everything completed successfully
      clearTimeout(timeout);
    } catch (error) {
      clearTimeout(timeout);
      console.error('Express error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal Server Error',
          message: error.message 
        });
      }
    }
  } catch (error) {
    console.error('Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: error.message 
      });
    }
  }
}; 