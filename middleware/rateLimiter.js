const Logger = require('../utils/logger');

const logger = new Logger('rate-limiter');

// In-memory store for rate limiting
// In production, you should use Redis or similar
const rateLimitStore = new Map();

// Configuration from environment variables
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX) || 1000;
const AUTH_MAX_REQUESTS = parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5;

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    // Remove entries older than 1 hour
    if (now - value.timestamp > 3600000) {
      rateLimitStore.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Window size in milliseconds (default: 15 minutes)
 * @param {number} options.max - Max number of requests in window (default: 1000)
 * @param {string} options.message - Message to send when rate limited
 */
function rateLimiter(options = {}) {
  const windowMs = options.windowMs || WINDOW_MS;
  const max = options.max || MAX_REQUESTS;
  const message = options.message || 'Too many requests, please try again later.';
  const skipSuccessfulRequests = options.skipSuccessfulRequests || false;

  return (req, res, next) => {
    // Skip rate limiting for health check endpoint
    if (req.path === '/api/health' || req.path === '/api/metrics') {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress;
    const key = `${ip}:${req.method}:${req.path}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit info for this IP
    let rateLimitInfo = rateLimitStore.get(key);
    
    if (!rateLimitInfo || rateLimitInfo.timestamp < windowStart) {
      // Create new rate limit info
      rateLimitInfo = {
        count: 0,
        timestamp: now
      };
      rateLimitStore.set(key, rateLimitInfo);
    }

    // Increment request count
    rateLimitInfo.count++;
    rateLimitInfo.timestamp = now;

    // Check if limit exceeded
    if (rateLimitInfo.count > max) {
      logger.warn('Rate limit exceeded', {
        ip,
        method: req.method,
        url: req.url,
        count: rateLimitInfo.count,
        limit: max
      });

      return res.status(429).json({
        success: false,
        message,
        suggestion: 'Please wait before making another request'
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - rateLimitInfo.count));
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitInfo.timestamp + windowMs).toISOString());

    // If request is successful and skipSuccessfulRequests is true, reset count
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      res.send = function (body) {
        if (res.statusCode < 400) {
          rateLimitInfo.count = 0;
        }
        return originalSend.call(this, body);
      };
    }

    next();
  };
}

// Specific rate limiters for different endpoints
const apiLimiter = rateLimiter({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

const authLimiter = rateLimiter({
  windowMs: WINDOW_MS,
  max: AUTH_MAX_REQUESTS,
  message: 'Too many authentication attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true
});

const strictLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many requests, please try again later'
});

module.exports = {
  rateLimiter,
  apiLimiter,
  authLimiter,
  strictLimiter
};