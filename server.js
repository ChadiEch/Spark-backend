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
const ScheduledPostingService = require('./utils/integrations/scheduledPostingService');
const MetricsCollectionService = require('./utils/integrations/metricsCollectionService');
const IntegrationMonitoringService = require('./utils/integrations/integrationMonitoringService');

// Initialize logger for server-level logging
const logger = new Logger('server');

// Database connection with error handling
// Track database connection status for graceful degradation
let dbConnected = false;
const connectDB = require('./config/db');

// Function to automatically initialize integrations if they don't exist
const initializeIntegrationsIfNeeded = async () => {
  try {
    // Only run if database is connected
    if (!mongoose.connection.readyState) {
      logger.warn('Database not connected, skipping integrations initialization');
      return;
    }
    
    // Check if integrations already exist
    const integrationCount = await Integration.countDocuments({});
    
    if (integrationCount === 0) {
      logger.info('No integrations found, initializing default integrations...');
      
      // Define the default integrations
      const defaultIntegrations = [
        {
          name: 'Instagram',
          description: 'Connect your Instagram Business account',
          key: 'instagram',
          icon: 'instagram',
          category: 'social',
          clientId: process.env.INSTAGRAM_CLIENT_ID || 'instagram_client_id',
          clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || 'instagram_client_secret',
          redirectUri: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/integrations/callback` : 'http://localhost:5173/integrations/callback',
          scopes: ['read', 'write'],
          enabled: true
        },
        {
          name: 'Facebook',
          description: 'Manage Facebook Pages and ads',
          key: 'facebook',
          icon: 'facebook',
          category: 'social',
          clientId: process.env.FACEBOOK_CLIENT_ID || '2302564490171864',
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '46f1bebd6df4f4f8a3171e36e81c8981',
          redirectUri: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/integrations/callback` : 'http://localhost:5173/integrations/callback',
          scopes: ['read', 'write'],
          enabled: true
        },
        {
          name: 'TikTok',
          description: 'Schedule and publish TikTok videos',
          key: 'tiktok',
          icon: 'tiktok',
          category: 'social',
          clientId: process.env.TIKTOK_CLIENT_KEY || 'tiktok_client_id',
          clientSecret: process.env.TIKTOK_CLIENT_SECRET || 'tiktok_client_secret',
          redirectUri: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/integrations/callback` : 'http://localhost:5173/integrations/callback',
          scopes: ['read', 'write'],
          enabled: true
        },
        {
          name: 'YouTube',
          description: 'Upload and manage YouTube content',
          key: 'youtube',
          icon: 'youtube',
          category: 'social',
          clientId: process.env.YOUTUBE_CLIENT_ID || '814259904377-39llm6tbn6okqlvucn6lrototb29t3f4.apps.googleusercontent.com',
          clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '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',
          redirectUri: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/integrations/callback` : 'http://localhost:5173/integrations/callback',
          scopes: [
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.upload'
          ],
          enabled: true
        },
        {
          name: 'Google Drive',
          description: 'Connect your Google Drive for file storage and sharing',
          key: 'google-drive',
          icon: 'google-drive',
          category: 'storage',
          clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '814259904377-39llm6tbn6okqlvucn6lrototb29t3f4.apps.googleusercontent.com',
          clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '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',
          redirectUri: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/integrations/callback` : 'http://localhost:5173/integrations/callback',
          scopes: [
            'https://www.googleapis.com/auth/drive'
          ],
          enabled: true
        }
      ];
      
      // Insert the default integrations
      const integrations = await Integration.insertMany(defaultIntegrations);
      logger.info(`Successfully initialized ${integrations.length} integrations`);
    } else {
      logger.info(`Found ${integrationCount} existing integrations, skipping initialization`);
    }
  } catch (error) {
    logger.error('Error initializing integrations:', { error: error.message });
  }
};

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
      
      // Initialize integrations if needed
      await initializeIntegrationsIfNeeded();
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

// The app variable is defined later, so we'll set dbConnected after app is initialized

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
const integrationRoutes = require('./routes/integrations');
const billingRoutes = require('./routes/billing');
const securityRoutes = require('./routes/security');
const activityRoutes = require('./routes/activities');
const webhookRoutes = require('./routes/webhooks');
const invitationRoutes = require('./routes/invitations');

// Import models for initialization
const Integration = require('./models/Integration');

// Import middleware
const { checkDBConnection } = require('./middleware/dbConnection');

const app = express();

// Export app for testing purposes
if (process.env.NODE_ENV === 'test') {
  module.exports = app;
}

const PORT = process.env.PORT || 5001; // Use PORT from environment or default to 5001

// Initialize scheduled posting service
const scheduledPostingService = new ScheduledPostingService();

// Initialize metrics collection service
const metricsCollectionService = new MetricsCollectionService();

// Initialize integration monitoring service
const integrationMonitoringService = new IntegrationMonitoringService();

// Make dbConnected available to middleware (initial value)
app.set('dbConnected', dbConnected);

// Rate limiting middleware to prevent abuse
// Configurable window and request limits for API protection
app.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
}));

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
// This ensures database-dependent functionality only works when database is available
app.use('/api/auth', authRoutes);
app.use('/api/users', checkDBConnection, userRoutes);
app.use('/api/posts', checkDBConnection, postRoutes);
app.use('/api/campaigns', checkDBConnection, campaignRoutes);
app.use('/api/tasks', checkDBConnection, taskRoutes);
app.use('/api/goals', checkDBConnection, goalRoutes);
app.use('/api/assets', checkDBConnection, assetRoutes);
app.use('/api/ambassadors', checkDBConnection, ambassadorRoutes);
app.use('/api/analytics', checkDBConnection, analyticsRoutes);
app.use('/api/notifications', checkDBConnection, notificationRoutes);
app.use('/api/search', checkDBConnection, searchRoutes);
app.use('/api/export', checkDBConnection, exportRoutes);
app.use('/api/integrations', checkDBConnection, integrationRoutes);
app.use('/api/billing', checkDBConnection, billingRoutes);
app.use('/api/security', checkDBConnection, securityRoutes);
app.use('/api/activities', checkDBConnection, activityRoutes);
app.use('/api/invitations', invitationRoutes);

// Webhook routes (no database check required, no authentication required)
app.use('/webhooks', webhookRoutes);

// Serve static files from the React app build directory
// This enables serving the frontend from the same server
// Only serve frontend files in development or when explicitly configured to do so
if (process.env.NODE_ENV === 'development' || process.env.SERVE_FRONTEND === 'true') {
  const distPath = path.join(__dirname, '../frontend/dist');
  
  // Check if dist directory exists before serving static files
  const fs = require('fs');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // Catch-all handler for React Router (must be after all API routes)
    // This enables client-side routing to work properly
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    logger.warn('Dist directory not found, skipping static file serving');
  }
}

// Error handling middleware
// This should be the last middleware to catch all unhandled errors
app.use(errorHandler);

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
    }
  });

  return server;
};

// Start the server with the configured or default port
// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  // Start scheduled posting service
scheduledPostingService.start();

// Start metrics collection service
metricsCollectionService.start();

// Start integration monitoring service
integrationMonitoringService.start();

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
}