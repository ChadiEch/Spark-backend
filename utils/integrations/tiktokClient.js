const axios = require('axios');
const Logger = require('../logger');
const { recordAPICall, recordError } = require('./monitoring');

const logger = new Logger('tiktok-client');

class TikTokClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://open-api.tiktok.com';
  }

  /**
   * Get user info
   * @returns {Promise<Object>} - User information
   */
  async getUserInfo() {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${this.baseUrl}/user/info/`, {
        access_token: this.accessToken,
        fields: ['open_id', 'union_id', 'avatar_url', 'display_name']
      });
      
      // Record successful API call
      recordAPICall('tiktok', 'user/info', Date.now() - startTime, true);
      
      return response.data.data.user;
    } catch (error) {
      // Record error
      recordError('tiktok', 'user/info', error.message);
      
      logger.error('Error fetching TikTok user info', { 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Upload a video to TikTok
   * @param {Object} videoData - Video data including file path and metadata
   * @returns {Promise<Object>} - Upload response
   */
  async uploadVideo(videoData) {
    const startTime = Date.now();
    try {
      // First, initialize the upload
      const initResponse = await axios.post(`${this.baseUrl}/video/init/`, {
        access_token: this.accessToken,
        ...videoData.metadata
      });
      
      if (!initResponse.data || !initResponse.data.data || !initResponse.data.data.upload_id) {
        throw new Error('Failed to initialize TikTok video upload');
      }
      
      const uploadId = initResponse.data.data.upload_id;
      
      // Then upload the video file
      // Note: This is a simplified version. Actual implementation would need to handle file streaming
      const uploadResponse = await axios.post(`${this.baseUrl}/video/upload/`, {
        access_token: this.accessToken,
        upload_id: uploadId,
        video: videoData.file
      });
      
      if (!uploadResponse.data || uploadResponse.data.error_code !== 0) {
        throw new Error(`TikTok video upload failed: ${uploadResponse.data?.message || 'Unknown error'}`);
      }
      
      // Finally, publish the video
      const publishData = {
        access_token: this.accessToken,
        upload_id: uploadId,
        ...videoData.publishData
      };
      
      const publishResponse = await axios.post(`${this.baseUrl}/video/publish/`, publishData);
      
      if (!publishResponse.data || publishResponse.data.error_code !== 0) {
        throw new Error(`TikTok video publish failed: ${publishResponse.data?.message || 'Unknown error'}`);
      }
      
      // Record successful API call
      recordAPICall('tiktok', 'video/publish', Date.now() - startTime, true);
      
      return publishResponse.data;
    } catch (error) {
      // Record error
      recordError('tiktok', 'video/publish', error.message);
      
      logger.error('Error uploading video to TikTok', { 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Get video analytics
   * @param {string} videoId - Video ID
   * @returns {Promise<Object>} - Analytics data
   */
  async getVideoAnalytics(videoId) {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${this.baseUrl}/video/list/`, {
        access_token: this.accessToken,
        filters: {
          video_ids: [videoId]
        }
      });
      
      // Record successful API call
      recordAPICall('tiktok', 'video/list', Date.now() - startTime, true);
      
      return response.data.data.videos[0];
    } catch (error) {
      // Record error
      recordError('tiktok', 'video/list', error.message);
      
      logger.error('Error fetching TikTok video analytics', { 
        videoId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Get video insights
   * @param {string} videoId - Video ID
   * @returns {Promise<Object>} - Analytics data
   */
  async getVideoInsights(videoId) {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${this.baseUrl}/video/analytics/`, {
        access_token: this.accessToken,
        video_id: videoId,
        business_id: null,
        start_date: '20230101',
        end_date: '20231231',
        fields: ['video_views', 'likes', 'comments', 'shares', 'reach']
      });
      
      // Record successful API call
      recordAPICall('tiktok', 'video/analytics', Date.now() - startTime, true);
      
      return response.data.data;
    } catch (error) {
      // Record error
      recordError('tiktok', 'video/analytics', error.message);
      
      logger.error('Error fetching TikTok video insights', { 
        videoId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }
}

module.exports = TikTokClient;