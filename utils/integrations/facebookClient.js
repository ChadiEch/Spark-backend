const axios = require('axios');
const Logger = require('../logger');
const { recordAPICall, recordError } = require('./monitoring');

const logger = new Logger('facebook-client');

class FacebookClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://graph.facebook.com/v18.0';
  }

  /**
   * Get user accounts (pages) that the user has access to
   * @returns {Promise<Array>} - List of pages
   */
  async getUserPages() {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: this.accessToken
        }
      });
      
      // Record successful API call
      recordAPICall('facebook', 'me/accounts', Date.now() - startTime, true);
      
      return response.data.data;
    } catch (error) {
      // Record error
      recordError('facebook', 'me/accounts', error.message);
      
      logger.error('Error fetching user pages', { 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Get Instagram accounts connected to Facebook pages
   * @param {string} pageId - Facebook page ID
   * @returns {Promise<Array>} - List of Instagram accounts
   */
  async getInstagramAccounts(pageId) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${this.baseUrl}/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: this.accessToken
        }
      });
      
      // Record successful API call
      recordAPICall('instagram', 'page/instagram', Date.now() - startTime, true);
      
      return response.data.instagram_business_account || null;
    } catch (error) {
      // Record error
      recordError('instagram', 'page/instagram', error.message);
      
      logger.error('Error fetching Instagram accounts', { 
        pageId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Post to Facebook page
   * @param {string} pageId - Facebook page ID
   * @param {Object} postData - Post data (message, link, etc.)
   * @returns {Promise<Object>} - Post response
   */
  async postToPage(pageId, postData) {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${this.baseUrl}/${pageId}/feed`, {
        ...postData,
        access_token: this.accessToken
      });
      
      // Record successful API call
      recordAPICall('facebook', 'page/feed', Date.now() - startTime, true);
      
      return response.data;
    } catch (error) {
      // Record error
      recordError('facebook', 'page/feed', error.message);
      
      logger.error('Error posting to Facebook page', { 
        pageId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Post to Instagram account
   * @param {string} instagramAccountId - Instagram account ID
   * @param {Object} postData - Post data (image URL, caption, etc.)
   * @returns {Promise<Object>} - Post response
   */
  async postToInstagram(instagramAccountId, postData) {
    const startTime = Date.now();
    try {
      const response = await axios.post(`${this.baseUrl}/${instagramAccountId}/media`, {
        ...postData,
        access_token: this.accessToken
      });
      
      // Publish the media
      const publishResponse = await axios.post(`${this.baseUrl}/${instagramAccountId}/media_publish`, {
        creation_id: response.data.id,
        access_token: this.accessToken
      });
      
      // Record successful API call
      recordAPICall('instagram', 'media/publish', Date.now() - startTime, true);
      
      return publishResponse.data;
    } catch (error) {
      // Record error
      recordError('instagram', 'media/publish', error.message);
      
      logger.error('Error posting to Instagram', { 
        instagramAccountId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Get post insights
   * @param {string} postId - Facebook post ID
   * @returns {Promise<Object>} - Post insights
   */
  async getPostInsights(postId) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${this.baseUrl}/${postId}/insights`, {
        params: {
          metric: 'post_impressions,post_engaged_users,post_reactions_by_type_total,post_comments_count,post_shares_count',
          access_token: this.accessToken
        }
      });
      
      // Record successful API call
      recordAPICall('facebook', 'post/insights', Date.now() - startTime, true);
      
      // Process the insights data
      const insights = {};
      response.data.data.forEach(metric => {
        insights[metric.name] = metric.values[0].value;
      });
      
      return insights;
    } catch (error) {
      // Record error
      recordError('facebook', 'post/insights', error.message);
      
      logger.error('Error fetching Facebook post insights', { 
        postId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Get Instagram media insights
   * @param {string} mediaId - Instagram media ID
   * @returns {Promise<Object>} - Media insights
   */
  async getInstagramMediaInsights(mediaId) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${this.baseUrl}/${mediaId}/insights`, {
        params: {
          metric: 'impressions,reach,engagement,saved,video_views',
          access_token: this.accessToken
        }
      });
      
      // Record successful API call
      recordAPICall('instagram', 'media/insights', Date.now() - startTime, true);
      
      // Process the insights data
      const insights = {};
      response.data.data.forEach(metric => {
        insights[metric.name] = metric.values[0].value;
      });
      
      return insights;
    } catch (error) {
      // Record error
      recordError('instagram', 'media/insights', error.message);
      
      logger.error('Error fetching Instagram media insights', { 
        mediaId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }
}

module.exports = FacebookClient;