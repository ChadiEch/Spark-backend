const cron = require('node-cron');
const Post = require('../../models/Post');
const PostingService = require('./postingService');
const Logger = require('../logger');
const { recordAPICall, recordError } = require('./monitoring');

const logger = new Logger('scheduled-posting-service');

class ScheduledPostingService {
  constructor() {
    this.running = false;
    this.cronJob = null;
  }

  /**
   * Start the scheduled posting service
   */
  start() {
    if (this.running) {
      logger.warn('Scheduled posting service is already running');
      return;
    }

    // Run every minute to check for scheduled posts
    this.cronJob = cron.schedule('* * * * *', async () => {
      try {
        await this.processScheduledPosts();
      } catch (error) {
        logger.error('Error processing scheduled posts', { error: error.message });
      }
    });

    this.running = true;
    logger.info('Scheduled posting service started');
  }

  /**
   * Stop the scheduled posting service
   */
  stop() {
    if (!this.running) {
      logger.warn('Scheduled posting service is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
    }

    this.running = false;
    logger.info('Scheduled posting service stopped');
  }

  /**
   * Process scheduled posts that are due to be published
   */
  async processScheduledPosts() {
    const startTime = Date.now();
    
    try {
      // Find posts that are scheduled and due to be published
      const now = new Date();
      const scheduledPosts = await Post.find({
        status: 'SCHEDULED',
        scheduledAt: { $lte: now }
      }).populate('createdBy');

      if (scheduledPosts.length === 0) {
        return;
      }

      logger.info('Processing scheduled posts', { count: scheduledPosts.length });

      // Process each scheduled post
      for (const post of scheduledPosts) {
        try {
          await this.publishScheduledPost(post);
        } catch (error) {
          logger.error('Error publishing scheduled post', { 
            postId: post._id, 
            error: error.message 
          });
          
          // Update post status to FAILED
          post.status = 'FAILED';
          await post.save();
        }
      }

      // Record successful API call
      recordAPICall('scheduled-posting', 'process', Date.now() - startTime, true);
    } catch (error) {
      // Record error
      recordError('scheduled-posting', 'process', error.message);
      
      logger.error('Error processing scheduled posts', { error: error.message });
      throw error;
    }
  }

  /**
   * Publish a scheduled post
   * @param {Object} post - The post to publish
   */
  async publishScheduledPost(post) {
    try {
      // Prepare post data for the specific platform
      const postData = {
        platform: post.platform,
        message: post.caption,
        title: post.title,
        description: post.caption,
        tags: post.hashtags
      };

      // Add platform-specific data
      switch (post.platform) {
        case 'FACEBOOK':
          postData.pageId = post.metadata?.pageId;
          postData.link = post.metadata?.link;
          break;
        case 'INSTAGRAM':
          postData.accountId = post.metadata?.accountId;
          postData.imageUrl = post.metadata?.imageUrl;
          postData.caption = post.caption;
          break;
        case 'TIKTOK':
          postData.videoFile = post.metadata?.videoFile;
          postData.title = post.title;
          postData.description = post.caption;
          break;
        case 'YOUTUBE':
          postData.videoFile = post.metadata?.videoFile;
          postData.title = post.title;
          postData.description = post.caption;
          postData.tags = post.hashtags;
          postData.categoryId = post.metadata?.categoryId || '22';
          postData.privacyStatus = post.metadata?.privacyStatus || 'private';
          break;
      }

      // Publish the post
      const response = await PostingService.postToPlatform(post.createdBy._id, postData);

      // Update post status to POSTED
      post.status = 'POSTED';
      post.publishedAt = new Date();
      // Store the external post ID if available
      if (response.externalId) {
        post.externalId = response.externalId;
      }
      await post.save();

      logger.info('Scheduled post published successfully', { 
        postId: post._id, 
        platform: post.platform 
      });

      return response;
    } catch (error) {
      logger.error('Error publishing scheduled post', { 
        postId: post._id, 
        platform: post.platform,
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = ScheduledPostingService;