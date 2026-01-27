const { google } = require('googleapis');
const { getIntegrationConnection, isIntegrationConnected } = require('./integrationHelper');
const { decryptClientSecret } = require('./tokenEncryption');
const Logger = require('../logger');

const logger = new Logger('posting-service');

class PostingService {
  constructor() {
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      logger.info('Posting service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Posting service started');
  }

  stop() {
    if (!this.isRunning) {
      logger.info('Posting service is not running');
      return;
    }

    this.isRunning = false;
    logger.info('Posting service stopped');
  }

  /**
   * Post content to a specific platform
   * @param {string} userId - User ID
   * @param {Object} postData - Post data including platform and content
   * @returns {Promise<Object>}
   */
  async postToPlatform(userId, postData) {
    const { platform } = postData;
    
    // Check if user has the platform connected
    const platformKey = platform.toLowerCase();
    const isConnected = await isIntegrationConnected(userId, platformKey);
    
    if (!isConnected) {
      throw new Error(`${platform} is not connected. Please connect your ${platform} account first.`);
    }

    logger.info('Posting to platform', { userId, platform });

    switch (platformKey) {
      case 'youtube':
        return await this.postToYouTube(userId, postData);
      case 'facebook':
        return await this.postToFacebook(userId, postData);
      case 'instagram':
        return await this.postToInstagram(userId, postData);
      case 'tiktok':
        return await this.postToTikTok(userId, postData);
      case 'linkedin':
        return await this.postToLinkedIn(userId, postData);
      case 'twitter':
        return await this.postToTwitter(userId, postData);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Post video to YouTube
   * @param {string} userId - User ID
   * @param {Object} postData - Post data
   * @returns {Promise<Object>}
   */
  async postToYouTube(userId, postData) {
    const connectionData = await getIntegrationConnection(userId, 'youtube');
    if (!connectionData) {
      throw new Error('YouTube is not connected');
    }

    const { integration, connection } = connectionData;

    try {
      const oauth2Client = new google.auth.OAuth2(
        integration.clientId,
        decryptClientSecret(integration.clientSecret),
        integration.redirectUri
      );

      oauth2Client.setCredentials({
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken
      });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      // For now, return a placeholder - actual video upload requires file handling
      logger.info('YouTube post prepared', { userId, title: postData.title });
      
      return {
        success: true,
        platform: 'youtube',
        message: 'Video upload initiated',
        externalId: null
      };
    } catch (error) {
      logger.error('Error posting to YouTube', { error: error.message, userId });
      throw new Error(`Failed to post to YouTube: ${error.message}`);
    }
  }

  /**
   * Post to Facebook (placeholder)
   */
  async postToFacebook(userId, postData) {
    logger.info('Facebook post placeholder', { userId });
    return {
      success: true,
      platform: 'facebook',
      message: 'Post created (placeholder)',
      externalId: 'fb-' + Date.now()
    };
  }

  /**
   * Post to Instagram (placeholder)
   */
  async postToInstagram(userId, postData) {
    logger.info('Instagram post placeholder', { userId });
    return {
      success: true,
      platform: 'instagram',
      message: 'Post created (placeholder)',
      externalId: 'ig-' + Date.now()
    };
  }

  /**
   * Post to TikTok (placeholder)
   */
  async postToTikTok(userId, postData) {
    logger.info('TikTok post placeholder', { userId });
    return {
      success: true,
      platform: 'tiktok',
      message: 'Post created (placeholder)',
      externalId: 'tt-' + Date.now()
    };
  }

  /**
   * Post to LinkedIn (placeholder)
   */
  async postToLinkedIn(userId, postData) {
    logger.info('LinkedIn post placeholder', { userId });
    return {
      success: true,
      platform: 'linkedin',
      message: 'Post created (placeholder)',
      externalId: 'li-' + Date.now()
    };
  }

  /**
   * Post to Twitter (placeholder)
   */
  async postToTwitter(userId, postData) {
    logger.info('Twitter post placeholder', { userId });
    return {
      success: true,
      platform: 'twitter',
      message: 'Post created (placeholder)',
      externalId: 'tw-' + Date.now()
    };
  }

  /**
   * Schedule a post for later
   */
  async schedulePost(platform, postData, scheduleTime) {
    logger.info(`Scheduling post to ${platform} for ${scheduleTime}`, { postData });
    return { 
      success: true, 
      scheduledId: 'scheduled-' + Date.now(),
      scheduledTime: scheduleTime
    };
  }

  /**
   * Get available platforms for a user (connected integrations)
   */
  async getAvailablePlatforms(userId) {
    const platforms = ['youtube', 'facebook', 'instagram', 'tiktok', 'linkedin', 'twitter'];
    const available = [];

    for (const platform of platforms) {
      if (await isIntegrationConnected(userId, platform)) {
        available.push(platform);
      }
    }

    return available;
  }
}

module.exports = new PostingService();