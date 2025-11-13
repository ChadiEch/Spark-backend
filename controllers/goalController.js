const Goal = require('../models/Goal');
const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const { createGoalProgressNotification } = require('../utils/notificationUtils');

const logger = new Logger('goal-controller');

// @desc    Get all goals with pagination and filtering
// @route   GET /api/goals
// @access  Private
exports.getGoals = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getGoals request');
    throw new APIError('Database not available', 503);
  }
  
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter object
  const filter = {};
  
  // Status filter
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Owner filter
  if (req.query.owner) {
    filter.owner = req.query.owner;
  }
  
  // Search filter
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
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
  const total = await Goal.countDocuments(filter);
  
  // Get goals with pagination and filtering
  const goals = await Goal.find(filter)
    .populate('owner', 'name email')
    .populate('campaigns', 'name')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  logger.info('Goals retrieved successfully', { count: goals.length, page, total });
  
  res.status(200).json({
    success: true,
    count: goals.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: goals
  });
});

// @desc    Get single goal
// @route   GET /api/goals/:id
// @access  Private
exports.getGoal = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getGoal request');
    throw new APIError('Database not available', 503);
  }
  
  const goal = await Goal.findById(req.params.id).populate('owner', 'name email').populate('campaigns', 'name');

  if (!goal) {
    logger.warn('Goal not found', { goalId: req.params.id });
    throw new APIError(`Goal not found with id of ${req.params.id}`, 404);
  }

  logger.info('Goal retrieved successfully', { goalId: goal._id });
  
  res.status(200).json({
    success: true,
    data: goal
  });
});

// @desc    Create new goal
// @route   POST /api/goals
// @access  Private
exports.createGoal = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for createGoal request');
    throw new APIError('Database not available', 503);
  }
  
  // Ensure owner is set to the authenticated user if not provided
  if (!req.body.owner) {
    req.body.owner = req.user.id;
  }
  
  // If owner is an object, extract just the ID
  if (req.body.owner && typeof req.body.owner === 'object' && req.body.owner.id) {
    req.body.owner = req.body.owner.id;
  }
  
  const goal = await Goal.create(req.body);

  // Populate the response with user details
  const populatedGoal = await Goal.findById(goal._id)
    .populate('owner', 'name email')
    .populate('campaigns', 'name');

  logger.info('Goal created successfully', { goalId: goal._id });
  
  res.status(201).json({
    success: true,
    data: populatedGoal
  });
});

// @desc    Update goal
// @route   PUT /api/goals/:id
// @access  Private
exports.updateGoal = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for updateGoal request');
    throw new APIError('Database not available', 503);
  }
  
  let goal = await Goal.findById(req.params.id);

  if (!goal) {
    logger.warn('Goal not found for update', { goalId: req.params.id });
    throw new APIError(`Goal not found with id of ${req.params.id}`, 404);
  }

  // Check if user is the owner or is an admin
  if (goal.owner.toString() !== req.user.id && req.user.role !== 'ADMIN') {
    logger.warn('Unauthorized goal update attempt', { 
      userId: req.user.id, 
      goalId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to update this goal', 401);
  }

  // Store previous current value for progress notification
  const previousCurrentValue = goal.currentValue;

  // Handle owner field if present
  if (req.body.owner && typeof req.body.owner === 'object' && req.body.owner.id) {
    req.body.owner = req.body.owner.id;
  }

  goal = await Goal.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Check if progress has significantly changed and send notification
  if (goal.targetValue > 0) {
    const previousProgress = previousCurrentValue ? (previousCurrentValue / goal.targetValue) * 100 : 0;
    const currentProgress = (goal.currentValue / goal.targetValue) * 100;
    
    // Send notification if progress crosses significant thresholds
    const significantThresholds = [50, 90, 100];
    const crossedThreshold = significantThresholds.find(threshold => 
      previousProgress < threshold && currentProgress >= threshold
    );
    
    if (crossedThreshold) {
      try {
        await createGoalProgressNotification(goal, goal.owner, currentProgress);
      } catch (error) {
        logger.error('Failed to send goal progress notification', { error: error.message });
      }
    }
  }

  // Populate the response with user details
  const populatedGoal = await Goal.findById(goal._id)
    .populate('owner', 'name email')
    .populate('campaigns', 'name');

  logger.info('Goal updated successfully', { goalId: goal._id });
  
  res.status(200).json({
    success: true,
    data: populatedGoal
  });
});

// @desc    Delete goal
// @route   DELETE /api/goals/:id
// @access  Private
exports.deleteGoal = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for deleteGoal request');
    throw new APIError('Database not available', 503);
  }
  
  const goal = await Goal.findById(req.params.id);

  if (!goal) {
    logger.warn('Goal not found for deletion', { goalId: req.params.id });
    throw new APIError(`Goal not found with id of ${req.params.id}`, 404);
  }

  // Check if user is the owner or is an admin
  // Convert both IDs to strings for comparison
  const goalOwnerId = goal.owner.toString();
  const userId = req.user.id.toString();
  
  if (goalOwnerId !== userId && req.user.role !== 'ADMIN') {
    logger.warn('Unauthorized goal deletion attempt', { 
      userId: req.user.id, 
      goalId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to delete this goal', 401);
  }

  // Use deleteOne() instead of remove() for newer Mongoose versions
  await goal.deleteOne();

  logger.info('Goal deleted successfully', { goalId: goal._id });
  
  res.status(200).json({
    success: true,
    data: {}
  });
});