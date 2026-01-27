const { google } = require('googleapis');
const stream = require('stream');
const Integration = require('../../models/Integration');
const IntegrationConnection = require('../../models/IntegrationConnection');
const Logger = require('../logger');

const logger = new Logger('google-drive-service');

/**
 * Get OAuth2 client with user's tokens
 * @param {string} userId - User ID
 * @returns {Promise<{oauth2Client: OAuth2Client, connection: IntegrationConnection} | null>}
 */
async function getOAuth2Client(userId) {
  try {
    // Find Google Drive integration
    const integration = await Integration.findOne({ key: 'google-drive' });
    if (!integration) {
      logger.warn('Google Drive integration not found');
      return null;
    }

    // Find user's connection
    const connection = await IntegrationConnection.findOne({
      userId,
      integrationId: integration._id
    });

    if (!connection) {
      logger.info('User has no Google Drive connection', { userId });
      return null;
    }

    // Check if token is expired
    if (connection.expiresAt && new Date() > new Date(connection.expiresAt)) {
      logger.info('Token expired, refreshing...', { userId });
      // Token refresh will be handled separately
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      integration.clientId,
      require('./tokenEncryption').decryptClientSecret(integration.clientSecret),
      integration.redirectUri
    );

    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken
    });

    return { oauth2Client, connection, integration };
  } catch (error) {
    logger.error('Error getting OAuth2 client', { error: error.message, userId });
    return null;
  }
}

/**
 * Check if user has Google Drive connected
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
async function isGoogleDriveConnected(userId) {
  const client = await getOAuth2Client(userId);
  return client !== null;
}

/**
 * Upload file to Google Drive
 * @param {string} userId - User ID
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - MIME type
 * @returns {Promise<{fileId: string, webViewLink: string, thumbnailLink: string, webContentLink: string} | null>}
 */
async function uploadFile(userId, fileBuffer, fileName, mimeType) {
  try {
    const authResult = await getOAuth2Client(userId);
    if (!authResult) {
      logger.warn('Cannot upload to Google Drive - not connected', { userId });
      return null;
    }

    const { oauth2Client } = authResult;
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Create a readable stream from buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    // Upload file
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: mimeType
      },
      media: {
        mimeType: mimeType,
        body: bufferStream
      },
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, iconLink'
    });

    // Make file accessible via link
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Get updated file info with sharing links
    const fileInfo = await drive.files.get({
      fileId: response.data.id,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, iconLink'
    });

    logger.info('File uploaded to Google Drive', { 
      userId, 
      fileId: fileInfo.data.id, 
      fileName 
    });

    return {
      fileId: fileInfo.data.id,
      webViewLink: fileInfo.data.webViewLink,
      webContentLink: fileInfo.data.webContentLink,
      thumbnailLink: fileInfo.data.thumbnailLink || generateThumbnailUrl(fileInfo.data.id),
      iconLink: fileInfo.data.iconLink
    };
  } catch (error) {
    logger.error('Error uploading to Google Drive', { 
      error: error.message, 
      userId,
      fileName 
    });
    throw error;
  }
}

/**
 * Generate thumbnail URL for Google Drive file
 * @param {string} fileId - Google Drive file ID
 * @returns {string}
 */
function generateThumbnailUrl(fileId) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}

/**
 * Delete file from Google Drive
 * @param {string} userId - User ID
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<boolean>}
 */
async function deleteFile(userId, fileId) {
  try {
    const authResult = await getOAuth2Client(userId);
    if (!authResult) {
      logger.warn('Cannot delete from Google Drive - not connected', { userId });
      return false;
    }

    const { oauth2Client } = authResult;
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    await drive.files.delete({ fileId });

    logger.info('File deleted from Google Drive', { userId, fileId });
    return true;
  } catch (error) {
    logger.error('Error deleting from Google Drive', { 
      error: error.message, 
      userId, 
      fileId 
    });
    return false;
  }
}

/**
 * Get file metadata from Google Drive
 * @param {string} userId - User ID
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<Object | null>}
 */
async function getFileMetadata(userId, fileId) {
  try {
    const authResult = await getOAuth2Client(userId);
    if (!authResult) {
      return null;
    }

    const { oauth2Client } = authResult;
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, iconLink, createdTime, modifiedTime'
    });

    return response.data;
  } catch (error) {
    logger.error('Error getting file metadata', { error: error.message, userId, fileId });
    return null;
  }
}

/**
 * List files from Google Drive
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array | null>}
 */
async function listFiles(userId, options = {}) {
  try {
    const authResult = await getOAuth2Client(userId);
    if (!authResult) {
      return null;
    }

    const { oauth2Client } = authResult;
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const response = await drive.files.list({
      pageSize: options.pageSize || 100,
      fields: 'files(id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, iconLink, createdTime)',
      q: options.query || "trashed = false",
      orderBy: 'createdTime desc'
    });

    return response.data.files;
  } catch (error) {
    logger.error('Error listing files', { error: error.message, userId });
    return null;
  }
}

/**
 * Refresh access token if expired
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
async function refreshTokenIfNeeded(userId) {
  try {
    const authResult = await getOAuth2Client(userId);
    if (!authResult) {
      return false;
    }

    const { oauth2Client, connection, integration } = authResult;

    // Check if token needs refresh (within 5 minutes of expiry)
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (connection.expiresAt && new Date(connection.expiresAt) > fiveMinutesFromNow) {
      return true; // Token is still valid
    }

    // Refresh the token
    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update connection with new tokens
    connection.accessToken = credentials.access_token;
    if (credentials.refresh_token) {
      connection.refreshToken = credentials.refresh_token;
    }
    if (credentials.expiry_date) {
      connection.expiresAt = new Date(credentials.expiry_date);
    }
    await connection.save();

    logger.info('Token refreshed successfully', { userId });
    return true;
  } catch (error) {
    logger.error('Error refreshing token', { error: error.message, userId });
    return false;
  }
}

module.exports = {
  isGoogleDriveConnected,
  uploadFile,
  deleteFile,
  getFileMetadata,
  listFiles,
  generateThumbnailUrl,
  refreshTokenIfNeeded,
  getOAuth2Client
};
