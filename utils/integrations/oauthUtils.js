const axios = require('axios');
const Integration = require('../../models/Integration');
const IntegrationConnection = require('../../models/IntegrationConnection');
const Logger = require('../logger');

const logger = new Logger('oauth-utils');

/**
 * Exchange OAuth code for tokens
 * @param {string} integrationKey - The integration key
 * @param {string} code - The OAuth code
 * @param {string} redirectUri - The redirect URI
 * @returns {Promise<Object>} - The token response
 */
const exchangeCodeForTokens = async (integrationKey, code, redirectUri) => {
  try {
    // Find the integration
    const integration = await Integration.findOne({ key: integrationKey });
    if (!integration) {
      throw new Error(`Integration not found: ${integrationKey}`);
    }

    // Prepare the token exchange request
    const tokenData = {
      client_id: integration.clientId,
      client_secret: integration.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    };

    // Exchange code for tokens based on integration type
    let tokenResponse;
    switch (integrationKey) {
      case 'google-drive':
      case 'youtube':
        tokenResponse = await axios.post('https://oauth2.googleapis.com/token', tokenData);
        break;
      case 'facebook':
      case 'instagram':
        tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: tokenData
        });
        break;
      default:
        throw new Error(`Unsupported integration: ${integrationKey}`);
    }

    logger.info('Successfully exchanged OAuth code for tokens', { integrationKey });
    return tokenResponse.data;
  } catch (error) {
    logger.error('Error exchanging OAuth code for tokens', { 
      error: error.message, 
      integrationKey 
    });
    throw error;
  }
};

/**
 * Refresh OAuth tokens
 * @param {string} integrationKey - The integration key
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} - The refreshed token response
 */
const refreshOAuthTokens = async (integrationKey, refreshToken) => {
  try {
    // Find the integration
    const integration = await Integration.findOne({ key: integrationKey });
    if (!integration) {
      throw new Error(`Integration not found: ${integrationKey}`);
    }

    // Prepare the token refresh request
    const refreshData = {
      client_id: integration.clientId,
      client_secret: integration.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    };

    // Refresh tokens based on integration type
    let tokenResponse;
    switch (integrationKey) {
      case 'google-drive':
      case 'youtube':
        tokenResponse = await axios.post('https://oauth2.googleapis.com/token', refreshData);
        break;
      case 'facebook':
      case 'instagram':
        tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: {
            ...refreshData,
            fb_exchange_token: refreshToken
          }
        });
        break;
      default:
        throw new Error(`Unsupported integration: ${integrationKey}`);
    }

    logger.info('Successfully refreshed OAuth tokens', { integrationKey });
    return tokenResponse.data;
  } catch (error) {
    logger.error('Error refreshing OAuth tokens', { 
      error: error.message, 
      integrationKey 
    });
    throw error;
  }
};

/**
 * Create or update an integration connection
 * @param {string} integrationId - The integration ID
 * @param {string} userId - The user ID
 * @param {Object} tokens - The token data
 * @returns {Promise<IntegrationConnection>} - The integration connection
 */
const createOrUpdateConnection = async (integrationId, userId, tokens) => {
  try {
    // Check if connection already exists
    let connection = await IntegrationConnection.findOne({ integrationId, userId });
    
    const connectionData = {
      integrationId,
      userId,
      accessToken: tokens.access_token || tokens.accessToken,
      refreshToken: tokens.refresh_token || tokens.refreshToken,
      expiresAt: tokens.expires_in ? new Date(Date.now() + (tokens.expires_in * 1000)) : undefined,
      scope: tokens.scope
    };

    if (connection) {
      // Update existing connection
      connection = await IntegrationConnection.findByIdAndUpdate(
        connection._id,
        connectionData,
        { new: true, runValidators: true }
      );
      logger.info('Updated existing integration connection', { integrationId, userId });
    } else {
      // Create new connection
      connection = new IntegrationConnection(connectionData);
      await connection.save();
      logger.info('Created new integration connection', { integrationId, userId });
    }

    return connection;
  } catch (error) {
    logger.error('Error creating/updating integration connection', { 
      error: error.message, 
      integrationId, 
      userId 
    });
    throw error;
  }
};

/**
 * Get integration credentials
 * @param {string} integrationKey - The integration key
 * @returns {Promise<Object>} - The integration credentials
 */
const getIntegrationCredentials = async (integrationKey) => {
  try {
    const integration = await Integration.findOne({ key: integrationKey });
    if (!integration) {
      throw new Error(`Integration not found: ${integrationKey}`);
    }

    return {
      clientId: integration.clientId,
      clientSecret: integration.clientSecret,
      redirectUri: integration.redirectUri,
      scopes: integration.scopes
    };
  } catch (error) {
    logger.error('Error getting integration credentials', { 
      error: error.message, 
      integrationKey 
    });
    throw error;
  }
};

module.exports = {
  exchangeCodeForTokens,
  refreshOAuthTokens,
  createOrUpdateConnection,
  getIntegrationCredentials
};