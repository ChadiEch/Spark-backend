const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const os = require('os');
const process = require('process');

const logger = new Logger('health-controller');

// @desc    Get health status
// @route   GET /api/health
// @access  Public
exports.getHealth = asyncHandler(async (req, res, next) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    platform: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus().length
    },
    process: {
      pid: process.pid,
      memory: process.memoryUsage(),
      version: process.version
    }
  };

  // Database health (optional)
  if (mongoose.connection.readyState === 1) {
    healthCheck.database = {
      status: 'connected',
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
    
    // Try to ping database
    try {
      await mongoose.connection.db.admin().ping();
      healthCheck.database.ping = 'successful';
    } catch (dbError) {
      healthCheck.database.ping = 'failed';
      healthCheck.database.error = dbError.message;
    }
  } else {
    healthCheck.database = {
      status: 'disconnected',
      message: 'Database connection not required for basic functionality'
    };
  }

  logger.info('Health check performed', { 
    databaseStatus: healthCheck.database.status,
    uptime: healthCheck.uptime 
  });

  res.status(200).json({
    success: true,
    data: healthCheck
  });
});

// @desc    Get detailed health status
// @route   GET /api/health/detailed
// @access  Public
exports.getDetailedHealth = asyncHandler(async (req, res, next) => {
  const detailedHealth = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: 'OK'
  };

  // System information
  detailedHealth.system = {
    platform: os.platform(),
    architecture: os.arch(),
    hostname: os.hostname(),
    cpuCount: os.cpus().length,
    totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    loadAverage: os.loadavg()
  };

  // Process information
  detailedHealth.process = {
    pid: process.pid,
    nodeVersion: process.version,
    memoryUsage: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(process.memoryUsage().external / 1024 / 1024).toFixed(2)} MB`
    },
    uptime: `${Math.floor(process.uptime() / 60)} minutes`
  };

  // Database information (if connected)
  if (mongoose.connection.readyState === 1) {
    detailedHealth.database = {
      status: 'connected',
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      readyState: mongoose.connection.readyState
    };
  } else {
    detailedHealth.database = {
      status: 'disconnected',
      message: 'Database connection not required for basic functionality'
    };
  }

  logger.debug('Detailed health check performed', { 
    systemLoad: detailedHealth.system.loadAverage,
    memoryUsage: detailedHealth.process.memoryUsage 
  });

  res.status(200).json({
    success: true,
    data: detailedHealth
  });
});