const Logger = require('../utils/logger');

const logger = new Logger('monitoring');

// In-memory store for metrics
// In production, you should use Redis or similar
const metricsStore = {
  requestCount: 0,
  errorCount: 0,
  responseTimes: [],
  activeConnections: 0,
  routes: new Map()
};

// Clean up old metrics periodically
setInterval(() => {
  // Keep only last 1000 response times
  if (metricsStore.responseTimes.length > 1000) {
    metricsStore.responseTimes = metricsStore.responseTimes.slice(-1000);
  }
  
  // Clean up old route metrics
  const now = Date.now();
  for (const [key, value] of metricsStore.routes.entries()) {
    // Remove entries older than 1 hour
    if (now - value.timestamp > 3600000) {
      metricsStore.routes.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes

/**
 * Monitoring middleware
 */
function monitoring(req, res, next) {
  const startTime = Date.now();
  
  // Increment request count
  metricsStore.requestCount++;
  
  // Track active connections
  metricsStore.activeConnections++;
  
  // Track route metrics
  const routeKey = `${req.method}:${req.path}`;
  if (!metricsStore.routes.has(routeKey)) {
    metricsStore.routes.set(routeKey, {
      count: 0,
      totalTime: 0,
      errors: 0,
      timestamp: Date.now()
    });
  }
  
  const routeMetrics = metricsStore.routes.get(routeKey);
  routeMetrics.count++;
  routeMetrics.timestamp = Date.now();

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Track response time
    metricsStore.responseTimes.push(duration);
    
    // Update route metrics
    routeMetrics.totalTime += duration;
    
    // Track active connections
    metricsStore.activeConnections = Math.max(0, metricsStore.activeConnections - 1);
    
    // Log slow requests
    if (duration > 5000) { // Log requests taking more than 5 seconds
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress
      });
    }
    
    originalEnd.call(this, chunk, encoding);
  };

  // Track errors
  const originalWriteHead = res.writeHead;
  res.writeHead = function(statusCode, headers) {
    if (statusCode >= 400) {
      metricsStore.errorCount++;
      routeMetrics.errors++;
      
      logger.warn('HTTP error response', {
        method: req.method,
        url: req.url,
        statusCode,
        ip: req.ip || req.connection.remoteAddress
      });
    }
    
    return originalWriteHead.call(this, statusCode, headers);
  };

  next();
}

/**
 * Get current metrics
 */
function getMetrics() {
  const totalResponseTime = metricsStore.responseTimes.reduce((sum, time) => sum + time, 0);
  const averageResponseTime = metricsStore.responseTimes.length > 0 
    ? totalResponseTime / metricsStore.responseTimes.length 
    : 0;
  
  // Calculate 95th percentile response time
  const sortedTimes = [...metricsStore.responseTimes].sort((a, b) => a - b);
  const percentile95Index = Math.floor(sortedTimes.length * 0.95);
  const percentile95 = sortedTimes[percentile95Index] || 0;
  
  // Format route metrics
  const routes = {};
  for (const [key, value] of metricsStore.routes.entries()) {
    const averageTime = value.count > 0 ? value.totalTime / value.count : 0;
    routes[key] = {
      count: value.count,
      averageTime: Math.round(averageTime * 100) / 100,
      errors: value.errors,
      successRate: value.count > 0 ? ((value.count - value.errors) / value.count * 100) : 0
    };
  }
  
  return {
    requestCount: metricsStore.requestCount,
    errorCount: metricsStore.errorCount,
    activeConnections: metricsStore.activeConnections,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    percentile95ResponseTime: Math.round(percentile95 * 100) / 100,
    routes
  };
}

module.exports = {
  monitoring,
  getMetrics
};