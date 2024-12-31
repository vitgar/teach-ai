const app = require('./index');
const mongoose = require('mongoose');

// Initialize MongoDB connection pool
let isConnected = false;
let connectionPromise = null;

// Add error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  
  // List of errors we want to handle gracefully
  const ignoredErrors = ['ECONNRESET', 'EPIPE', 'ERR_STREAM_DESTROYED'];
  
  if (ignoredErrors.includes(err.code)) {
    console.log(`${err.code} error - ignoring`);
    return;
  }

  // For other errors, log and exit gracefully
  console.error('Fatal error - exiting process');
  process.exitCode = 1;
  
  // Give time for cleanup before exit
  setTimeout(() => {
    process.exit(1);
  }, 100);
});

// Add error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't exit process on unhandled rejections
});

// Add graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('SIGTERM received - cleaning up');
  if (mongoose.connection.readyState === 1) {
    mongoose.connection.close(false)
      .then(() => {
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      })
      .catch(err => {
        console.error('Error closing MongoDB connection:', err);
        process.exit(1);
      });
  } else {
    process.exit(0);
  }
});

const connectToDatabase = async () => {
  try {
    // If we have an existing connection promise, return it
    if (connectionPromise) {
      return connectionPromise;
    }

    // If already connected, return immediately
    if (isConnected && mongoose.connection.readyState === 1) {
      console.log('Using existing MongoDB connection');
      return Promise.resolve();
    }

    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_PROD_URI 
      : process.env.MONGODB_DEV_URI;

    console.log('Attempting MongoDB connection...');

    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      autoIndex: false,
      serverApi: process.env.NODE_ENV === 'production' ? { 
        version: '1',
        strict: true,
        deprecationErrors: true 
      } : undefined,
      // Modern connection settings
      family: 4, // Use IPv4
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      w: 'majority'
    };

    // Create a new connection promise with timeout
    connectionPromise = Promise.race([
      mongoose.connect(mongoURI, mongooseOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initial connection timeout')), 10000)
      )
    ])
    .then(() => {
      isConnected = true;
      console.log('=> Connected to MongoDB successfully');
      
      // Create indexes only in development
      if (process.env.NODE_ENV !== 'production') {
        return Promise.all([
          mongoose.model('Student').ensureIndexes(),
          mongoose.model('Teacher').ensureIndexes(),
          mongoose.model('Group').ensureIndexes(),
          mongoose.model('NextStep').ensureIndexes(),
          mongoose.model('Period').ensureIndexes(),
          mongoose.model('GroupType').ensureIndexes()
        ]).then(() => {
          console.log('Indexes created successfully');
        });
      }
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
  console.log('MongoDB connection established');
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

// Add connection timeout recovery
setInterval(() => {
  if (!isConnected && !connectionPromise) {
    console.log('Attempting to reconnect to MongoDB...');
    connectToDatabase().catch(err => {
      console.error('Reconnection attempt failed:', err);
    });
  }
}, 30000);

module.exports = async (req, res) => {
  let timeoutId;
  let isRequestHandled = false;
  
  try {
    // Set up cleanup function
    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      isRequestHandled = true;
    };

    // Add response listeners early
    res.on('finish', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);

    // Handle root route specially
    if (req.url === '/' || req.url === '') {
      cleanup();
      return res.json({
        name: 'TeachAssist API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    }

    // Handle static files and non-API/non-root routes
    if (req.url.includes('.') || (!req.url.startsWith('/api/') && !req.url.startsWith('/auth/'))) {
      if (req.url === '/favicon.ico' || req.url === '/favicon.png') {
        cleanup();
        return res.status(204).end();
      }
      
      // For other static files or unknown routes
      cleanup();
      return res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
      });
    }

    // Don't process preflight requests
    if (req.method === 'OPTIONS') {
      cleanup();
      return res.status(200).end();
    }

    // Set a timeout for the entire request
    const requestTimeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        if (!isRequestHandled) {
          reject(new Error('Request timeout'));
        }
      }, 9000);
    });

    try {
      // Connect to database with timeout
      await Promise.race([
        connectToDatabase(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout')), 5000)
        )
      ]);

      // Log incoming request for debugging
      console.log('Processing request:', {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        path: req.path,
        body: req.body
      });

      // Handle route mapping
      if (req.url.startsWith('/api/')) {
        // Keep the /api/ prefix for API routes
        req.url = req.url;
      } else if (req.url.startsWith('/auth/')) {
        // Keep the /auth/ prefix for auth routes
        req.url = req.url;
      }

      // Log the final route for debugging
      console.log('Final route:', {
        originalUrl: req.originalUrl,
        mappedUrl: req.url
      });

      // Call the Express app with error handling and timeout
      await Promise.race([
        new Promise((resolve, reject) => {
          const next = (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          };

          // Wrap the app call in try-catch
          try {
            app(req, res, next);
          } catch (err) {
            reject(err);
          }
        }),
        requestTimeout
      ]);

      // If we get here, the request was handled successfully
      if (!isRequestHandled) {
        cleanup();
      }
    } catch (error) {
      if (!isRequestHandled) {
        cleanup();
        console.error('Express error:', error);
        
        if (error.message === 'Request timeout') {
          if (!res.headersSent) {
            res.status(504).json({ 
              error: 'Gateway Timeout',
              message: 'The request took too long to process'
            });
          }
          return;
        }

        if (!res.headersSent) {
          res.status(500).json({ 
            error: 'Internal Server Error',
            message: error.message 
          });
        }
      }
    }
  } catch (error) {
    if (!isRequestHandled) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.error('Handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Internal Server Error',
          message: error.message 
        });
      }
    }
  }
}; 