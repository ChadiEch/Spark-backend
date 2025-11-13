const Logger = require('../logger');

const logger = new Logger('integration-monitoring');

// In-memory storage for metrics (in production, you might want to use Redis or a database)
const metrics = {
  apiCalls: {}, // Track API calls per integration
  errors: {},   // Track errors per integration
  responseTimes: {} // Track response times per integration
};

/**
 * Record an API call
 * @param {string} integrationKey - The integration key
 * @param {string} endpoint - The API endpoint
 * @param {number} responseTime - The response time in ms
 * @param {boolean} success - Whether the call was successful
 */
const recordAPICall = (integrationKey, endpoint, responseTime, success) => {
  try {
    // Initialize metrics for this integration if they don't exist
    if (!metrics.apiCalls[integrationKey]) {
      metrics.apiCalls[integrationKey] = { total: 0, success: 0, failure: 0 };
    }
    
    if (!metrics.responseTimes[integrationKey]) {
      metrics.responseTimes[integrationKey] = [];
    }
    
    // Update counters
    metrics.apiCalls[integrationKey].total++;
    if (success) {
      metrics.apiCalls[integrationKey].success++;
    } else {
      metrics.apiCalls[integrationKey].failure++;
    }
    
    // Store response time
    metrics.responseTimes[integrationKey].push({
      endpoint,
      responseTime,
      timestamp: new Date()
    });
    
    // Keep only the last 100 response times to prevent memory issues
    if (metrics.responseTimes[integrationKey].length > 100) {
      metrics.responseTimes[integrationKey] = metrics.responseTimes[integrationKey].slice(-100);
    }
    
    // Log the call
    logger.info('API call recorded', { 
      integrationKey, 
      endpoint, 
      responseTime, 
      success 
    });
  } catch (error) {
    logger.error('Error recording API call', { 
      integrationKey, 
      endpoint, 
      error: error.message 
    });
  }
};

/**
 * Record an error
 * @param {string} integrationKey - The integration key
 * @param {string} errorType - The type of error
 * @param {string} errorMessage - The error message
 */
const recordError = (integrationKey, errorType, errorMessage) => {
  try {
    // Initialize error tracking for this integration if it doesn't exist
    if (!metrics.errors[integrationKey]) {
      metrics.errors[integrationKey] = {};
    }
    
    // Initialize error type counter if it doesn't exist
    if (!metrics.errors[integrationKey][errorType]) {
      metrics.errors[integrationKey][errorType] = 0;
    }
    
    // Increment error counter
    metrics.errors[integrationKey][errorType]++;
    
    // Log the error
    logger.error('Integration error recorded', { 
      integrationKey, 
      errorType, 
      errorMessage 
    });
  } catch (error) {
    logger.error('Error recording integration error', { 
      integrationKey, 
      errorType, 
      errorMessage,
      error: error.message 
    });
  }
};

/**
 * Get integration metrics
 * @returns {Object} - The metrics
 */
const getMetrics = () => {
  try {
    // Calculate average response times
    const averageResponseTimes = {};
    for (const [integrationKey, times] of Object.entries(metrics.responseTimes)) {
      if (times.length > 0) {
        const total = times.reduce((sum, item) => sum + item.responseTime, 0);
        averageResponseTimes[integrationKey] = Math.round(total / times.length);
      }
    }
    
    return {
      apiCalls: metrics.apiCalls,
      errors: metrics.errors,
      averageResponseTimes,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error('Error getting integration metrics', { error: error.message });
    return {};
  }
};

/**
 * Reset metrics (useful for testing)
 */
const resetMetrics = () => {
  metrics.apiCalls = {};
  metrics.errors = {};
  metrics.responseTimes = {};
};

module.exports = {
  recordAPICall,
  recordError,
  getMetrics,
  resetMetrics
};