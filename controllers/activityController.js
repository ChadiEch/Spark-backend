const Activity = require('../models/Activity');
const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');

const logger = new Logger('activity-controller');

// @desc    Get all activities with pagination and filtering
// @route   GET /api/activities
// @access  Private
exports.getActivities = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getActivities request');
    throw new APIError('Database not available', 503);
  }
  
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter object
  const filter = {};
  
  // Type filter
  if (req.query.type) {
    filter.type = req.query.type;
  }
  
  // Campaign filter
  if (req.query.campaign) {
    filter.campaign = req.query.campaign;
  }
  
  // Goal filter
  if (req.query.goal) {
    filter.goal = req.query.goal;
  }
  
  // Search filter
  if (req.query.search) {
    filter.$or = [
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Get total count for pagination
  const total = await Activity.countDocuments(filter);
  
  // Get activities with pagination and filtering
  const activities = await Activity.find(filter)
    .populate('campaign', 'name')
    .populate('goal', 'title')
    .populate('ambassador', 'name')
    .populate('post', 'title')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  logger.info('Activities retrieved successfully', { count: activities.length, page, total });
  
  res.status(200).json({
    success: true,
    count: activities.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: activities
  });
});

// @desc    Get single activity
// @route   GET /api/activities/:id
// @access  Private
exports.getActivity = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getActivity request');
    throw new APIError('Database not available', 503);
  }
  
  const activity = await Activity.findById(req.params.id)
    .populate('campaign', 'name')
    .populate('goal', 'title')
    .populate('ambassador', 'name')
    .populate('post', 'title');

  if (!activity) {
    logger.warn('Activity not found', { activityId: req.params.id });
    throw new APIError(`Activity not found with id of ${req.params.id}`, 404);
  }

  logger.info('Activity retrieved successfully', { activityId: activity._id });
  
  res.status(200).json({
    success: true,
    data: activity
  });
});

// @desc    Create new activity
// @route   POST /api/activities
// @access  Private
exports.createActivity = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for createActivity request');
    throw new APIError('Database not available', 503);
  }
  
  const activity = await Activity.create(req.body);

  // Populate the response with related data
  const populatedActivity = await Activity.findById(activity._id)
    .populate('campaign', 'name')
    .populate('goal', 'title')
    .populate('ambassador', 'name')
    .populate('post', 'title');

  logger.info('Activity created successfully', { activityId: activity._id });
  
  res.status(201).json({
    success: true,
    data: populatedActivity
  });
});

// @desc    Update activity
// @route   PUT /api/activities/:id
// @access  Private
exports.updateActivity = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for updateActivity request');
    throw new APIError('Database not available', 503);
  }
  
  let activity = await Activity.findById(req.params.id);

  if (!activity) {
    logger.warn('Activity not found for update', { activityId: req.params.id });
    throw new APIError(`Activity not found with id of ${req.params.id}`, 404);
  }

  activity = await Activity.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Populate the response with related data
  const populatedActivity = await Activity.findById(activity._id)
    .populate('campaign', 'name')
    .populate('goal', 'title')
    .populate('ambassador', 'name')
    .populate('post', 'title');

  logger.info('Activity updated successfully', { activityId: activity._id });
  
  res.status(200).json({
    success: true,
    data: populatedActivity
  });
});

// @desc    Delete activity
// @route   DELETE /api/activities/:id
// @access  Private
exports.deleteActivity = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for deleteActivity request');
    throw new APIError('Database not available', 503);
  }
  
  const activity = await Activity.findById(req.params.id);

  if (!activity) {
    logger.warn('Activity not found for deletion', { activityId: req.params.id });
    throw new APIError(`Activity not found with id of ${req.params.id}`, 404);
  }

  // Use deleteOne() instead of remove() for newer Mongoose versions
  await activity.deleteOne();

  logger.info('Activity deleted successfully', { activityId: activity._id });
  
  res.status(200).json({
    success: true,
    data: {}
  });
});