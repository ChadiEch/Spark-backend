const cron = require('node-cron');
const Post = require('../../models/Post');
const Activity = require('../../models/Activity');
const IntegrationConnection = require('../../models/IntegrationConnection');
const FacebookClient = require('./facebookClient');
const TikTokClient = require('./tiktokClient');
const GoogleClient = require('./googleClient');
const Logger = require('../logger');
const { recordAPICall, recordError } = require('./monitoring');

const logger = new Logger('metrics-collection-service');

class MetricsCollectionService {
  constructor() {
    this.running = false;
    this.cronJob = null;
  }

  /**
   * Start the metrics collection service
   */
  start() {
    if (this.running) {
      logger.warn('Metrics collection service is already running');
      return;
    }

    // Run every hour to collect metrics
    this.cronJob = cron.schedule('0 * * * *', async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Error collecting metrics', { error: error.message });
      }
    });

    this.running = true;
    logger.info('Metrics collection service started');
  }

  /**
   * Stop the metrics collection service
   */
  stop() {
    if (!this.running) {
      logger.warn('Metrics collection service is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
    }

    this.running = false;
    logger.info('Metrics collection service stopped');
  }

  /**
   * Collect metrics from all connected social media platforms
   */
  async collectMetrics() {
    const startTime = Date.now();
    
    try {
      logger.info('Starting metrics collection');
      
      // Get all posts that have been published
      const publishedPosts = await Post.find({
        status: 'POSTED',
        publishedAt: { $exists: true }
      }).populate('createdBy');

      if (publishedPosts.length === 0) {
        logger.info('No published posts found for metrics collection');
        return;
      }

      logger.info('Collecting metrics for published posts', { count: publishedPosts.length });

      // Process each published post
      for (const post of publishedPosts) {
        try {
          await this.collectPostMetrics(post);
        } catch (error) {
          logger.error('Error collecting metrics for post', { 
            postId: post._id, 
            error: error.message 
          });
        }
      }

      // Record successful API call
      recordAPICall('metrics-collection', 'collect', Date.now() - startTime, true);
      
      logger.info('Metrics collection completed');
    } catch (error) {
      // Record error
      recordError('metrics-collection', 'collect', error.message);
      
      logger.error('Error collecting metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Collect metrics for a specific post
   * @param {Object} post - The post to collect metrics for
   */
  async collectPostMetrics(post) {
    try {
      // Get the user's integration connection for the post's platform
      const connection = await IntegrationConnection.findOne({
        userId: post.createdBy._id,
        'integrationId.key': post.platform.toLowerCase()
      }).populate('integrationId');

      if (!connection) {
        logger.warn('No integration connection found for post', { 
          postId: post._id, 
          platform: post.platform,
          userId: post.createdBy._id
        });
        return;
      }

      // Check if token is expired
      if (connection.expiresAt && connection.expiresAt < new Date()) {
        logger.warn('Access token has expired for post', { 
          postId: post._id, 
          platform: post.platform
        });
        return;
      }

      let metrics = null;

      // Collect metrics based on platform
      switch (post.platform) {
        case 'FACEBOOK':
          metrics = await this.collectFacebookMetrics(connection, post);
          break;
        case 'INSTAGRAM':
          metrics = await this.collectInstagramMetrics(connection, post);
          break;
        case 'TIKTOK':
          metrics = await this.collectTikTokMetrics(connection, post);
          break;
        case 'YOUTUBE':
          metrics = await this.collectYouTubeMetrics(connection, post);
          break;
        default:
          logger.warn('Unsupported platform for metrics collection', { 
            postId: post._id, 
            platform: post.platform
          });
          return;
      }

      if (metrics) {
        // Update post metrics
        post.metrics = {
          ...post.metrics,
          ...metrics
        };
        await post.save();

        // Create or update activity record
        await this.updateActivityRecord(post, metrics);

        logger.info('Metrics collected successfully for post', { 
          postId: post._id, 
          platform: post.platform 
        });
      }
    } catch (error) {
      logger.error('Error collecting metrics for post', { 
        postId: post._id, 
        platform: post.platform,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Collect Facebook metrics
   * @param {Object} connection - Integration connection
   * @param {Object} post - The post
   */
  async collectFacebookMetrics(connection, post) {
    try {
      const facebookClient = new FacebookClient(connection.accessToken);
      
      // Get post insights from Facebook Insights API
      // This requires specific permissions and the post ID
      if (!post.externalId) {
        logger.warn('No external ID found for Facebook post', { postId: post._id });
        return null;
      }
      
      const insights = await facebookClient.getPostInsights(post.externalId);
      
      // Calculate engagement rate
      const likes = insights.post_reactions_by_type_total || 0;
      const comments = insights.post_comments_count || 0;
      const shares = insights.post_shares_count || 0;
      const reach = insights.post_reach || 0;
      const impressions = insights.post_impressions || 0;
      
      const engagementRate = reach > 0 ? ((likes + comments + shares) / reach) * 100 : 0;
      
      return {
        reach,
        impressions,
        likes,
        comments,
        shares,
        engagementRate
      };
    } catch (error) {
      logger.error('Error collecting Facebook metrics', { 
        postId: post._id,
        error: error.message,
        response: error.response?.data
      });
      return null;
    }
  }

  /**
   * Collect Instagram metrics
   * @param {Object} connection - Integration connection
   * @param {Object} post - The post
   */
  async collectInstagramMetrics(connection, post) {
    try {
      const facebookClient = new FacebookClient(connection.accessToken);
      
      // Get Instagram insights from Instagram Insights API
      // This requires specific permissions and the media ID
      if (!post.externalId) {
        logger.warn('No external ID found for Instagram post', { postId: post._id });
        return null;
      }
      
      const insights = await facebookClient.getInstagramMediaInsights(post.externalId);
      
      // Calculate engagement rate
      const likes = insights.like_count || 0;
      const comments = insights.comments_count || 0;
      const shares = 0; // Instagram doesn't provide share count directly
      const reach = insights.reach || 0;
      const impressions = insights.impressions || 0;
      const saves = insights.saved || 0;
      
      const engagementRate = reach > 0 ? ((likes + comments + saves) / reach) * 100 : 0;
      
      return {
        reach,
        impressions,
        likes,
        comments,
        shares,
        saves,
        engagementRate
      };
    } catch (error) {
      logger.error('Error collecting Instagram metrics', { 
        postId: post._id,
        error: error.message,
        response: error.response?.data
      });
      return null;
    }
  }

  /**
   * Collect TikTok metrics
   * @param {Object} connection - Integration connection
   * @param {Object} post - The post
   */
  async collectTikTokMetrics(connection, post) {
    try {
      const tiktokClient = new TikTokClient(connection.accessToken);
      
      // Get video analytics from TikTok Analytics API
      // This requires the video ID
      if (!post.externalId) {
        logger.warn('No external ID found for TikTok post', { postId: post._id });
        return null;
      }
      
      const insights = await tiktokClient.getVideoInsights(post.externalId);
      
      // Calculate engagement rate
      const likes = insights.like_count || 0;
      const comments = insights.comment_count || 0;
      const shares = insights.share_count || 0;
      const reach = insights.reach || 0;
      const impressions = insights.impressions || 0;
      const saves = insights.save_count || 0;
      
      const engagementRate = reach > 0 ? ((likes + comments + shares + saves) / reach) * 100 : 0;
      
      return {
        reach,
        impressions,
        likes,
        comments,
        shares,
        saves,
        engagementRate
      };
    } catch (error) {
      logger.error('Error collecting TikTok metrics', { 
        postId: post._id,
        error: error.message,
        response: error.response?.data
      });
      return null;
    }
  }

  /**
   * Collect YouTube metrics
   * @param {Object} connection - Integration connection
   * @param {Object} post - The post
   */
  async collectYouTubeMetrics(connection, post) {
    try {
      const googleClient = new GoogleClient(connection.accessToken);
      
      // Get video analytics from YouTube Analytics API
      // This requires the video ID and proper authentication
      if (!post.externalId) {
        logger.warn('No external ID found for YouTube post', { postId: post._id });
        return null;
      }
      
      const insights = await googleClient.getYouTubeVideoInsights(post.externalId);
      
      // Process the analytics data
      let likes = 0, comments = 0, shares = 0, views = 0;
      
      if (insights.rows && insights.rows.length > 0) {
        // Extract metrics from the rows
        insights.rows.forEach(row => {
          views += row[1] || 0;  // views
          likes += row[2] || 0;  // likes
          // dislikes are at index 3 but we don't include them
          comments += row[4] || 0;  // comments
          // shares would be at index 5 if available
        });
      }
      
      // Calculate engagement rate
      const reach = views;
      const engagementRate = reach > 0 ? ((likes + comments) / reach) * 100 : 0;
      
      return {
        reach,
        impressions: views, // YouTube uses views as impressions
        likes,
        comments,
        shares,
        engagementRate
      };
    } catch (error) {
      logger.error('Error collecting YouTube metrics', { 
        postId: post._id,
        error: error.message,
        response: error.response?.data
      });
      return null;
    }
  }

  /**
   * Update activity record with collected metrics
   * @param {Object} post - The post
   * @param {Object} metrics - Collected metrics
   */
  async updateActivityRecord(post, metrics) {
    try {
      // Find existing activity record for this post
      let activity = await Activity.findOne({ post: post._id });
      
      if (!activity) {
        // Create new activity record
        activity = new Activity({
          type: 'POST',
          post: post._id,
          campaign: post.campaign,
          goal: post.goal,
          metrics: metrics
        });
      } else {
        // Update existing activity record
        activity.metrics = {
          ...activity.metrics,
          ...metrics
        };
      }
      
      await activity.save();
    } catch (error) {
      logger.error('Error updating activity record', { 
        postId: post._id, 
        error: error.message 
      });
    }
  }
}

module.exports = MetricsCollectionService;