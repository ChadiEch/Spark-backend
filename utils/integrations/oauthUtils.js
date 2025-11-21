const axios = require('axios');
const Integration = require('../../models/Integration');
const IntegrationConnection = require('../../models/IntegrationConnection');
const Logger = require('../logger');
const { recordAPICall, recordError } = require('./monitoring');

const logger = new Logger('oauth-utils');

/**
 * Map integration keys to their corresponding environment variable names.
 * We prefer using environment variables because client secrets stored in Mongo
 * are now hashed for security and therefore cannot be used directly in OAuth calls.
 */
const credentialEnvMap = {
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET
  },
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID,
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET
  },
  tiktok: {
    clientId: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET
  },
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET
  },
  'google-drive': {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET
  }
};

/**
 * Resolve OAuth credentials for an integration, preferring environment variables
 * and falling back to database values when available and not hashed.
 */
const getIntegrationCredentials = (integrationKey, integration) => {
  const envCredentials = credentialEnvMap[integrationKey] || {};
  
  const resolvedClientId = envCredentials.clientId || integration?.clientId;
  let resolvedClientSecret = envCredentials.clientSecret || integration?.clientSecret;

  // Detect bcrypt hashes (start with $2) and treat them as unusable secrets.
  if (!envCredentials.clientSecret && resolvedClientSecret && resolvedClientSecret.startsWith('$2')) {
    logger.warn('Detected hashed client secret without environment override', { integrationKey });
    resolvedClientSecret = null;
  }

  if (!resolvedClientId || !resolvedClientSecret) {
    throw new Error(
      `Missing OAuth credentials for integration "${integrationKey}". ` +
      `Ensure the appropriate environment variables are configured.`
    );
  }

  return { clientId: resolvedClientId, clientSecret: resolvedClientSecret };
};

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
    
    const { clientId, clientSecret } = getIntegrationCredentials(integrationKey, integration);
    
    // === TOKEN EXCHANGE DEBUGGING ===
    logger.info("=== TOKEN EXCHANGE DEBUGGING ===");
    logger.info('Exchanging code for tokens', { 
      integrationKey, 
      code: code ? 'present' : 'missing',
      redirectUri,
      clientId: clientId ? 'present' : 'missing',
      clientSecret: clientSecret ? 'present' : 'missing'
    });
    
    // Log the exact request data we're sending
    logger.info('OAuth token exchange request details', {
      integrationKey,
      redirectUri,
      clientId: clientId ? `${clientId.substring(0, 5)}...` : 'missing'
    });
    
    switch (integrationKey) {
      case 'facebook':
      case 'instagram':
        // Facebook/Instagram token exchange
        logger.info('Exchanging code with Facebook/Instagram', { 
          clientId,
          redirectUri
        });
        tokenResponse = await axios.post('https://graph.facebook.com/v18.0/oauth/access_token', {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: code
        });
        break;
        
      case 'tiktok':
        // TikTok token exchange
        logger.info('Exchanging code with TikTok', { 
          clientKey: clientId,
          redirectUri
        });
        tokenResponse = await axios.post('https://open-api.tiktok.com/oauth/access_token/', {
          client_key: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code'
        });
        break;
        
      case 'youtube':
      case 'google-drive':
        // Google OAuth token exchange
        logger.info('Exchanging code with Google', { 
          clientId,
          redirectUri
        });
        tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: clientId,
          client_secret: clientSecret,
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
    
    // Log the actual token data (without sensitive information)
    if (tokenResponse.data) {
      const safeData = { ...tokenResponse.data };
      if (safeData.access_token) {
        safeData.access_token = `${safeData.access_token.substring(0, 10)}...`;
      }
      if (safeData.refresh_token) {
        safeData.refresh_token = `${safeData.refresh_token.substring(0, 10)}...`;
      }
      logger.info('Token exchange response data (sanitized)', safeData);
    }
    
    // Validate token data
    if (!tokenResponse.data || !tokenResponse.data.access_token) {
      throw new Error(`Invalid token response from ${integrationKey}: ${JSON.stringify(tokenResponse.data)}`);
    }
    
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
      status: error.response?.status,
      stack: error.stack
    });
    
    // If we got a response from the OAuth provider, include that in the error
    if (error.response) {
      logger.error('OAuth provider error details', {
        integrationKey,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
      
      // Create a more detailed error message
      const errorMessage = `OAuth provider error (${error.response.status}): ${JSON.stringify(error.response.data)}`;
      throw new Error(errorMessage);
    }
    
    // Handle network errors or other issues
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      logger.error('Network error during OAuth token exchange', { 
        integrationKey, 
        error: error.message,
        code: error.code
      });
      throw new Error(`Network error connecting to OAuth provider: ${error.message}`);
    }
    
    // Handle axios errors specifically
    if (error.isAxiosError) {
      logger.error('Axios error during OAuth token exchange', {
        integrationKey,
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error(`OAuth provider error: ${error.message}`);
    }
    
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
    
    const { clientId, clientSecret } = getIntegrationCredentials(integrationKey, integration);
    
    switch (integrationKey) {
      case 'facebook':
      case 'instagram':
        // Facebook/Instagram token refresh
        tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: clientId,
            client_secret: clientSecret,
            fb_exchange_token: refreshToken
          }
        });
        break;
        
      case 'tiktok':
        // TikTok token refresh
        tokenResponse = await axios.post('https://open-api.tiktok.com/oauth/refresh_token/', {
          client_key: clientId,
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        });
        break;
        
      case 'youtube':
      case 'google-drive':
        // Google OAuth token refresh
        tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: clientId,
          client_secret: clientSecret,
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
    
    // Validate required token data
    if (!tokenData.access_token) {
      throw new Error('Access token is missing from OAuth response');
    }
    
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

    logger.info('Connection data prepared', { 
      integrationId: integration._id, 
      userId,
      hasAccessToken: !!connectionData.accessToken,
      hasRefreshToken: !!connectionData.refreshToken,
      expiresAt: expiresAt ? expiresAt.toISOString() : 'NEVER'
    });

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
      logger.info('Created new integration connection and saved to database', { 
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
      error: error.message,
      stack: error.stack
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