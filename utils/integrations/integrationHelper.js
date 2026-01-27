const Integration = require('../../models/Integration');
const IntegrationConnection = require('../../models/IntegrationConnection');
const Logger = require('../logger');

const logger = new Logger('integration-helper');

/**
 * Check if user has a specific integration connected
 * @param {string} userId - User ID
 * @param {string} integrationKey - Integration key (e.g., 'google-drive', 'youtube', 'facebook')
 * @returns {Promise<boolean>}
 */
async function isIntegrationConnected(userId, integrationKey) {
  try {
    const integration = await Integration.findOne({ key: integrationKey });
    if (!integration) {
      return false;
    }

    const connection = await IntegrationConnection.findOne({
      userId,
      integrationId: integration._id
    });

    return connection !== null;
  } catch (error) {
    logger.error('Error checking integration connection', { error: error.message, userId, integrationKey });
    return false;
  }
}

/**
 * Get user's connection for a specific integration
 * @param {string} userId - User ID
 * @param {string} integrationKey - Integration key
 * @returns {Promise<{integration: Object, connection: Object} | null>}
 */
async function getIntegrationConnection(userId, integrationKey) {
  try {
    const integration = await Integration.findOne({ key: integrationKey });
    if (!integration) {
      logger.warn('Integration not found', { integrationKey });
      return null;
    }

    const connection = await IntegrationConnection.findOne({
      userId,
      integrationId: integration._id
    });

    if (!connection) {
      logger.info('User has no connection for integration', { userId, integrationKey });
      return null;
    }

    return { integration, connection };
  } catch (error) {
    logger.error('Error getting integration connection', { error: error.message, userId, integrationKey });
    return null;
  }
}

/**
 * Get all connected integrations for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array<{key: string, name: string, connected: boolean, connection: Object}>>}
 */
async function getUserConnectedIntegrations(userId) {
  try {
    const integrations = await Integration.find({ isActive: true });
    const connections = await IntegrationConnection.find({ userId });

    const connectionMap = new Map();
    connections.forEach(conn => {
      connectionMap.set(conn.integrationId.toString(), conn);
    });

    return integrations.map(integration => ({
      key: integration.key,
      name: integration.name,
      connected: connectionMap.has(integration._id.toString()),
      connection: connectionMap.get(integration._id.toString()) || null
    }));
  } catch (error) {
    logger.error('Error getting user connected integrations', { error: error.message, userId });
    return [];
  }
}

/**
 * Check if user has any social media integration connected
 * @param {string} userId - User ID
 * @returns {Promise<{connected: boolean, platforms: string[]}>}
 */
async function checkSocialMediaConnections(userId) {
  const socialPlatforms = ['facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'linkedin'];
  const connectedPlatforms = [];

  for (const platform of socialPlatforms) {
    if (await isIntegrationConnected(userId, platform)) {
      connectedPlatforms.push(platform);
    }
  }

  return {
    connected: connectedPlatforms.length > 0,
    platforms: connectedPlatforms
  };
}

/**
 * Check if user has storage integration connected (Google Drive, Dropbox, etc.)
 * @param {string} userId - User ID
 * @returns {Promise<{connected: boolean, storages: string[]}>}
 */
async function checkStorageConnections(userId) {
  const storagePlatforms = ['google-drive', 'dropbox', 'onedrive'];
  const connectedStorages = [];

  for (const storage of storagePlatforms) {
    if (await isIntegrationConnected(userId, storage)) {
      connectedStorages.push(storage);
    }
  }

  return {
    connected: connectedStorages.length > 0,
    storages: connectedStorages
  };
}

/**
 * Validate that user has required integrations for an action
 * @param {string} userId - User ID
 * @param {string[]} requiredIntegrations - Array of required integration keys
 * @returns {Promise<{valid: boolean, missing: string[]}>}
 */
async function validateRequiredIntegrations(userId, requiredIntegrations) {
  const missing = [];

  for (const integrationKey of requiredIntegrations) {
    if (!(await isIntegrationConnected(userId, integrationKey))) {
      missing.push(integrationKey);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

module.exports = {
  isIntegrationConnected,
  getIntegrationConnection,
  getUserConnectedIntegrations,
  checkSocialMediaConnections,
  checkStorageConnections,
  validateRequiredIntegrations
};
