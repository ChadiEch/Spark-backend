const axios = require('axios');
const Integration = require('../../models/Integration');
const IntegrationConnection = require('../../models/IntegrationConnection');
const Logger = require('../logger');
const { recordAPICall, recordError } = require('./monitoring');

const logger = new Logger('oauth-utils');

/**
 * Exchange OAuth code for tokens for different providers
 * @param {string} integrationKey - The integration key (e.g., 'facebook', 'instagram')
 * @param {string} code - The authorization code received from OAuth flow
 * @param {string} redirectUri - The redirect URI used in the OAuth flow
 * @returns {Promise<Object>} - The token response
 */
const exchangeCodeForTokens = async (integrationKey, code, redirectUri) => {
  const startTime = Date.now();
  try {
    // Find the integration by key
    const integration = await Integration.findOne({ key: integrationKey });
    
    if (!integration) {
      throw new Error(`Integration not found for key: ${integrationKey}`);
    }

    let tokenResponse;
    
    logger.info('Exchanging code for tokens', { 
      integrationKey, 
      code: code ? 'present' : 'missing',
      redirectUri,
      clientId: integration.clientId ? 'present' : 'missing'
    });
    
    switch (integrationKey) {
      case 'facebook':
      case 'instagram':
        // Facebook/Instagram token exchange
        logger.info('Exchanging code with Facebook/Instagram', { 
          clientId: integration.clientId,
          redirectUri
        });
        tokenResponse = await axios.post('https://graph.facebook.com/v18.0/oauth/access_token', {
          client_id: integration.clientId,
          client_secret: integration.clientSecret,
          redirect_uri: redirectUri,
          code: code
        });
        break;
        
      case 'tiktok':
        // TikTok token exchange
        logger.info('Exchanging code with TikTok', { 
          clientKey: integration.clientId,
          redirectUri
        });
        tokenResponse = await axios.post('https://open-api.tiktok.com/oauth/access_token/', {
          client_key: integration.clientId,
          client_secret: integration.clientSecret,
          code: code,
          grant_type: 'authorization_code'
        });
        break;
        
      case 'youtube':
      case 'google-drive':
        // Google OAuth token exchange
        logger.info('Exchanging code with Google', { 
          clientId: integration.clientId,
          redirectUri
        });
        tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: integration.clientId,
          client_secret: integration.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code: code
        });
        break;
        
      default:
        throw new Error(`Unsupported integration: ${integrationKey}`);
    }
    
    logger.info('Token exchange response received', { 
      integrationKey, 
      status: tokenResponse.status,
      dataKeys: Object.keys(tokenResponse.data),
      hasAccessToken: !!tokenResponse.data.access_token,
      hasRefreshToken: !!tokenResponse.data.refresh_token
    });
    
    // Record successful API call
    recordAPICall(integrationKey, 'oauth/token', Date.now() - startTime, true);
    
    return tokenResponse.data;
  } catch (error) {
    // Record error
    recordError(integrationKey, 'oauth/token', error.message);
    
    logger.error('Error exchanging OAuth code for tokens', { 
      integrationKey, 
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

/**
 * Refresh OAuth tokens for different providers
 * @param {string} integrationKey - The integration key
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} - The refreshed token response
 */
const refreshOAuthTokens = async (integrationKey, refreshToken) => {
  const startTime = Date.now();
  try {
    // Find the integration by key
    const integration = await Integration.findOne({ key: integrationKey });
    
    if (!integration) {
      throw new Error(`Integration not found for key: ${integrationKey}`);
    }

    let tokenResponse;
    
    switch (integrationKey) {
      case 'facebook':
      case 'instagram':
        // Facebook/Instagram token refresh
        tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: integration.clientId,
            client_secret: integration.clientSecret,
            fb_exchange_token: refreshToken
          }
        });
        break;
        
      case 'tiktok':
        // TikTok token refresh
        tokenResponse = await axios.post('https://open-api.tiktok.com/oauth/refresh_token/', {
          client_key: integration.clientId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        });
        break;
        
      case 'youtube':
      case 'google-drive':
        // Google OAuth token refresh
        tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: integration.clientId,
          client_secret: integration.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        });
        break;
        
      default:
        throw new Error(`Unsupported integration: ${integrationKey}`);
    }
    
    // Record successful API call
    recordAPICall(integrationKey, 'oauth/refresh', Date.now() - startTime, true);
    
    return tokenResponse.data;
  } catch (error) {
    // Record error
    recordError(integrationKey, 'oauth/refresh', error.message);
    
    logger.error('Error refreshing OAuth tokens', { 
      integrationKey, 
      error: error.message,
      response: error.response?.data
    });
    
    // Throw a more specific error that can be handled by the calling function
    throw new Error(`Failed to refresh ${integrationKey} tokens: ${error.message}`);
  }
};

/**
 * Create or update an integration connection with tokens
 * @param {Object} integration - The integration document
 * @param {string} userId - The user ID
 * @param {Object} tokenData - The token data from OAuth exchange
 * @returns {Promise<IntegrationConnection>} - The created/updated connection
 */
const createOrUpdateConnection = async (integration, userId, tokenData) => {
  try {
    logger.info('Creating or updating integration connection', { 
      integrationId: integration._id, 
      integrationKey: integration.key,
      userId,
      tokenDataKeys: Object.keys(tokenData),
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token
    });
    
    // Calculate expiration time
    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + (tokenData.expires_in * 1000))
      : null;
    
    // Prepare connection data
    const connectionData = {
      integrationId: integration._id,
      userId: userId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresAt: expiresAt,
      scope: tokenData.scope || null,
      metadata: {
        tokenType: tokenData.token_type || null,
        expiresIn: tokenData.expires_in || null
      }
    };

    // Check if connection already exists
    let connection = await IntegrationConnection.findOne({
      integrationId: integration._id,
      userId: userId
    });

    if (connection) {
      logger.info('Updating existing integration connection', { 
        connectionId: connection._id,
        integrationId: integration._id, 
        userId 
      });
      // Update existing connection
      Object.assign(connection, connectionData);
      await connection.save();
      logger.info('Updated existing integration connection', { 
        connectionId: connection._id,
        integrationId: integration._id, 
        userId 
      });
    } else {
      logger.info('Creating new integration connection', { 
        integrationId: integration._id, 
        userId 
      });
      // Create new connection
      connection = new IntegrationConnection(connectionData);
      await connection.save();
      logger.info('Created new integration connection', { 
        connectionId: connection._id,
        integrationId: integration._id, 
        userId 
      });
    }

    // Populate integration details
    await connection.populate('integrationId', 'name description icon category');

    return connection;
  } catch (error) {
    logger.error('Error creating/updating integration connection', { 
      integrationId: integration._id, 
      userId, 
      error: error.message 
    });
    throw error;
  }
};

module.exports = {
  exchangeCodeForTokens,
  refreshOAuthTokens,
  createOrUpdateConnection
};