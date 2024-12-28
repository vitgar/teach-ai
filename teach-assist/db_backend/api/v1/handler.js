const app = require('./index');

module.exports = async (req, res) => {
  // Don't process preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
}; 