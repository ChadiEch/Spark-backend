const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from the server directory
// This allows configuration without hardcoding sensitive values
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Import utilities
const Logger = require('./utils/logger');
const { rateLimiter, apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const { monitoring, getMetrics } = require('./middleware/monitoring');

// Initialize logger for server-level logging
const logger = new Logger('server');

// Database connection with error handling
// Track database connection status for graceful degradation
let dbConnected = false;
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const campaignRoutes = require('./routes/campaigns');
const taskRoutes = require('./routes/tasks');
const goalRoutes = require('./routes/goals');
const assetRoutes = require('./routes/assets');
const analyticsRoutes = require('./routes/analytics');
const ambassadorRoutes = require('./routes/ambassadors');
const healthRoutes = require('./routes/health');
const notificationRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');
const exportRoutes = require('./routes/export');
const billingRoutes = require('./routes/billing');
const activityRoutes = require('./routes/activities');
const invitationRoutes = require('./routes/invitations');
const securityRoutes = require('./routes/security');
const webhookRoutes = require('./routes/webhooks');

// Import middleware
const { checkDBConnection } = require('./middleware/dbConnection');

const app = express();

// Export app for testing purposes
if (process.env.NODE_ENV === 'test') {
  module.exports = app;
}

const PORT = process.env.PORT || 5001; // Use PORT from environment or default to 5001

// Apply rate limiting middleware globally
// Protects against brute force and DDoS attacks
app.use(rateLimiter);
app.use('/api/', apiLimiter);

// Monitoring middleware to track performance and usage
// Collects metrics for health checks and performance analysis
app.use(monitoring);

// CORS configuration - allow multiple origins in development
// Restricts origins in production for security
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083', 'http://localhost:8084'] // Allow requests from common development ports
    : ['https://spark-frontend-production.up.railway.app', 'https://spark-frontend-production-ab14.up.railway.app'], // In production, explicitly allow frontend origins
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware setup
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Increase payload limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files statically

// Request logging middleware
// Logs all incoming requests for monitoring and debugging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health routes (no database required)
// These endpoints work even when database is unavailable
app.use('/api/health', healthRoutes);

// Metrics endpoint (no database required)
// Provides performance metrics without database dependency
app.get('/api/metrics', (req, res) => {
  const metrics = getMetrics();
  res.status(200).json({
    success: true,
    data: metrics
  });
});

// Apply database check to all other API routes
// Ensures database is available before processing requests that require it
app.use('/api/auth', checkDBConnection, authRoutes);
app.use('/api/users', checkDBConnection, userRoutes);
app.use('/api/posts', checkDBConnection, postRoutes);
app.use('/api/campaigns', checkDBConnection, campaignRoutes);
app.use('/api/tasks', checkDBConnection, taskRoutes);
app.use('/api/goals', checkDBConnection, goalRoutes);
app.use('/api/assets', checkDBConnection, assetRoutes);
app.use('/api/analytics', checkDBConnection, analyticsRoutes);
app.use('/api/ambassadors', checkDBConnection, ambassadorRoutes);
app.use('/api/notifications', checkDBConnection, notificationRoutes);
app.use('/api/search', checkDBConnection, searchRoutes);
app.use('/api/export', checkDBConnection, exportRoutes);
app.use('/api/billing', checkDBConnection, billingRoutes);
app.use('/api/activities', checkDBConnection, activityRoutes);
app.use('/api/invitations', checkDBConnection, invitationRoutes);
app.use('/api/security', checkDBConnection, securityRoutes);
app.use('/api/webhooks', checkDBConnection, webhookRoutes);

// Serve static files in production
// Allows serving built frontend files directly from backend
if (process.env.NODE_ENV === 'production' && process.env.SERVE_FRONTEND === 'true') {
  app.use(express.static(path.join(__dirname, '../Spark-frontend/dist')));
  
  // Handle SPA routing, return index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Spark-frontend/dist', 'index.html'));
  });
}

// Error handling middleware
// This should be the last middleware to catch all unhandled errors
app.use(errorHandler);

// Connect to database but don't wait for it to prevent server startup blocking
// This allows the server to start even if database is temporarily unavailable
connectDB()
  .then(async (conn) => {
    if (conn) {
      dbConnected = true;
      // Update the app setting with the new dbConnected status
      if (app) {
        app.set('dbConnected', dbConnected);
      }
      logger.info('Database connected successfully');
    } else {
      // Log warning when database is not available but server can still start
      logger.warn('Database connection not established - running in limited mode');
      logger.info('Some features may not work without a database connection');
      logger.info('To fix this issue:');
      logger.info('1. Ensure MongoDB is installed and running locally');
      logger.info('2. Or update MONGO_URI in .env to use MongoDB Atlas');
    }
  })
  .catch((err) => {
    // Handle database connection failures gracefully
    logger.error('Database connection failed', { error: err.message });
    logger.info('Starting server without database connection...');
    logger.warn('Note: Some features may not work without a database connection');
  });

// Function to start server with port conflict handling
// Automatically tries different ports if the preferred port is in use
const startServer = (port) => {
  // Validate port range to prevent infinite recursion
  if (port > 65535) {
    logger.error('No available ports in range. Please free up some ports or specify a different port.');
    process.exit(1);
  }

  const server = app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
    logger.info(`Health check endpoint: http://localhost:${port}/api/health`);
    logger.info(`Metrics endpoint: http://localhost:${port}/api/metrics`);
    if (!dbConnected) {
      logger.warn('WARNING: Database not connected!');
      logger.warn('Some features may not work properly.');
      logger.warn('Please check your MongoDB installation or database configuration.');
    }
  });

  // Handle port in use error
  // Automatically try the next available port
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is already in use. Trying port ${port + 1}...`);
      // Add a small delay to prevent rapid recursion
      setTimeout(() => {
        startServer(port + 1);
      }, 100);
    } else {
      logger.error('Server error', { error: err.message });
      process.exit(1);
    }
  });

  return server;
};

const server = startServer(parseInt(PORT));

// Handle unhandled promise rejections
// This prevents the application from crashing due to unhandled async errors
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection at Promise', { error: err.message, promise });
  // Close server & exit process gracefully
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
// This prevents the application from crashing due to synchronous errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message });
  process.exit(1);
});

// Handle SIGTERM
// This enables graceful shutdown when process is terminated
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});