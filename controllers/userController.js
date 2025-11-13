const User = require('../models/User');
const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');

const logger = new Logger('user-controller');

// @desc    Get all users with pagination and filtering
// @route   GET /api/users
// @access  Private
exports.getUsers = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getUsers request');
    throw new APIError('Database not available', 503);
  }
  
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter object
  const filter = {};
  
  // Role filter
  if (req.query.role) {
    filter.role = req.query.role;
  }
  
  // Search filter
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
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
  const total = await User.countDocuments(filter);
  
  // Get users with pagination and filtering
  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  logger.info('Users retrieved successfully', { count: users.length, page, total });
  
  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getUser request');
    throw new APIError('Database not available', 503);
  }
  
  const user = await User.findById(req.params.id);

  if (!user) {
    logger.warn('User not found', { userId: req.params.id });
    throw new APIError(`User not found with id of ${req.params.id}`, 404);
  }

  logger.info('User retrieved successfully', { userId: user._id });
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for createUser request');
    throw new APIError('Database not available', 503);
  }
  
  // Only ADMIN can create users with specific roles
  if (req.user.role !== 'ADMIN' && req.body.role && req.body.role !== 'CONTRIBUTOR') {
    throw new APIError('Only ADMIN users can assign roles other than CONTRIBUTOR', 403);
  }
  
  // If no role is specified, default to CONTRIBUTOR
  if (!req.body.role) {
    req.body.role = 'CONTRIBUTOR';
  }
  
  const user = await User.create(req.body);

  logger.info('User created successfully', { userId: user._id });
  
  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for updateUser request');
    throw new APIError('Database not available', 503);
  }
  
  // Check if user is trying to update their own role
  if (req.params.id === req.user.id && req.body.role && req.body.role !== req.user.role) {
    throw new APIError('Users cannot change their own role', 403);
  }
  
  // Only ADMIN can change user roles
  if (req.body.role && req.user.role !== 'ADMIN') {
    throw new APIError('Only ADMIN users can change roles', 403);
  }
  
  // Prevent non-ADMIN users from updating ADMIN users
  if (req.user.role !== 'ADMIN') {
    const userToUpdate = await User.findById(req.params.id);
    if (userToUpdate && userToUpdate.role === 'ADMIN') {
      throw new APIError('Only ADMIN users can update other ADMIN users', 403);
    }
  }
  
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    logger.warn('User not found for update', { userId: req.params.id });
    throw new APIError(`User not found with id of ${req.params.id}`, 404);
  }

  logger.info('User updated successfully', { userId: user._id });
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for deleteUser request');
    throw new APIError('Database not available', 503);
  }
  
  // Prevent users from deleting themselves
  if (req.params.id === req.user.id) {
    throw new APIError('Users cannot delete themselves', 400);
  }
  
  // Prevent non-ADMIN users from deleting ADMIN users
  if (req.user.role !== 'ADMIN') {
    const userToDelete = await User.findById(req.params.id);
    if (userToDelete && userToDelete.role === 'ADMIN') {
      throw new APIError('Only ADMIN users can delete other ADMIN users', 403);
    }
  }
  
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    logger.warn('User not found for deletion', { userId: req.params.id });
    throw new APIError(`User not found with id of ${req.params.id}`, 404);
  }

  logger.info('User deleted successfully', { userId: user._id });
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.updateUserRole = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for updateUserRole request');
    throw new APIError('Database not available', 503);
  }
  
  // Only ADMIN can change user roles
  if (req.user.role !== 'ADMIN') {
    throw new APIError('Only ADMIN users can change roles', 403);
  }
  
  // Validate role
  const { role } = req.body;
  const validRoles = ['ADMIN', 'MANAGER', 'CONTRIBUTOR', 'VIEWER'];
  
  if (!validRoles.includes(role)) {
    throw new APIError(`Invalid role. Valid roles are: ${validRoles.join(', ')}`, 400);
  }
  
  // Prevent users from changing their own role
  if (req.params.id === req.user.id) {
    throw new APIError('Users cannot change their own role', 400);
  }
  
  const user = await User.findByIdAndUpdate(req.params.id, { role }, {
    new: true,
    runValidators: true
  });

  if (!user) {
    logger.warn('User not found for role update', { userId: req.params.id });
    throw new APIError(`User not found with id of ${req.params.id}`, 404);
  }

  logger.info('User role updated successfully', { userId: user._id, newRole: role });
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get role statistics
// @route   GET /api/users/stats/roles
// @access  Private/Admin
exports.getRoleStats = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getRoleStats request');
    throw new APIError('Database not available', 503);
  }
  
  // Only ADMIN can access role statistics
  if (req.user.role !== 'ADMIN') {
    throw new APIError('Only ADMIN users can access role statistics', 403);
  }
  
  // Get role statistics
  const roleStats = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        role: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);

  logger.info('Role statistics retrieved successfully');
  
  res.status(200).json({
    success: true,
    data: roleStats
  });
});