const app = require('./index');

module.exports = (req, res) => {
  // Don't process preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return app(req, res);
}; 