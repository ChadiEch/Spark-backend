const mongoose = require('mongoose');
const axios = require('axios');
const Integration = require('../models/Integration');
const IntegrationConnection = require('../models/IntegrationConnection');
const { exchangeCodeForTokens, refreshOAuthTokens, createOrUpdateConnection, getIntegrationCredentials } = require('../utils/integrations/oauthUtils');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');

const logger = new Logger('integration-controller');

// @desc    Get all available integrations
// @route   GET /api/integrations
// @access  Private
exports.getIntegrations = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getIntegrations request');
    throw new APIError('Database not available', 503);
  }
  
  const integrations = await Integration.find().sort({ name: 1 });

  logger.info('Integrations retrieved successfully', { count: integrations.length });
  
  res.status(200).json({
    success: true,
    count: integrations.length,
    data: integrations
  });
});

// @desc    Get single integration
// @route   GET /api/integrations/:id
// @access  Private
exports.getIntegration = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getIntegration request');
    throw new APIError('Database not available', 503);
  }
  
  const integration = await Integration.findById(req.params.id);
  
  if (!integration) {
    throw new APIError(`Integration not found with id of ${req.params.id}`, 404);
  }
  
  logger.info('Integration retrieved successfully', { integrationId: integration._id });
  
  res.status(200).json({
    success: true,
    data: integration
  });
});

// @desc    Get user's connected integrations
// @route   GET /api/integrations/connections
// @access  Private
exports.getUserConnections = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getUserConnections request');
    throw new APIError('Database not available', 503);
  }
  
  const connections = await IntegrationConnection.find({ userId: req.user.id })
    .populate('integrationId', 'name key icon category description')
    .sort({ createdAt: -1 });
  
  logger.info('User connections retrieved successfully', { 
    userId: req.user.id, 
    count: connections.length 
  });
  
  res.status(200).json({
    success: true,
    count: connections.length,
    data: connections
  });
});

// @desc    Initiate connection to an integration
// @route   POST /api/integrations/connect
// @access  Private
exports.connectIntegration = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for connectIntegration request');
    throw new APIError('Database not available', 503);
  }
  
  const { integrationId } = req.body;
  
  // Validate integration ID
  if (!integrationId) {
    throw new APIError('Please provide integration ID', 400);
  }
  
  // Find the integration
  const integration = await Integration.findById(integrationId);
  if (!integration) {
    throw new APIError(`Integration not found with id of ${integrationId}`, 404);
  }
  
  // Generate OAuth authorization URL
  let authUrl;
  switch (integration.key) {
    case 'google-drive':
    case 'youtube':
      // Use the redirectUri from the integration document or construct default
      const redirectUri = integration.redirectUri || `${req.protocol}://${req.get('host')}/api/integrations/callback`;
      
      // Generate state parameter for security
      const state = JSON.stringify({ 
        integrationId: integration._id.toString(),
        userId: req.user.id
      });
      
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${integration.clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(' '))}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(state)}`;
      break;
      
    case 'facebook':
    case 'instagram':
      // Use the redirectUri from the integration document or construct default
      const fbRedirectUri = integration.redirectUri || `${req.protocol}://${req.get('host')}/api/integrations/callback`;
      
      // Generate state parameter for security
      const fbState = JSON.stringify({ 
        integrationId: integration._id.toString(),
        userId: req.user.id
      });
      
      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${integration.clientId}&` +
        `redirect_uri=${encodeURIComponent(fbRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(','))}&` +
        `state=${encodeURIComponent(fbState)}`;
      break;
      
    default:
      throw new APIError(`Unsupported integration: ${integration.key}`, 400);
  }
  
  logger.info('Generated OAuth authorization URL', { 
    integrationKey: integration.key,
    userId: req.user.id
  });
  
  res.status(200).json({
    success: true,
    data: {
      authUrl,
      integration: {
        _id: integration._id,
        name: integration.name,
        key: integration.key,
        icon: integration.icon,
        description: integration.description
      }
    }
  });
});

// @desc    Handle OAuth callback
// @route   GET /api/integrations/callback
// @access  Public
exports.handleOAuthCallback = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for handleOAuthCallback request');
    throw new APIError('Database not available', 503);
  }
  
  const { code, state } = req.query;
  
  // Validate required parameters
  if (!code) {
    logger.error('OAuth callback missing code parameter');
    return res.status(400).json({
      success: false,
      message: 'Missing OAuth code parameter'
    });
  }
  
  if (!state) {
    logger.error('OAuth callback missing state parameter');
    return res.status(400).json({
      success: false,
      message: 'Missing OAuth state parameter'
    });
  }
  
  let stateData;
  try {
    stateData = JSON.parse(decodeURIComponent(state));
  } catch (error) {
    logger.error('Invalid state parameter in OAuth callback', { error: error.message });
    return res.status(400).json({
      success: false,
      message: 'Invalid OAuth state parameter'
    });
  }
  
  const { integrationId, userId } = stateData;
  
  // Validate state data
  if (!integrationId || !userId) {
    logger.error('Invalid state data in OAuth callback', { stateData });
    return res.status(400).json({
      success: false,
      message: 'Invalid OAuth state data'
    });
  }
  
  // Find the integration
  const integration = await Integration.findById(integrationId);
  if (!integration) {
    logger.error('Integration not found during OAuth callback', { integrationId });
    return res.status(404).json({
      success: false,
      message: 'Integration not found'
    });
  }
  
  // Use the redirectUri from the integration document or construct default
  const redirectUri = integration.redirectUri || `${req.protocol}://${req.get('host')}/api/integrations/callback`;
  
  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(integration.key, code, redirectUri);
    
    // Create or update connection
    const connection = await createOrUpdateConnection(integrationId, userId, tokens);
    
    logger.info('Successfully connected integration', { 
      integrationKey: integration.key,
      userId,
      connectionId: connection._id
    });
    
    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?tab=integrations&success=true&integration=${integration.key}`);
  } catch (error) {
    logger.error('Error during OAuth callback processing', { 
      error: error.message,
      integrationKey: integration.key,
      userId
    });
    
    // Redirect to frontend with error
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?tab=integrations&error=true&integration=${integration.key}&message=${encodeURIComponent(error.message)}`);
  }
});

// @desc    Exchange OAuth code for tokens
// @route   POST /api/integrations/exchange
// @access  Public
exports.exchangeCodeForTokens = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for exchangeCodeForTokens request');
    throw new APIError('Database not available', 503);
  }
  
  const { integrationKey, code, redirectUri } = req.body;
  
  // Validate required parameters
  if (!integrationKey || !code || !redirectUri) {
    throw new APIError('Please provide integrationKey, code, and redirectUri', 400);
  }
  
  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(integrationKey, code, redirectUri);
    
    logger.info('Successfully exchanged OAuth code for tokens', { integrationKey });
    
    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error) {
    logger.error('Error exchanging OAuth code for tokens', { 
      error: error.message,
      integrationKey
    });
    throw error;
  }
});

// @desc    Disconnect from an integration
// @route   DELETE /api/integrations/connections/:id
// @access  Private
exports.disconnectIntegration = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for disconnectIntegration request');
    throw new APIError('Database not available', 503);
  }
  
  // Find and delete the connection
  const connection = await IntegrationConnection.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id
  });
  
  if (!connection) {
    throw new APIError(`Connection not found with id of ${req.params.id}`, 404);
  }
  
  logger.info('Successfully disconnected integration', { 
    connectionId: connection._id,
    userId: req.user.id
  });
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Refresh an integration connection
// @route   POST /api/integrations/connections/:id/refresh
// @access  Private
exports.refreshConnection = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for refreshConnection request');
    throw new APIError('Database not available', 503);
  }
  
  // Find the connection
  const connection = await IntegrationConnection.findOne({
    _id: req.params.id,
    userId: req.user.id
  }).populate('integrationId');
  
  if (!connection) {
    throw new APIError(`Connection not found with id of ${req.params.id}`, 404);
  }
  
  try {
    // Refresh tokens
    const tokens = await refreshOAuthTokens(connection.integrationId.key, connection.refreshToken);
    
    // Update connection with new tokens
    const updatedConnection = await createOrUpdateConnection(
      connection.integrationId._id,
      req.user.id,
      tokens
    );
    
    logger.info('Successfully refreshed integration connection', { 
      connectionId: connection._id,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      data: updatedConnection
    });
  } catch (error) {
    logger.error('Error refreshing integration connection', { 
      error: error.message,
      connectionId: connection._id,
      userId: req.user.id
    });
    throw error;
  }
});

// @desc    Get connection status
// @route   GET /api/integrations/connections/:id/status
// @access  Private
exports.getConnectionStatus = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getConnectionStatus request');
    throw new APIError('Database not available', 503);
  }
  
  // Find the connection
  const connection = await IntegrationConnection.findOne({
    _id: req.params.id,
    userId: req.user.id
  }).populate('integrationId');
  
  if (!connection) {
    throw new APIError(`Connection not found with id of ${req.params.id}`, 404);
  }
  
  // Check if token is expired
  const isExpired = connection.expiresAt && connection.expiresAt < new Date();
  
  logger.info('Retrieved connection status', { 
    connectionId: connection._id,
    userId: req.user.id,
    isExpired
  });
  
  res.status(200).json({
    success: true,
    data: {
      isConnected: true,
      isExpired,
      expiresAt: connection.expiresAt,
      integration: {
        _id: connection.integrationId._id,
        name: connection.integrationId.name,
        key: connection.integrationId.key,
        icon: connection.integrationId.icon
      }
    }
  });
});

// @desc    Upload file to Google Drive
// @route   POST /api/integrations/google-drive/upload
// @access  Private
exports.uploadToGoogleDrive = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for uploadToGoogleDrive request');
    throw new APIError('Database not available', 503);
  }
  
  const { fileName, fileData, mimeType } = req.body;
  
  // Validate required parameters
  if (!fileName || !fileData) {
    throw new APIError('Please provide fileName and fileData', 400);
  }
  
  // Find Google Drive integration
  const integration = await Integration.findOne({ key: 'google-drive' });
  if (!integration) {
    throw new APIError('Google Drive integration not found', 404);
  }
  
  // Find user's Google Drive connection
  const connection = await IntegrationConnection.findOne({
    integrationId: integration._id,
    userId: req.user.id
  });
  
  if (!connection) {
    throw new APIError('Google Drive not connected', 400);
  }
  
  // Check if token is expired and refresh if needed
  if (connection.expiresAt && connection.expiresAt < new Date()) {
    try {
      const tokens = await refreshOAuthTokens('google-drive', connection.refreshToken);
      await createOrUpdateConnection(integration._id, req.user.id, tokens);
    } catch (error) {
      logger.error('Error refreshing Google Drive token', { error: error.message });
      throw new APIError('Unable to refresh Google Drive token', 401);
    }
  }
  
  // Upload file to Google Drive
  try {
    const response = await axios.post(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=media',
      Buffer.from(fileData, 'base64'),
      {
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': mimeType || 'application/octet-stream'
        }
      }
    );
    
    logger.info('Successfully uploaded file to Google Drive', { 
      userId: req.user.id,
      fileId: response.data.id
    });
    
    res.status(200).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    logger.error('Error uploading file to Google Drive', { 
      error: error.message,
      userId: req.user.id
    });
    throw new APIError('Error uploading file to Google Drive', 500);
  }
});

// @desc    Get integration metrics
// @route   GET /api/integrations/metrics/health
// @access  Private
exports.getIntegrationMetrics = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getIntegrationMetrics request');
    throw new APIError('Database not available', 503);
  }
  
  // Get counts
  const integrationCount = await Integration.countDocuments();
  const connectionCount = await IntegrationConnection.countDocuments();
  const userConnectionCount = await IntegrationConnection.distinct('userId').count();
  
  logger.info('Retrieved integration metrics', { 
    integrationCount,
    connectionCount,
    userConnectionCount
  });
  
  res.status(200).json({
    success: true,
    data: {
      integrations: integrationCount,
      connections: connectionCount,
      usersWithConnections: userConnectionCount
    }
  });
});