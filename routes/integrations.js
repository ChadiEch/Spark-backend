const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const integrationController = require('../controllers/integrationController');
const { getMetrics } = require('../utils/integrations/monitoring');

// POST /api/integrations/initialize - Initialize integrations collection (public)
router.post('/initialize', integrationController.initializeIntegrations);

// POST /api/integrations/exchange - Exchange OAuth code for tokens (public)
// This endpoint needs to be public because it's called during OAuth callback flow
// before the user has a valid authentication token
router.post('/exchange', integrationController.exchangeCodeForTokens);

// GET /api/integrations/callback - Handle OAuth callback directly (public)
// This endpoint handles OAuth callbacks and exchanges codes for tokens
router.get('/callback', integrationController.handleOAuthCallback);

// All routes below are protected
router.use(protect);

// GET /api/integrations - Get all available integrations
router.get('/', integrationController.getIntegrations);

// GET /api/integrations/:id - Get single integration
router.get('/:id', integrationController.getIntegration);

// GET /api/integrations/connections - Get user's connected integrations
router.get('/connections', integrationController.getUserConnections);

// POST /api/integrations/connect - Initiate connection to an integration
router.post('/connect', integrationController.connectIntegration);

// DELETE /api/integrations/connections/:id - Disconnect from an integration
router.delete('/connections/:id', integrationController.disconnectIntegration);

// POST /api/integrations/connections/:id/refresh - Refresh an integration connection
router.post('/connections/:id/refresh', integrationController.refreshConnection);

// GET /api/integrations/connections/:id/status - Get connection status
router.get('/connections/:id/status', integrationController.getConnectionStatus);

// POST /api/integrations/google-drive/upload - Upload file to Google Drive
router.post('/google-drive/upload', integrationController.uploadToGoogleDrive);

// GET /api/integrations/metrics - Get integration metrics (admin only)
router.get('/metrics', authorize('admin'), (req, res) => {
  try {
    const metrics = getMetrics();
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// GET /api/integrations/metrics/health - Get integration health metrics
router.get('/metrics/health', integrationController.getIntegrationMetrics);

module.exports = router;