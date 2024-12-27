// middleware/auth.js

const jwt = require('jsonwebtoken');

// List of paths that don't require authentication
const publicPaths = [
  '/auth/login',
  '/auth/signup',
  '/auth/linkedin',
  '/auth/linkedin/callback',
  '/api/standards'
];

const isAuthenticated = (req, res, next) => {
  // Skip authentication for public paths
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;
    
    if (!token) {
      console.log('No token found');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Set both id and teacherId for compatibility
    req.user = {
      id: verified.teacherId,
      teacherId: verified.teacherId
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication error' });
  }
};

module.exports = {
  isAuthenticated
};
