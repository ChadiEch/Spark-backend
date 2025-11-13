const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const Post = require('../models/Post');
const Campaign = require('../models/Campaign');
const Goal = require('../models/Goal');

const logger = new Logger('analytics-controller');

// @desc    Get analytics overview
// @route   GET /api/analytics/overview
// @access  Private
exports.getOverview = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for analytics overview request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get total counts (excluding trashed tasks)
    const totalPosts = await Post.countDocuments();
    const totalCampaigns = await Campaign.countDocuments();
    const totalGoals = await Goal.countDocuments();
    
    // Get recent posts with metrics
    const recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('createdBy', 'name email')
      .populate('campaign')
      .populate('goal');
    
    // Calculate engagement metrics
    let totalReach = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    
    recentPosts.forEach(post => {
      if (post.metrics) {
        totalReach += post.metrics.reach || 0;
        totalLikes += post.metrics.likes || 0;
        totalComments += post.metrics.comments || 0;
        totalShares += post.metrics.shares || 0;
      }
    });
    
    const engagementRate = totalReach > 0 ? ((totalLikes + totalComments + totalShares) / totalReach * 100).toFixed(2) : 0;
    
    res.status(200).json({
      success: true,
      data: {
        totals: {
          posts: totalPosts,
          campaigns: totalCampaigns,
          goals: totalGoals
        },
        metrics: {
          totalReach,
          totalLikes,
          totalComments,
          totalShares,
          engagementRate: parseFloat(engagementRate)
        },
        recentPosts
      }
    });
  } catch (error) {
    logger.error('Error fetching analytics overview', { error: error.message });
    throw new APIError('Failed to fetch analytics overview', 500);
  }
});

// @desc    Get detailed analytics report
// @route   GET /api/analytics/report
// @access  Private
exports.getDetailedReport = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for detailed analytics report request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get posts grouped by platform
    const platformStats = await Post.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          totalReach: { $sum: { $ifNull: ['$metrics.reach', 0] } },
          totalLikes: { $sum: { $ifNull: ['$metrics.likes', 0] } },
          totalComments: { $sum: { $ifNull: ['$metrics.comments', 0] } },
          totalShares: { $sum: { $ifNull: ['$metrics.shares', 0] } }
        }
      }
    ]);
    
    // Get campaigns with goal progress
    const campaigns = await Campaign.find()
      .populate('goals')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Calculate campaign progress
    const campaignProgress = campaigns.map(campaign => {
      let totalGoals = 0;
      let completedGoals = 0;
      
      if (campaign.goals && Array.isArray(campaign.goals)) {
        totalGoals = campaign.goals.length;
        completedGoals = campaign.goals.filter(goal => 
          goal.targetValue > 0 && goal.currentValue >= goal.targetValue
        ).length;
      }
      
      const progress = totalGoals > 0 ? (completedGoals / totalGoals * 100).toFixed(2) : 0;
      
      return {
        id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        totalGoals,
        completedGoals,
        progress: parseFloat(progress)
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        platformStats,
        campaignProgress
      }
    });
  } catch (error) {
    logger.error('Error fetching detailed analytics report', { error: error.message });
    throw new APIError('Failed to fetch detailed analytics report', 500);
  }
});

// @desc    Get platform metrics
// @route   GET /api/analytics/platforms
// @access  Private
exports.getPlatformMetrics = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for platform metrics request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get posts grouped by platform with metrics
    const platformMetrics = await Post.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
          totalReach: { $sum: { $ifNull: ['$metrics.reach', 0] } },
          totalLikes: { $sum: { $ifNull: ['$metrics.likes', 0] } },
          totalComments: { $sum: { $ifNull: ['$metrics.comments', 0] } },
          totalShares: { $sum: { $ifNull: ['$metrics.shares', 0] } },
          totalSaves: { $sum: { $ifNull: ['$metrics.saves', 0] } },
          totalClicks: { $sum: { $ifNull: ['$metrics.clicks', 0] } }
        }
      },
      {
        $project: {
          platform: '$_id',
          _id: 0,
          count: 1,
          totalReach: 1,
          totalLikes: 1,
          totalComments: 1,
          totalShares: 1,
          totalSaves: 1,
          totalClicks: 1,
          engagementRate: {
            $cond: {
              if: { $gt: ['$totalReach', 0] },
              then: {
                $multiply: [
                  {
                    $divide: [
                      { $add: ['$totalLikes', '$totalComments', '$totalShares'] },
                      '$totalReach'
                    ]
                  },
                  100
                ]
              },
              else: 0
            }
          }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: platformMetrics
    });
  } catch (error) {
    logger.error('Error fetching platform metrics', { error: error.message });
    throw new APIError('Failed to fetch platform metrics', 500);
  }
});

// @desc    Get campaign performance
// @route   GET /api/analytics/campaigns
// @access  Private
exports.getCampaignPerformance = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for campaign performance request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get campaigns with goal progress
    const campaigns = await Campaign.find()
      .populate('goals')
      .sort({ createdAt: -1 });
    
    // Calculate campaign performance
    const campaignPerformance = campaigns.map(campaign => {
      let totalGoals = 0;
      let completedGoals = 0;
      let totalTargetValue = 0;
      let totalCurrentValue = 0;
      
      if (campaign.goals && Array.isArray(campaign.goals)) {
        totalGoals = campaign.goals.length;
        completedGoals = campaign.goals.filter(goal => 
          goal.targetValue > 0 && goal.currentValue >= goal.targetValue
        ).length;
        
        campaign.goals.forEach(goal => {
          totalTargetValue += goal.targetValue || 0;
          totalCurrentValue += goal.currentValue || 0;
        });
      }
      
      const progress = totalGoals > 0 ? (completedGoals / totalGoals * 100).toFixed(2) : 0;
      const valueProgress = totalTargetValue > 0 ? (totalCurrentValue / totalTargetValue * 100).toFixed(2) : 0;
      
      return {
        id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        totalGoals,
        completedGoals,
        progress: parseFloat(progress),
        valueProgress: parseFloat(valueProgress),
        totalTargetValue,
        totalCurrentValue
      };
    });
    
    res.status(200).json({
      success: true,
      data: campaignPerformance
    });
  } catch (error) {
    logger.error('Error fetching campaign performance', { error: error.message });
    throw new APIError('Failed to fetch campaign performance', 500);
  }
});

// @desc    Get content performance
// @route   GET /api/analytics/content
// @access  Private
exports.getContentPerformance = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for content performance request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get recent posts with metrics
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('createdBy', 'name email')
      .populate('campaign')
      .populate('goal');
    
    // Calculate content performance
    const contentPerformance = posts.map(post => {
      const totalEngagement = (post.metrics?.likes || 0) + 
                             (post.metrics?.comments || 0) + 
                             (post.metrics?.shares || 0);
      
      const engagementRate = post.metrics?.reach > 0 ? 
        ((totalEngagement / post.metrics.reach) * 100).toFixed(2) : '0.00';
      
      return {
        id: post._id,
        title: post.title,
        platform: post.platform,
        createdAt: post.createdAt,
        reach: post.metrics?.reach || 0,
        likes: post.metrics?.likes || 0,
        comments: post.metrics?.comments || 0,
        shares: post.metrics?.shares || 0,
        totalEngagement,
        engagementRate: parseFloat(engagementRate)
      };
    });
    
    res.status(200).json({
      success: true,
      data: contentPerformance
    });
  } catch (error) {
    logger.error('Error fetching content performance', { error: error.message });
    throw new APIError('Failed to fetch content performance', 500);
  }
});

// @desc    Export analytics report
// @route   GET /api/analytics/export/:format
// @access  Private
exports.exportReport = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for analytics export request');
    throw new APIError('Database not available', 503);
  }
  
  const { format } = req.params;
  
  try {
    // Get data for export
    const posts = await Post.find().populate('createdBy', 'name email');
    const campaigns = await Campaign.find().populate('goals');
    
    // Format data based on requested format
    let exportData;
    let contentType;
    let filename;
    
    switch (format.toLowerCase()) {
      case 'csv':
        // Simple CSV export
        const csvRows = [];
        csvRows.push('Title,Platform,Created By,Created At,Reach,Likes,Comments,Shares');
        posts.forEach(post => {
          csvRows.push([
            `"${post.title || ''}"`,
            post.platform || '',
            `"${post.createdBy?.name || ''}"`,
            post.createdAt?.toISOString() || '',
            post.metrics?.reach || 0,
            post.metrics?.likes || 0,
            post.metrics?.comments || 0,
            post.metrics?.shares || 0
          ].join(','));
        });
        
        exportData = csvRows.join('\n');
        contentType = 'text/csv';
        filename = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 'json':
      default:
        exportData = JSON.stringify({ posts, campaigns }, null, 2);
        contentType = 'application/json';
        filename = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(exportData);
  } catch (error) {
    logger.error('Error exporting analytics report', { error: error.message });
    throw new APIError('Failed to export analytics report', 500);
  }
});