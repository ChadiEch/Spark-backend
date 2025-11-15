const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const IntegrationConnection = require('../models/IntegrationConnection');
const { exchangeCodeForTokens, refreshOAuthTokens, createOrUpdateConnection } = require('../utils/integrations/oauthUtils');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const IntegrationMonitoringService = require('../utils/integrations/integrationMonitoringService');
const GoogleClient = require('../utils/integrations/googleClient');
const Asset = require('../models/Asset');

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
    logger.warn('Integration not found', { integrationId: req.params.id });
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
    .populate('integrationId', 'name description icon category');

  logger.info('User connections retrieved successfully', { count: connections.length, userId: req.user.id });
  
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
  
  const { integrationId, redirectUri } = req.body;
  
  if (!integrationId) {
    throw new APIError('Integration ID is required', 400);
  }
  
  // Find the integration by either _id or key
  let integration;
  if (mongoose.Types.ObjectId.isValid(integrationId)) {
    // If it's a valid ObjectId, search by _id
    integration = await Integration.findById(integrationId);
  } else {
    // Otherwise, search by key
    integration = await Integration.findOne({ key: integrationId });
  }
  
  if (!integration) {
    logger.warn('Integration not found for connection', { integrationId });
    throw new APIError('Integration not found', 404);
  }
  
  // Use the redirect URI from the integration config, or fallback to request-based URI
  const finalRedirectUri = redirectUri || integration.redirectUri || `${req.protocol}://${req.get('host')}/integrations/callback`;
  
  // Generate proper OAuth authorization URL based on integration type
  let authorizationUrl;
  
  switch (integration.key) {
    case 'facebook':
      // Facebook OAuth URL
      authorizationUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${integration.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(','))}&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
      break;
      
    case 'instagram':
      // Instagram OAuth URL (through Facebook)
      authorizationUrl = `https://api.instagram.com/oauth/authorize?` +
        `client_id=${integration.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(','))}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
      break;
      
    case 'tiktok':
      // TikTok OAuth URL
      authorizationUrl = `https://www.tiktok.com/auth/authorize?` +
        `client_key=${integration.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(','))}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
      break;
      
    case 'youtube':
      // YouTube OAuth URL (Google)
      authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${integration.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(' '))}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
      break;
      
    case 'google-drive':
      // Google Drive OAuth URL
      authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${integration.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(' '))}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
      break;
      
    default:
      // Fallback for other integrations
      authorizationUrl = `${req.protocol}://${req.get('host')}/oauth/${integration.key}?` +
        `client_id=${integration.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(integration.scopes.join(','))}&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
  }
  
  logger.info('Integration connection initiated', { integrationId: integration._id, userId: req.user.id });
  
  res.status(200).json({
    success: true,
    data: { authorizationUrl }
  });
});

// @desc    Exchange OAuth code for tokens
// @route   POST /api/integrations/exchange
// @access  Private
exports.exchangeCodeForTokens = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for exchangeCodeForTokens request');
    throw new APIError('Database not available', 503);
  }
  
  const { integrationId, code, redirectUri } = req.body;
  
  if (!integrationId || !code) {
    throw new APIError('Integration ID and authorization code are required', 400);
  }
  
  // Find the integration by either _id or key
  let integration;
  if (mongoose.Types.ObjectId.isValid(integrationId)) {
    // If it's a valid ObjectId, search by _id
    integration = await Integration.findById(integrationId);
  } else {
    // Otherwise, search by key
    integration = await Integration.findOne({ key: integrationId });
  }
  
  if (!integration) {
    logger.warn('Integration not found for token exchange', { integrationId });
    throw new APIError('Integration not found', 404);
  }
  
  // Use the redirect URI from the request body, or fallback to the one from the integration config
  const finalRedirectUri = redirectUri || integration.redirectUri || `${req.protocol}://${req.get('host')}/integrations/callback`;
  
  // Exchange the code for tokens using the appropriate provider
  const tokenData = await exchangeCodeForTokens(integration.key, code, finalRedirectUri);
  
  // Create or update the connection
  const connection = await createOrUpdateConnection(integration, req.user.id, tokenData);
  
  logger.info('Tokens exchanged successfully', { integrationId: integration._id, userId: req.user.id });
  
  res.status(200).json({
    success: true,
    data: connection
  });
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
  
  const connection = await IntegrationConnection.findById(req.params.id);

  if (!connection) {
    logger.warn('Integration connection not found for disconnection', { connectionId: req.params.id });
    throw new APIError(`Integration connection not found with id of ${req.params.id}`, 404);
  }

  // Check if user owns this connection
  if (connection.userId.toString() !== req.user.id) {
    logger.warn('Unauthorized integration disconnection attempt', { 
      userId: req.user.id, 
      connectionId: req.params.id
    });
    throw new APIError('Not authorized to disconnect this integration', 401);
  }

  await connection.remove();

  logger.info('Integration disconnected successfully', { connectionId: connection._id, userId: req.user.id });
  
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
  
  const connection = await IntegrationConnection.findById(req.params.id);

  if (!connection) {
    logger.warn('Integration connection not found for refresh', { connectionId: req.params.id });
    throw new APIError(`Integration connection not found with id of ${req.params.id}`, 404);
  }

  // Check if user owns this connection
  if (connection.userId.toString() !== req.user.id) {
    logger.warn('Unauthorized integration refresh attempt', { 
      userId: req.user.id, 
      connectionId: req.params.id
    });
    throw new APIError('Not authorized to refresh this integration connection', 401);
  }

  // Get the integration details
  const integration = await Integration.findById(connection.integrationId);
  
  if (!integration) {
    logger.warn('Integration not found for refresh', { integrationId: connection.integrationId });
    throw new APIError('Integration not found', 404);
  }

  // Refresh the OAuth tokens
  const tokenData = await refreshOAuthTokens(integration.key, connection.refreshToken);
  
  // Update the connection with new tokens
  connection.accessToken = tokenData.access_token;
  connection.refreshToken = tokenData.refresh_token || connection.refreshToken;
  
  if (tokenData.expires_in) {
    connection.expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
  }
  
  connection.metadata = {
    ...connection.metadata,
    tokenType: tokenData.token_type || null,
    expiresIn: tokenData.expires_in || null
  };
  
  await connection.save();

  logger.info('Integration connection refreshed successfully', { connectionId: connection._id, userId: req.user.id });
  
  res.status(200).json({
    success: true,
    data: connection
  });
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
  
  const connection = await IntegrationConnection.findById(req.params.id);

  if (!connection) {
    logger.warn('Integration connection not found for status check', { connectionId: req.params.id });
    throw new APIError(`Integration connection not found with id of ${req.params.id}`, 404);
  }

  // Check if user owns this connection
  if (connection.userId.toString() !== req.user.id) {
    logger.warn('Unauthorized connection status check attempt', { 
      userId: req.user.id, 
      connectionId: req.params.id
    });
    throw new APIError('Not authorized to check this integration connection', 401);
  }

  // Check if the connection is expired
  let connected = true;
  let message = 'Connection is active';
  
  if (connection.expiresAt && connection.expiresAt < new Date()) {
    connected = false;
    message = 'Connection has expired';
  }

  logger.info('Connection status checked', { connectionId: connection._id, connected, userId: req.user.id });
  
  res.status(200).json({
    success: true,
    data: {
      connected,
      message,
      expiresAt: connection.expiresAt
    }
  });
});

// @desc    Upload file to Google Drive
// @route   POST /api/integrations/google-drive/upload
// @access  Private
exports.uploadToGoogleDrive = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for Google Drive upload request');
    throw new APIError('Database not available', 503);
  }
  
  const { fileData, parentId } = req.body;
  
  if (!fileData || !fileData.content) {
    throw new APIError('File data is required', 400);
  }
  
  // Find Google Drive integration connection for the user
  const integration = await Integration.findOne({ key: 'google-drive' });
  
  if (!integration) {
    logger.warn('Google Drive integration not found');
    throw new APIError('Google Drive integration not found', 404);
  }
  
  const connection = await IntegrationConnection.findOne({ 
    userId: req.user.id, 
    integrationId: integration._id 
  });
  
  if (!connection) {
    logger.warn('Google Drive connection not found for user', { userId: req.user.id });
    throw new APIError('Google Drive not connected. Please connect your Google Drive account first.', 400);
  }
  
  // Check if the connection is expired
  if (connection.expiresAt && connection.expiresAt < new Date()) {
    logger.warn('Google Drive connection has expired', { connectionId: connection._id });
    throw new APIError('Google Drive connection has expired. Please refresh the connection.', 400);
  }
  
  try {
    // Create Google Client with access token
    const googleClient = new GoogleClient(connection.accessToken);
    
    // Upload file to Google Drive
    const uploadData = {
      name: fileData.name || 'Uploaded File',
      mimeType: fileData.mimeType || 'application/octet-stream',
      content: fileData.content,
      parents: parentId ? [parentId] : []
    };
    
    const driveResponse = await googleClient.uploadDriveFile(uploadData);
    
    // Create asset record in our database
    const assetData = {
      name: fileData.name || driveResponse.name || 'Google Drive File',
      url: `https://drive.google.com/file/d/${driveResponse.id}/view`,
      mimeType: fileData.mimeType || driveResponse.mimeType || 'application/octet-stream',
      size: fileData.size || 0,
      kind: fileData.kind || 'DOC',
      uploadedBy: req.user.id,
      metadata: {
        driveId: driveResponse.id,
        integration: 'google-drive'
      }
    };
    
    const asset = await Asset.create(assetData);
    
    logger.info('File uploaded to Google Drive successfully', { 
      assetId: asset._id, 
      driveFileId: driveResponse.id, 
      userId: req.user.id 
    });
    
    res.status(201).json({
      success: true,
      data: asset
    });
  } catch (error) {
    logger.error('Error uploading file to Google Drive', { 
      error: error.message,
      userId: req.user.id
    });
    
    // If it's an auth error, mark the connection as expired
    if (error.response?.status === 401 || error.response?.status === 403) {
      connection.expiresAt = new Date();
      await connection.save();
    }
    
    throw new APIError(`Failed to upload file to Google Drive: ${error.message}`, 500);
  }
});

// @desc    Get integration health metrics
// @route   GET /api/integrations/metrics/health
// @access  Private
exports.getIntegrationMetrics = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getIntegrationMetrics request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Create integration monitoring service instance
    const monitoringService = new IntegrationMonitoringService();
    
    // Fetch actual metrics from the monitoring service
    const metrics = await monitoringService.getHealthMetrics();
    
    logger.info('Integration metrics retrieved successfully', { userId: req.user.id });
    
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching integration metrics', { 
      userId: req.user.id, 
      error: error.message 
    });
    throw new APIError('Failed to fetch integration metrics', 500);
  }
});

// @desc    Initialize integrations collection with default integrations
// @route   POST /api/integrations/initialize
// @access  Private (Admin only)
exports.initializeIntegrations = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for initializeIntegrations request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Define the default integrations
    const defaultIntegrations = [
      {
        name: 'Instagram',
        description: 'Connect your Instagram Business account',
        key: 'instagram',
        icon: 'instagram',
        category: 'social',
        clientId: 'instagram_client_id',
        clientSecret: 'instagram_client_secret',
        redirectUri: 'http://localhost:5173/integrations/callback',
        scopes: ['read', 'write'],
        enabled: true
      },
      {
        name: 'Facebook',
        description: 'Manage Facebook Pages and ads',
        key: 'facebook',
        icon: 'facebook',
        category: 'social',
        clientId: '2302564490171864',
        clientSecret: '46f1bebd6df4f4f8a3171e36e81c8981',
        redirectUri: 'http://localhost:5173/integrations/callback',
        scopes: ['read', 'write'],
        enabled: true
      },
      {
        name: 'TikTok',
        description: 'Schedule and publish TikTok videos',
        key: 'tiktok',
        icon: 'tiktok',
        category: 'social',
        clientId: 'tiktok_client_id',
        clientSecret: 'tiktok_client_secret',
        redirectUri: 'http://localhost:5173/integrations/callback',
        scopes: ['read', 'write'],
        enabled: true
      },
      {
        name: 'YouTube',
        description: 'Upload and manage YouTube content',
        key: 'youtube',
        icon: 'youtube',
        category: 'social',
        clientId: '814259904377-39llm6tbn6okqlvucn6lrototb29t3f4.apps.googleusercontent.com',
        clientSecret: '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',
        redirectUri: 'http://localhost:8080/integrations/callback',
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
        clientId: '814259904377-39llm6tbn6okqlvucn6lrototb29t3f4.apps.googleusercontent.com',
        clientSecret: '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',
        redirectUri: 'http://localhost:8080/integrations/callback',
        scopes: [
          'https://www.googleapis.com/auth/drive'
        ],
        enabled: true
      }
    ];
    
    // Remove existing integrations
    await Integration.deleteMany({});
    
    // Insert the default integrations
    const integrations = await Integration.insertMany(defaultIntegrations);
    
    logger.info('Integrations collection initialized successfully', { count: integrations.length });
    
    res.status(200).json({
      success: true,
      message: 'Integrations collection initialized successfully',
      count: integrations.length,
      data: integrations
    });
  } catch (error) {
    logger.error('Error initializing integrations collection', { error: error.message });
    throw new APIError('Failed to initialize integrations collection', 500);
  }
});