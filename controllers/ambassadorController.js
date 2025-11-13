const Ambassador = require('../models/Ambassador');
const Post = require('../models/Post');
const Activity = require('../models/Activity');
const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');

const logger = new Logger('ambassador-controller');

// @desc    Get all ambassadors with pagination and filtering
// @route   GET /api/ambassadors
// @access  Private
exports.getAmbassadors = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getAmbassadors request');
    throw new APIError('Database not available', 503);
  }
  
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter object
  const filter = {};
  
  // Search filter
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Status filter
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) {
      filter.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.createdAt.$lte = new Date(req.query.endDate);
    }
  }
  
  // Get total count for pagination
  const total = await Ambassador.countDocuments(filter);
  
  // Get ambassadors with pagination and filtering
  const ambassadors = await Ambassador.find(filter)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  logger.info('Ambassadors retrieved successfully', { count: ambassadors.length, page, total });
  
  res.status(200).json({
    success: true,
    count: ambassadors.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: ambassadors
  });
});

// @desc    Get single ambassador
// @route   GET /api/ambassadors/:id
// @access  Private
exports.getAmbassador = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getAmbassador request');
    throw new APIError('Database not available', 503);
  }
  
  const ambassador = await Ambassador.findById(req.params.id);

  if (!ambassador) {
    logger.warn('Ambassador not found', { ambassadorId: req.params.id });
    throw new APIError(`Ambassador not found with id of ${req.params.id}`, 404);
  }

  logger.info('Ambassador retrieved successfully', { ambassadorId: ambassador._id });
  
  res.status(200).json({
    success: true,
    data: ambassador
  });
});

// @desc    Create new ambassador
// @route   POST /api/ambassadors
// @access  Private
exports.createAmbassador = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for createAmbassador request');
    throw new APIError('Database not available', 503);
  }
  
  const ambassador = await Ambassador.create(req.body);

  logger.info('Ambassador created successfully', { ambassadorId: ambassador._id });
  
  res.status(201).json({
    success: true,
    data: ambassador
  });
});

// @desc    Update ambassador
// @route   PUT /api/ambassadors/:id
// @access  Private
exports.updateAmbassador = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for updateAmbassador request');
    throw new APIError('Database not available', 503);
  }
  
  let ambassador = await Ambassador.findById(req.params.id);

  if (!ambassador) {
    logger.warn('Ambassador not found for update', { ambassadorId: req.params.id });
    throw new APIError(`Ambassador not found with id of ${req.params.id}`, 404);
  }

  ambassador = await Ambassador.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  logger.info('Ambassador updated successfully', { ambassadorId: ambassador._id });
  
  res.status(200).json({
    success: true,
    data: ambassador
  });
});

// @desc    Delete ambassador
// @route   DELETE /api/ambassadors/:id
// @access  Private
exports.deleteAmbassador = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for deleteAmbassador request');
    throw new APIError('Database not available', 503);
  }
  
  const ambassador = await Ambassador.findById(req.params.id);

  if (!ambassador) {
    logger.warn('Ambassador not found for deletion', { ambassadorId: req.params.id });
    throw new APIError(`Ambassador not found with id of ${req.params.id}`, 404);
  }

  // Use deleteOne() instead of remove() for newer Mongoose versions
  await ambassador.deleteOne();

  logger.info('Ambassador deleted successfully', { ambassadorId: ambassador._id });
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get ambassador performance metrics
// @route   GET /api/ambassadors/:id/performance
// @access  Private
exports.getAmbassadorPerformance = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getAmbassadorPerformance request');
    throw new APIError('Database not available', 503);
  }
  
  const ambassador = await Ambassador.findById(req.params.id);

  if (!ambassador) {
    logger.warn('Ambassador not found for performance metrics', { ambassadorId: req.params.id });
    throw new APIError(`Ambassador not found with id of ${req.params.id}`, 404);
  }

  // Get posts created by this ambassador
  const posts = await Post.find({ createdBy: ambassador._id });
  
  // Get activities related to this ambassador
  const activities = await Activity.find({ ambassador: ambassador._id });
  
  // Calculate performance metrics
  let totalReach = 0;
  let totalEngagement = 0;
  let totalPosts = posts.length;
  
  // Aggregate metrics from posts
  posts.forEach(post => {
    if (post.metrics) {
      totalReach += post.metrics.reach || 0;
      totalEngagement += (post.metrics.likes || 0) + (post.metrics.comments || 0) + (post.metrics.shares || 0);
    }
  });
  
  // Aggregate metrics from activities
  activities.forEach(activity => {
    if (activity.metrics) {
      totalReach += activity.metrics.reach || 0;
      totalEngagement += (activity.metrics.likes || 0) + (activity.metrics.comments || 0) + (activity.metrics.shares || 0);
    }
  });
  
  // Calculate average engagement rate
  const averageEngagementRate = totalPosts > 0 ? (totalEngagement / totalPosts) : 0;
  
  // Determine performance trend (simplified logic)
  let performanceTrend = 'stable';
  if (ambassador.metrics) {
    if (averageEngagementRate > ambassador.metrics.averageEngagementRate) {
      performanceTrend = 'increasing';
    } else if (averageEngagementRate < ambassador.metrics.averageEngagementRate) {
      performanceTrend = 'decreasing';
    }
  }
  
  const performanceData = {
    totalPosts: totalPosts,
    totalReach: totalReach,
    totalEngagement: totalEngagement,
    averageEngagementRate: averageEngagementRate,
    performanceTrend: performanceTrend,
    topPerformingPosts: posts
      .filter(post => post.metrics && post.metrics.reach)
      .sort((a, b) => (b.metrics.reach || 0) - (a.metrics.reach || 0))
      .slice(0, 5), // Top 5 posts by reach
    recentActivity: activities
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5) // Most recent 5 activities
  };

  logger.info('Ambassador performance metrics retrieved successfully', { ambassadorId: ambassador._id });
  
  res.status(200).json({
    success: true,
    data: performanceData
  });
});

// @desc    Update ambassador metrics
// @route   PUT /api/ambassadors/:id/metrics
// @access  Private
exports.updateAmbassadorMetrics = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for updateAmbassadorMetrics request');
    throw new APIError('Database not available', 503);
  }
  
  let ambassador = await Ambassador.findById(req.params.id);

  if (!ambassador) {
    logger.warn('Ambassador not found for metrics update', { ambassadorId: req.params.id });
    throw new APIError(`Ambassador not found with id of ${req.params.id}`, 404);
  }

  // Update ambassador metrics
  ambassador.metrics = {
    ...ambassador.metrics,
    ...req.body.metrics
  };
  
  ambassador = await ambassador.save();

  logger.info('Ambassador metrics updated successfully', { ambassadorId: ambassador._id });
  
  res.status(200).json({
    success: true,
    data: ambassador
  });
});