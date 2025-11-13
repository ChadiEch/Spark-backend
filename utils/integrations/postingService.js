const FacebookClient = require('./facebookClient');
const TikTokClient = require('./tiktokClient');
const GoogleClient = require('./googleClient');
const IntegrationConnection = require('../../models/IntegrationConnection');
const Logger = require('../logger');
const { recordAPICall, recordError } = require('./monitoring');

const logger = new Logger('posting-service');

class PostingService {
  /**
   * Post to Facebook page
   * @param {string} userId - User ID
   * @param {Object} postData - Post data
   * @returns {Promise<Object>} - Post response
   */
  static async postToFacebook(userId, postData) {
    const startTime = Date.now();
    try {
      // Get Facebook integration connection
      const connection = await IntegrationConnection.findOne({
        userId: userId,
        'integrationId.key': 'facebook'
      }).populate('integrationId');

      if (!connection) {
        throw new Error('Facebook integration not connected');
      }

      // Check if token is expired
      if (connection.expiresAt && connection.expiresAt < new Date()) {
        throw new Error('Facebook access token has expired');
      }

      // Create Facebook client
      const facebookClient = new FacebookClient(connection.accessToken);

      // Post to page
      const response = await facebookClient.postToPage(postData.pageId, {
        message: postData.message,
        link: postData.link
      });

      // Record successful API call
      recordAPICall('facebook', 'post', Date.now() - startTime, true);

      logger.info('Successfully posted to Facebook', { 
        userId, 
        pageId: postData.pageId,
        postId: response.id
      });

      return response;
    } catch (error) {
      // Record error
      recordError('facebook', 'post', error.message);
      
      logger.error('Error posting to Facebook', { 
        userId, 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Post to Instagram
   * @param {string} userId - User ID
   * @param {Object} postData - Post data
   * @returns {Promise<Object>} - Post response
   */
  static async postToInstagram(userId, postData) {
    const startTime = Date.now();
    try {
      // Get Instagram integration connection
      const connection = await IntegrationConnection.findOne({
        userId: userId,
        'integrationId.key': 'instagram'
      }).populate('integrationId');

      if (!connection) {
        throw new Error('Instagram integration not connected');
      }

      // Check if token is expired
      if (connection.expiresAt && connection.expiresAt < new Date()) {
        throw new Error('Instagram access token has expired');
      }

      // Create Facebook client (Instagram uses Facebook API)
      const facebookClient = new FacebookClient(connection.accessToken);

      // Post to Instagram
      const response = await facebookClient.postToInstagram(postData.accountId, {
        image_url: postData.imageUrl,
        caption: postData.caption
      });

      // Record successful API call
      recordAPICall('instagram', 'post', Date.now() - startTime, true);

      logger.info('Successfully posted to Instagram', { 
        userId, 
        accountId: postData.accountId,
        mediaId: response.id
      });

      return response;
    } catch (error) {
      // Record error
      recordError('instagram', 'post', error.message);
      
      logger.error('Error posting to Instagram', { 
        userId, 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Post to TikTok
   * @param {string} userId - User ID
   * @param {Object} postData - Post data
   * @returns {Promise<Object>} - Post response
   */
  static async postToTiktok(userId, postData) {
    const startTime = Date.now();
    try {
      // Get TikTok integration connection
      const connection = await IntegrationConnection.findOne({
        userId: userId,
        'integrationId.key': 'tiktok'
      }).populate('integrationId');

      if (!connection) {
        throw new Error('TikTok integration not connected');
      }

      // Check if token is expired
      if (connection.expiresAt && connection.expiresAt < new Date()) {
        throw new Error('TikTok access token has expired');
      }

      // Create TikTok client
      const tiktokClient = new TikTokClient(connection.accessToken);

      // Upload video to TikTok
      const response = await tiktokClient.uploadVideo({
        file: postData.videoFile,
        metadata: {
          title: postData.title,
          description: postData.description
        },
        publishData: {
          privacy_level: 'PUBLIC'
        }
      });

      // Record successful API call
      recordAPICall('tiktok', 'post', Date.now() - startTime, true);

      logger.info('Successfully posted to TikTok', { 
        userId, 
        videoId: response.data.video_id
      });

      return response;
    } catch (error) {
      // Record error
      recordError('tiktok', 'post', error.message);
      
      logger.error('Error posting to TikTok', { 
        userId, 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Post to YouTube
   * @param {string} userId - User ID
   * @param {Object} postData - Post data
   * @returns {Promise<Object>} - Post response
   */
  static async postToYouTube(userId, postData) {
    const startTime = Date.now();
    try {
      // Get YouTube integration connection
      const connection = await IntegrationConnection.findOne({
        userId: userId,
        'integrationId.key': 'youtube'
      }).populate('integrationId');

      if (!connection) {
        throw new Error('YouTube integration not connected');
      }

      // Check if token is expired
      if (connection.expiresAt && connection.expiresAt < new Date()) {
        throw new Error('YouTube access token has expired');
      }

      // Create Google client
      const googleClient = new GoogleClient(connection.accessToken);

      // Upload video to YouTube
      const response = await googleClient.uploadYouTubeVideo({
        title: postData.title,
        description: postData.description,
        tags: postData.tags,
        categoryId: postData.categoryId,
        privacyStatus: postData.privacyStatus || 'private'
      });

      // Record successful API call
      recordAPICall('youtube', 'post', Date.now() - startTime, true);

      logger.info('Successfully posted to YouTube', { 
        userId, 
        videoId: response.id
      });

      return response;
    } catch (error) {
      // Record error
      recordError('youtube', 'post', error.message);
      
      logger.error('Error posting to YouTube', { 
        userId, 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Post to the appropriate platform based on post data
   * @param {string} userId - User ID
   * @param {Object} postData - Post data
   * @returns {Promise<Object>} - Post response
   */
  static async postToPlatform(userId, postData) {
    const response = await (async () => {
      switch (postData.platform) {
        case 'FACEBOOK':
          return await this.postToFacebook(userId, postData);
        case 'INSTAGRAM':
          return await this.postToInstagram(userId, postData);
        case 'TIKTOK':
          return await this.postToTiktok(userId, postData);
        case 'YOUTUBE':
          return await this.postToYouTube(userId, postData);
        default:
          throw new Error(`Unsupported platform: ${postData.platform}`);
      }
    })();
    
    // Extract the external post ID based on platform
    let externalId = null;
    if (postData.platform === 'FACEBOOK' && response.id) {
      externalId = response.id;
    } else if (postData.platform === 'INSTAGRAM' && response.id) {
      externalId = response.id;
    } else if (postData.platform === 'TIKTOK' && response.data && response.data.video_id) {
      externalId = response.data.video_id;
    } else if (postData.platform === 'YOUTUBE' && response.id) {
      externalId = response.id;
    }
    
    return {
      ...response,
      externalId
    };
  }
}

module.exports = PostingService;