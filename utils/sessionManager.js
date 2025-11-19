const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Logger = require('./logger');
const { refreshOAuthTokens } = require('./integrations/oauthUtils');
const IntegrationConnection = require('../models/IntegrationConnection');

const logger = new Logger('session-manager');

/**
 * Refresh user authentication token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} - New tokens
 */
const refreshAuthToken = async (refreshToken) => {
  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Find the user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate new tokens
    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });
    
    const newRefreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });
    
    logger.info('User authentication tokens refreshed', { userId: user._id });
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    logger.error('Error refreshing authentication token', { error: error.message });
    throw new Error('Invalid refresh token');
  }
};

/**
 * Refresh integration tokens if they're about to expire
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 */
const refreshIntegrationTokens = async (userId) => {
  try {
    // Find all integration connections for the user
    const connections = await IntegrationConnection.find({ userId });
    
    // Refresh tokens that are about to expire (within 24 hours)
    const now = new Date();
    const refreshThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    for (const connection of connections) {
      // Check if the connection has a refresh token and is about to expire
      if (connection.refreshToken && connection.expiresAt && connection.expiresAt < refreshThreshold) {
        try {
          logger.info('Refreshing integration tokens', { 
            integrationId: connection.integrationId, 
            userId: connection.userId 
          });
          
          // Get the integration details
          const integration = await connection.populate('integrationId').then(populated => populated.integrationId);
          
          if (!integration) {
            logger.warn('Integration not found for connection', { connectionId: connection._id });
            continue;
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
          
          logger.info('Integration tokens refreshed successfully', { 
            integrationId: connection.integrationId, 
            userId: connection.userId 
          });
        } catch (error) {
          logger.error('Error refreshing integration tokens', { 
            integrationId: connection.integrationId, 
            userId: connection.userId, 
            error: error.message 
          });
        }
      }
    }
  } catch (error) {
    logger.error('Error checking integration tokens for refresh', { userId, error: error.message });
  }
};

/**
 * Check if user session is valid
 * @param {string} token - The access token
 * @returns {Promise<Object>} - User information if valid
 */
const validateSession = async (token) => {
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    logger.error('Error validating session', { error: error.message });
    throw new Error('Invalid session');
  }
};

module.exports = {
  refreshAuthToken,
  refreshIntegrationTokens,
  validateSession
};