const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const Notification = require('../models/Notification');

const logger = new Logger('notification-controller');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for notifications request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get notifications for the current user
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    logger.error('Error fetching notifications', { error: error.message });
    throw new APIError('Failed to fetch notifications', 500);
  }
});

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for unread count request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get count of unread notifications for the current user
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });
    
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logger.error('Error fetching unread notifications count', { error: error.message });
    throw new APIError('Failed to fetch unread notifications count', 500);
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for mark as read request');
    throw new APIError('Database not available', 503);
  }
  
  const { id } = req.params;
  
  try {
    // Find and update notification
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user.id },
      { read: true, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!notification) {
      throw new APIError('Notification not found', 404);
    }
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Error marking notification as read', { error: error.message });
    throw new APIError('Failed to mark notification as read', 500);
  }
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for mark all as read request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Update all unread notifications for the current user
    const result = await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { read: true, updatedAt: Date.now() }
    );
    
    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      data: { count: result.modifiedCount }
    });
  } catch (error) {
    logger.error('Error marking all notifications as read', { error: error.message });
    throw new APIError('Failed to mark all notifications as read', 500);
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for delete notification request');
    throw new APIError('Database not available', 503);
  }
  
  const { id } = req.params;
  
  try {
    // Find and delete notification
    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user.id
    });
    
    if (!notification) {
      throw new APIError('Notification not found', 404);
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
      data: {}
    });
  } catch (error) {
    logger.error('Error deleting notification', { error: error.message });
    throw new APIError('Failed to delete notification', 500);
  }
});

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/read
// @access  Private
exports.deleteReadNotifications = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for delete read notifications request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Delete all read notifications for the current user
    const result = await Notification.deleteMany({
      recipient: req.user.id,
      read: true
    });
    
    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} read notifications`,
      data: { count: result.deletedCount }
    });
  } catch (error) {
    logger.error('Error deleting read notifications', { error: error.message });
    throw new APIError('Failed to delete read notifications', 500);
  }
});