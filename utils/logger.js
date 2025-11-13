const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be set via environment variable)
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'];

/**
 * Format log message with timestamp
 */
function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    meta,
    pid: process.pid
  };
  return JSON.stringify(logEntry);
}

/**
 * Write log to file
 */
function writeToFile(level, message, meta = {}) {
  const logMessage = formatLog(level, message, meta);
  const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
  
  fs.appendFile(logFile, logMessage + '\n', (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });
}

/**
 * Logger class
 */
class Logger {
  constructor(component = 'server') {
    this.component = component;
  }

  error(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      const logMessage = `[${this.component}] ${message}`;
      console.error(`\x1b[31mERROR\x1b[0m ${logMessage}`);
      writeToFile('ERROR', logMessage, meta);
    }
  }

  warn(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      const logMessage = `[${this.component}] ${message}`;
      console.warn(`\x1b[33mWARN\x1b[0m ${logMessage}`);
      writeToFile('WARN', logMessage, meta);
    }
  }

  info(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      const logMessage = `[${this.component}] ${message}`;
      console.info(`\x1b[36mINFO\x1b[0m ${logMessage}`);
      writeToFile('INFO', logMessage, meta);
    }
  }

  debug(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      const logMessage = `[${this.component}] ${message}`;
      console.debug(`\x1b[35mDEBUG\x1b[0m ${logMessage}`);
      writeToFile('DEBUG', logMessage, meta);
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(req, res, next) {
    const startTime = Date.now();
    
    // Log request
    this.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    // Override res.end to log response
    const originalEnd = res.end;
    const self = this;
    
    res.end = function(chunk, encoding) {
      const duration = Date.now() - startTime;
      
      self.info('Outgoing response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection.remoteAddress
      });

      originalEnd.call(this, chunk, encoding);
    };

    next();
  }
}

module.exports = Logger;