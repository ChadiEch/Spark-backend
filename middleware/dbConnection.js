// Database connection middleware
const Logger = require('../utils/logger');

const logger = new Logger('db-connection');

// Database connection check middleware
// Ensures database-dependent routes only process requests when database is available
const checkDBConnection = (req, res, next) => {
  // Access the dbConnected variable from the app locals
  const dbConnected = req.app.get('dbConnected');
  
  // For debugging
  console.log('DB Connected status:', dbConnected);
  
  if (!dbConnected) {
    logger.warn('Database not connected - rejecting request', {
      url: req.url,
      method: req.method
    });
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable - Database connection required for this endpoint',
      suggestion: 'Please ensure MongoDB is running or check your database configuration'
    });
  }
  next();
};

module.exports = { checkDBConnection };