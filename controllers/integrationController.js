const mongoose = require('mongoose');
const Integration = require('../models/Integration');
const IntegrationConnection = require('../models/IntegrationConnection');
const { exchangeCodeForTokens, refreshOAuthTokens, createOrUpdateConnection, getIntegrationCredentials } = require('../utils/integrations/oauthUtils');
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

// @desc    Initiate OAuth connection for an integration
// @route   POST /api/integrations/connect
// @access  Private
exports.connectIntegration = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for connectIntegration request');
    throw new APIError('Database not available', 503);
  }
  
  const { integrationId, redirectUri } = req.body;
  
  // Validate required fields
  if (!integrationId) {
    logger.warn('Missing integrationId for connection request');
    return res.status(400).json({
      success: false,
      message: 'Integration ID is required'
    });
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
    logger.warn('Integration not found for connection request', { integrationId });
    return res.status(404).json({
      success: false,
      message: 'Integration not found'
    });
  }
  
  logger.info('Found integration for connection', { 
    integrationKey: integration.key, 
    integrationName: integration.name,
    integrationRedirectUri: integration.redirectUri
  });
  
  // Use the redirect URI from the request body, or fallback to the one from the integration config
  // Prioritize the redirect URI from the frontend request to match OAuth provider configuration
  // Always default to the production backend callback URL if nothing is provided
  const defaultRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
  const finalRedirectUri = redirectUri || integration.redirectUri || defaultRedirectUri;
  
  logger.info('Using redirect URI for OAuth authorization', { 
    finalRedirectUri, 
    providedRedirectUri: redirectUri,
    integrationRedirectUri: integration.redirectUri,
    defaultRedirectUri
  });
  
  // Log the client ID being used
  logger.info('Using client ID for OAuth authorization', { 
    clientId: integration.clientId ? `${integration.clientId.substring(0, 30)}...` : 'MISSING',
    integrationKey: integration.key
  });

  // Generate proper OAuth authorization URL based on integration type
  let authorizationUrl;
  
  switch (integration.key) {
    case 'facebook':
      // Facebook OAuth URL
      const facebookCredentials = getIntegrationCredentials('facebook', integration);
      authorizationUrl = `https://www.facebook.com/v24.0/dialog/oauth?` +
        `client_id=${facebookCredentials.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(','))}&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
      break;
      
    case 'instagram':
      // Instagram OAuth URL (through Facebook)
      const instagramCredentials = getIntegrationCredentials('instagram', integration);
      authorizationUrl = `https://api.instagram.com/oauth/authorize?` +
        `client_id=${instagramCredentials.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(','))}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
      break;
      
    case 'tiktok':
      // TikTok OAuth URL
      const tiktokCredentials = getIntegrationCredentials('tiktok', integration);
      authorizationUrl = `https://www.tiktok.com/auth/authorize?` +
        `client_key=${tiktokCredentials.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(','))}&` +
        `response_type=code&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
      break;
      
    case 'youtube':
      // YouTube OAuth URL (Google)
      const youtubeCredentials = getIntegrationCredentials('youtube', integration);
      authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${youtubeCredentials.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(' '))}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
      
      // Log the specific redirect URI being used for YouTube
      logger.info('YouTube OAuth redirect_uri', { 
        redirectUri: finalRedirectUri,
        encodedRedirectUri: encodeURIComponent(finalRedirectUri)
      });
      break;
      
    case 'google-drive':
      // Google Drive OAuth URL
      const googleDriveCredentials = getIntegrationCredentials('google-drive', integration);
      authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleDriveCredentials.clientId}&` +
        `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
        `scope=${encodeURIComponent(integration.scopes.join(' '))}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(JSON.stringify({ integrationId: integration._id, userId: req.user.id }))}`;
      
      // Log the specific redirect URI being used for Google Drive
      logger.info('Google Drive OAuth redirect_uri', { 
        redirectUri: finalRedirectUri,
        encodedRedirectUri: encodeURIComponent(finalRedirectUri)
      });
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
  
  logger.info('Generated OAuth authorization URL', { 
    integrationKey: integration.key,
    authorizationUrl: authorizationUrl.substring(0, 200) + '...' // Log more chars to see redirect_uri
  });
  
  res.status(200).json({
    success: true,
    data: { authorizationUrl }
  });
});

// @desc    Exchange OAuth code for tokens
// @route   POST /api/integrations/exchange
// @access  Public (during OAuth callback flow)
exports.exchangeCodeForTokens = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for exchangeCodeForTokens request');
    throw new APIError('Database not available', 503);
  }
  
  const { integrationId, code, redirectUri, state } = req.body;
  
  // Log the incoming request
  logger.info('Received OAuth code exchange request', { 
    integrationId: !!integrationId, 
    code: !!code,
    redirectUri: redirectUri ? `${redirectUri.substring(0, 100)}...` : 'MISSING',
    state: state ? `${state.substring(0, 50)}...` : 'MISSING'
  });
  
  // Validate required fields
  if (!integrationId || !code) {
    logger.warn('Missing required fields for token exchange', { integrationId: !!integrationId, code: !!code });
    return res.status(400).json({
      success: false,
      message: 'Integration ID and authorization code are required'
    });
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
    return res.status(404).json({
      success: false,
      message: 'Integration not found'
    });
  }
  
  logger.info('Found integration for token exchange', { 
    integrationKey: integration.key, 
    integrationName: integration.name
  });
  
  // Use the redirect URI from the request body, or fallback to the one from the integration config
  // Prioritize the redirect URI from the frontend request to match OAuth provider configuration
  // Always default to the production backend callback URL if nothing is provided
  const defaultRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
  const finalRedirectUri = redirectUri || integration.redirectUri || defaultRedirectUri;
  
  logger.info('Using redirect URI for token exchange', { 
    finalRedirectUri, 
    providedRedirectUri: redirectUri,
    integrationRedirectUri: integration.redirectUri
  });
  
  // Log the specific redirect URI being used for Google integrations
  if (integration.key === 'google-drive' || integration.key === 'youtube') {
    logger.info('Google integration token exchange redirect_uri', { 
      redirectUri: finalRedirectUri,
      encodedRedirectUri: encodeURIComponent(finalRedirectUri)
    });
  }
  
  try {
    // Exchange the code for tokens using the appropriate provider
    logger.info('Attempting to exchange code for tokens', { 
      integrationKey: integration.key
    });
    
    const tokenData = await exchangeCodeForTokens(integration.key, code, finalRedirectUri);
    
    logger.info('Token exchange response received', { 
      integrationKey: integration.key,
      tokenDataKeys: Object.keys(tokenData),
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token
    });
    
    // Log the actual token data (without sensitive information)
    if (tokenData) {
      const safeData = { ...tokenData };
      if (safeData.access_token) {
        safeData.access_token = `${safeData.access_token.substring(0, 10)}...`;
      }
      if (safeData.refresh_token) {
        safeData.refresh_token = `${safeData.refresh_token.substring(0, 10)}...`;
      }
      logger.info('Token exchange response data (sanitized)', safeData);
    }
    
    // Validate token data
    if (!tokenData.access_token) {
      logger.error('No access token in response', { 
        integrationKey: integration.key,
        tokenDataKeys: Object.keys(tokenData)
      });
      return res.status(500).json({
        success: false,
        message: 'No access token received from OAuth provider'
      });
    }
    
    // Extract userId from the state parameter if provided
    let userId = req.body.userId;
    
    // If userId is not in the request body, try to extract it from the state parameter
    if (!userId && state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        userId = stateData.userId;
        logger.info('Extracted userId from state parameter', { userId });
      } catch (parseError) {
        logger.warn('Failed to parse state parameter', { 
          integrationKey: integration.key,
          state,
          error: parseError.message
        });
      }
    }
    
    // If we still don't have a userId, we can't proceed
    if (!userId) {
      logger.warn('No userId provided for token exchange', { integrationKey: integration.key });
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Create or update the connection
    logger.info('Creating or updating integration connection', { 
      integrationKey: integration.key, 
      userId: userId
    });
    
    const connection = await createOrUpdateConnection(integration, userId, tokenData);
    
    logger.info('Tokens exchanged successfully and connection saved to database', { 
      integrationId: integration._id, 
      userId: userId,
      connectionId: connection._id
    });
    
    // Send success response with redirect URL
    return res.status(200).json({
      success: true,
      data: connection,
      redirectUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/settings?tab=integrations` : 'http://localhost:5173/settings?tab=integrations'
    });
  } catch (error) {
    logger.error('Error during token exchange', { 
      integrationKey: integration.key, 
      error: error.message,
      stack: error.stack
    });
    
    // Send error response with more details
    return res.status(500).json({
      success: false,
      message: 'Failed to connect integration',
      error: error.message,
      // Don't expose sensitive information in production
      ...(process.env.NODE_ENV === 'development' && { errorDetails: error.message })
    });
  }
});

// @desc    Handle OAuth callback directly
// @route   GET /api/integrations/callback
// @access  Public (during OAuth callback flow)
exports.handleOAuthCallback = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for handleOAuthCallback request');
    throw new APIError('Database not available', 503);
  }
  
  const { code, state, error } = req.query;
  
  // Log the incoming callback
  logger.info('Received OAuth callback', { 
    code: !!code,
    state: state ? `${state.substring(0, 50)}...` : 'MISSING',
    error: error || 'NONE'
  });
  
  // Check for OAuth errors
  if (error) {
    logger.warn('OAuth provider returned an error', { error });
    return res.status(400).json({
      success: false,
      message: `OAuth error: ${error}`
    });
  }
  
  // Validate required fields
  if (!code || !state) {
    logger.warn('Missing required fields in OAuth callback', { code: !!code, state: !!state });
    return res.status(400).json({
      success: false,
      message: 'Authorization code and state are required'
    });
  }
  
  // Parse state to get integration ID and user ID
  let stateData;
  try {
    stateData = JSON.parse(decodeURIComponent(state));
    logger.info('Parsed state data', { 
      integrationId: stateData.integrationId,
      userId: stateData.userId
    });
  } catch (parseError) {
    logger.error('Failed to parse state parameter', { 
      state,
      error: parseError.message
    });
    return res.status(400).json({
      success: false,
      message: 'Invalid state parameter'
    });
  }
  
  const { integrationId, userId } = stateData;
  
  if (!integrationId || !userId) {
    logger.warn('Missing integrationId or userId in state', { integrationId: !!integrationId, userId: !!userId });
    return res.status(400).json({
      success: false,
      message: 'Invalid state parameter: missing integrationId or userId'
    });
  }
  
  // Find the integration
  let integration;
  if (mongoose.Types.ObjectId.isValid(integrationId)) {
    // If it's a valid ObjectId, search by _id
    integration = await Integration.findById(integrationId);
  } else {
    // Otherwise, search by key
    integration = await Integration.findOne({ key: integrationId });
  }
  
  if (!integration) {
    logger.warn('Integration not found for OAuth callback', { integrationId });
    return res.status(404).json({
      success: false,
      message: 'Integration not found'
    });
  }
  
  logger.info('Found integration for OAuth callback', { 
    integrationKey: integration.key, 
    integrationName: integration.name
  });
  
  // Use the redirect URI from the integration config
  // Always default to the production backend callback URL if nothing is provided
  const defaultRedirectUri = 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback';
  const finalRedirectUri = integration.redirectUri || defaultRedirectUri;
  
  logger.info('Using redirect URI for OAuth callback processing', { 
    finalRedirectUri, 
    integrationRedirectUri: integration.redirectUri
  });
  
  // Log the specific redirect URI being used for Google integrations
  if (integration.key === 'google-drive' || integration.key === 'youtube') {
    logger.info('Google integration OAuth callback redirect_uri', { 
      redirectUri: finalRedirectUri,
      encodedRedirectUri: encodeURIComponent(finalRedirectUri)
    });
  }
  
  try {
    // Exchange the code for tokens using the appropriate provider
    logger.info('Attempting to exchange code for tokens via OAuth callback', { 
      integrationKey: integration.key
    });
    
    const tokenData = await exchangeCodeForTokens(integration.key, code, finalRedirectUri);
    
    logger.info('Token exchange response received via OAuth callback', { 
      integrationKey: integration.key,
      tokenDataKeys: Object.keys(tokenData),
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token
    });
    
    // Validate token data
    if (!tokenData.access_token) {
      logger.error('No access token in response via OAuth callback', { 
        integrationKey: integration.key,
        tokenDataKeys: Object.keys(tokenData)
      });
      return res.status(500).json({
        success: false,
        message: 'No access token received from OAuth provider'
      });
    }
    
    // Create or update the connection
    const connection = await createOrUpdateConnection(integration, userId, tokenData);
    
    logger.info('Connection created/updated via OAuth callback', { 
      connectionId: connection._id,
      integrationId: connection.integrationId,
      userId: connection.userId
    });
    
    // Redirect to frontend with success
    const frontendRedirectUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/settings?tab=integrations&success=true`
      : `http://localhost:5173/settings?tab=integrations&success=true`;
    
    logger.info('Redirecting to frontend after successful OAuth callback', { frontendRedirectUrl });
    res.redirect(frontendRedirectUrl);
  } catch (exchangeError) {
    logger.error('Error exchanging code for tokens via OAuth callback', { 
      integrationKey: integration.key,
      error: exchangeError.message,
      stack: exchangeError.stack
    });
    
    // Redirect to frontend with error
    const frontendRedirectUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/settings?tab=integrations&error=${encodeURIComponent(exchangeError.message)}`
      : `http://localhost:5173/settings?tab=integrations&error=${encodeURIComponent(exchangeError.message)}`;
    
    logger.info('Redirecting to frontend after failed OAuth callback', { frontendRedirectUrl });
    res.redirect(frontendRedirectUrl);
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
        clientId: process.env.INSTAGRAM_CLIENT_ID || 'instagram_client_id',
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || 'instagram_client_secret',
        redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
        scopes: ['read', 'write'],
        enabled: true
      },
      {
        name: 'Facebook',
        description: 'Manage Facebook Pages and ads',
        key: 'facebook',
        icon: 'facebook',
        category: 'social',
        clientId: process.env.FACEBOOK_CLIENT_ID || 'facebook_client_id',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || 'facebook_client_secret',
        redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
        scopes: ['read', 'write'],
        enabled: true
      },
      {
        name: 'TikTok',
        description: 'Schedule and publish TikTok videos',
        key: 'tiktok',
        icon: 'tiktok',
        category: 'social',
        clientId: process.env.TIKTOK_CLIENT_KEY || 'tiktok_client_key',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || 'tiktok_client_secret',
        redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
        scopes: ['read', 'write'],
        enabled: true
      },
      {
        name: 'YouTube',
        description: 'Upload and manage YouTube content',
        key: 'youtube',
        icon: 'youtube',
        category: 'social',
        clientId: process.env.YOUTUBE_CLIENT_ID || 'youtube_client_id',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || 'youtube_client_secret',
        redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
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
        clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || 'google_drive_client_id',
        clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'google_drive_client_secret',
        redirectUri: 'https://spark-backend-production-ab14.up.railway.app/api/integrations/callback',
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