const Logger = require('../utils/logger');

const logger = new Logger('error-handler');

/**
 * Custom API Error class
 * @class APIError
 * @extends Error
 * @classdesc Extends the built-in Error class to provide structured error handling
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (e.g., 400, 401, 500)
 * @param {boolean} isOperational - Whether the error is operational (true) or programming (false)
 * @param {Object} details - Additional error details for debugging
 * 
 * @example
 * throw new APIError('User not found', 404, true, { userId: 123 });
 */
class APIError extends Error {
  /**
   * Create an APIError
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {boolean} isOperational - Flag indicating if error is operational (true) or programmer error (false)
   * @param {Object} details - Additional context for debugging
   */
  constructor(message, statusCode, isOperational = true, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    // Capture stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Enhanced error handling middleware
 * @function errorHandler
 * @description Centralized error handling middleware that processes all errors in the application
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @complexity High - Handles multiple error types and provides contextual responses
 * @security Logs error details securely without exposing sensitive information in production
 */
function errorHandler(err, req, res, next) {
  // Create a copy of the error object to avoid modifying the original
  let error = { ...err };
  error.message = err.message;

  // Log error with contextual information for debugging
  // Include request details for better traceability
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });

  // Handle Mongoose bad ObjectId errors (CastError)
  // This occurs when an invalid ObjectId is provided in requests
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new APIError(message, 404);
  }

  // Handle Mongoose duplicate key errors
  // This occurs when trying to create a document with a duplicate unique field
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new APIError(message, 400);
  }

  // Handle Mongoose validation errors
  // This occurs when document validation fails during creation/update
  if (err.name === 'ValidationError') {
    // Extract validation error messages and join them for user feedback
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new APIError(message, 400);
  }

  // Handle JWT token errors
  // These occur when authentication tokens are invalid or expired
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new APIError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new APIError(message, 401);
  }

  // Handle Multer file upload errors
  // These occur during file uploads when limits are exceeded
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = new APIError(message, 413);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files uploaded';
    error = new APIError(message, 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected field in file upload';
    error = new APIError(message, 400);
  }

  // Default to 500 server error if no status code is set
  // This ensures all errors have an appropriate HTTP status
  if (!error.statusCode) {
    error.statusCode = 500;
  }

  // Prepare standardized error response
  // Include stack trace only in development for debugging
  const response = {
    success: false,
    message: error.message || 'Server Error',
    // Include stack trace only in development environment for security
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    // Include additional details if provided and not null/undefined
    ...(error.details && Object.keys(error.details).length > 0 && { details: error.details })
  };

  // Add contextual suggestions to help users resolve errors
  // These provide actionable guidance based on error type
  if (error.statusCode === 400) {
    response.suggestion = 'Please check your request data and try again';
  } else if (error.statusCode === 401) {
    response.suggestion = 'Please check your credentials and try again';
  } else if (error.statusCode === 403) {
    response.suggestion = 'You do not have permission to access this resource';
  } else if (error.statusCode === 404) {
    response.suggestion = 'The requested resource could not be found';
  } else if (error.statusCode === 429) {
    response.suggestion = 'Please wait before making another request';
  } else if (error.statusCode >= 500) {
    response.suggestion = 'Please try again later or contact support if the issue persists';
  }

  // Send standardized error response with appropriate HTTP status code
  res.status(error.statusCode).json(response);
}

/**
 * Async error wrapper
 * @function asyncHandler
 * @description Wraps async route handlers to catch and forward errors to the error handler middleware
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 * 
 * @complexity Low - Simple promise wrapper
 * @security Ensures async errors are properly caught and handled
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res, next) => {
 *   const users = await User.find();
 *   res.json({ success: true, data: users });
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    // Wrap the async function in a Promise.resolve to catch any thrown errors
    // and forward them to the next middleware (error handler)
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  APIError,
  errorHandler,
  asyncHandler
};