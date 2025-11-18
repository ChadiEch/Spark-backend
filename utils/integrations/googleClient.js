const axios = require('axios');
const Logger = require('../logger');
const { recordAPICall, recordError } = require('./monitoring');

const logger = new Logger('google-client');

class GoogleClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.youtubeBaseUrl = 'https://www.googleapis.com/youtube/v3';
    this.driveBaseUrl = 'https://www.googleapis.com/drive/v3';
  }

  /**
   * Get YouTube channels for the authenticated user
   * @returns {Promise<Array>} - List of channels
   */
  async getYouTubeChannels() {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${this.youtubeBaseUrl}/channels`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        params: {
          part: 'snippet,statistics',
          mine: true
        }
      });
      
      // Record successful API call
      recordAPICall('youtube', 'channels', Date.now() - startTime, true);
      
      return response.data.items;
    } catch (error) {
      // Record error
      recordError('youtube', 'channels', error.message);
      
      logger.error('Error fetching YouTube channels', { 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Upload a video to YouTube
   * @param {Object} videoData - Video data including file and metadata
   * @returns {Promise<Object>} - Upload response
   */
  async uploadYouTubeVideo(videoData) {
    const startTime = Date.now();
    try {
      // Note: YouTube video upload requires a multipart upload which is more complex
      // This is a simplified version showing the concept
      
      // First, create the video resource
      const response = await axios.post(`${this.youtubeBaseUrl}/videos`, {
        snippet: {
          title: videoData.title,
          description: videoData.description,
          tags: videoData.tags,
          categoryId: videoData.categoryId || '22' // People & Blogs default
        },
        status: {
          privacyStatus: videoData.privacyStatus || 'private'
        }
      }, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
          },
        params: {
          part: 'snippet,status',
          uploadType: 'multipart'
        }
      });
      
      // Record successful API call
      recordAPICall('youtube', 'videos', Date.now() - startTime, true);
      
      return response.data;
    } catch (error) {
      // Record error
      recordError('youtube', 'videos', error.message);
      
      logger.error('Error uploading video to YouTube', { 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Get YouTube video analytics
   * @param {string} videoId - Video ID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} - Analytics data
   */
  async getYouTubeAnalytics(videoId, startDate, endDate) {
    const startTime = Date.now();
    try {
      const response = await axios.get('https://youtubeanalytics.googleapis.com/v2/reports', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        params: {
          ids: `video==${videoId}`,
          startDate: startDate,
          endDate: endDate,
          metrics: 'views,likes,dislikes,comments',
          dimensions: 'day'
        }
      });
      
      // Record successful API call
      recordAPICall('youtube', 'analytics', Date.now() - startTime, true);
      
      return response.data;
    } catch (error) {
      // Record error
      recordError('youtube', 'analytics', error.message);
      
      logger.error('Error fetching YouTube analytics', { 
        videoId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive
   * @param {Object} fileData - File data including content and metadata
   * @returns {Promise<Object>} - Upload response
   */
  async uploadDriveFile(fileData) {
    const startTime = Date.now();
    try {
      // Validate required parameters
      if (!fileData || !fileData.content) {
        throw new Error('File data and content are required for Google Drive upload');
      }
      
      // For Google Drive upload, we need to use the proper multipart upload approach
      // First, create the file metadata
      const metadata = {
        name: fileData.name || 'Unnamed File',
        mimeType: fileData.mimeType || 'application/octet-stream',
        parents: fileData.parents || []
      };

      // Create a multipart body
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      let multipartRequestBody = '';
      multipartRequestBody += delimiter;
      multipartRequestBody += 'Content-Type: application/json\r\n\r\n';
      multipartRequestBody += JSON.stringify(metadata);
      multipartRequestBody += delimiter;
      multipartRequestBody += `Content-Type: ${fileData.mimeType || 'application/octet-stream'}\r\n\r\n`;
      multipartRequestBody += fileData.content;
      multipartRequestBody += close_delim;

      // Upload the file
      const response = await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        multipartRequestBody,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`
          }
        }
      );
      
      // Record successful API call
      recordAPICall('google-drive', 'files', Date.now() - startTime, true);
      
      return response.data;
    } catch (error) {
      // Record error
      recordError('google-drive', 'files', error.message);
      
      logger.error('Error uploading file to Google Drive', { 
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // If it's an auth error, provide a more specific message
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(`Google Drive authentication failed: ${error.response?.data?.error?.message || error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * List files in Google Drive
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - List of files
   */
  async listDriveFiles(options = {}) {
    const startTime = Date.now();
    try {
      const response = await axios.get(`${this.driveBaseUrl}/files`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        params: {
          q: options.query || null,
          orderBy: options.orderBy || 'createdTime desc',
          pageSize: options.pageSize || 100
        }
      });
      
      // Record successful API call
      recordAPICall('google-drive', 'files/list', Date.now() - startTime, true);
      
      return response.data.files;
    } catch (error) {
      // Record error
      recordError('google-drive', 'files/list', error.message);
      
      logger.error('Error listing Google Drive files', { 
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Get YouTube video insights
   * @param {string} videoId - Video ID
   * @returns {Promise<Object>} - Analytics data
   */
  async getYouTubeVideoInsights(videoId) {
    const startTime = Date.now();
    try {
      const response = await axios.get('https://youtubeanalytics.googleapis.com/v2/reports', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        params: {
          ids: `video==${videoId}`,
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          metrics: 'views,likes,dislikes,comments,shares',
          dimensions: 'day'
        }
      });
      
      // Record successful API call
      recordAPICall('youtube', 'video/insights', Date.now() - startTime, true);
      
      return response.data;
    } catch (error) {
      // Record error
      recordError('youtube', 'video/insights', error.message);
      
      logger.error('Error fetching YouTube video insights', { 
        videoId,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  }
}

module.exports = GoogleClient;