const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const User = require('../models/User');
const Security = require('../models/Security');

const logger = new Logger('security-controller');

// @desc    Get user's security information
// @route   GET /api/security
// @access  Private
exports.getSecurityInfo = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for security info request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get user's security information from the Security model
    let security = await Security.findOne({ userId: req.user.id });
    
    // If no security document exists, create one
    if (!security) {
      security = await Security.create({ userId: req.user.id });
    }
    
    res.status(200).json({
      success: true,
      data: security
    });
  } catch (error) {
    logger.error('Error fetching security information', { error: error.message });
    throw new APIError('Failed to fetch security information', 500);
  }
});

// @desc    Change user password
// @route   POST /api/security/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for password change request');
    throw new APIError('Database not available', 503);
  }
  
  const { currentPassword, newPassword } = req.body;
  
  // Validate input
  if (!currentPassword || !newPassword) {
    throw new APIError('Please provide current and new passwords', 400);
  }
  
  if (newPassword.length < 8) {
    throw new APIError('Password must be at least 8 characters long', 400);
  }
  
  try {
    // Find user with password
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      throw new APIError('User not found', 404);
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new APIError('Current password is incorrect', 400);
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    // Update security document with password change information
    let security = await Security.findOne({ userId: req.user.id });
    if (!security) {
      security = await Security.create({ 
        userId: req.user.id,
        lastPasswordChange: new Date()
      });
    } else {
      security.lastPasswordChange = new Date();
      // Add to password history (keep last 5 passwords)
      if (!security.passwordHistory) {
        security.passwordHistory = [];
      }
      security.passwordHistory.unshift({
        password: user.password, // This is the old hashed password
        changedAt: new Date()
      });
      // Keep only last 5 passwords
      if (security.passwordHistory.length > 5) {
        security.passwordHistory = security.passwordHistory.slice(0, 5);
      }
      await security.save();
    }
    
    logger.info('Password changed successfully', { userId: user._id });
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      data: security
    });
  } catch (error) {
    logger.error('Error changing password', { error: error.message });
    throw new APIError('Failed to change password', 500);
  }
});

// @desc    Toggle two-factor authentication
// @route   POST /api/security/two-factor
// @access  Private
exports.toggleTwoFactorAuth = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for 2FA toggle request');
    throw new APIError('Database not available', 503);
  }
  
  const { enabled } = req.body;
  
  try {
    // Get or create security document
    let security = await Security.findOne({ userId: req.user.id });
    if (!security) {
      security = await Security.create({ userId: req.user.id });
    }
    
    // Update 2FA settings
    security.twoFactorAuth = {
      ...security.twoFactorAuth,
      enabled: enabled
    };
    
    await security.save();
    
    const message = enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled';
    
    logger.info(message, { userId: req.user.id });
    
    res.status(200).json({
      success: true,
      message,
      data: security
    });
  } catch (error) {
    logger.error('Error toggling two-factor authentication', { error: error.message });
    throw new APIError('Failed to toggle two-factor authentication', 500);
  }
});

// @desc    Revoke a session
// @route   DELETE /api/security/sessions/:id
// @access  Private
exports.revokeSession = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for session revoke request');
    throw new APIError('Database not available', 503);
  }
  
  const { id } = req.params;
  
  try {
    // Get security document
    const security = await Security.findOne({ userId: req.user.id });
    
    if (!security) {
      throw new APIError('Security record not found', 404);
    }
    
    // Find and remove the session
    const sessionIndex = security.sessions.findIndex(session => 
      session.id === id
    );
    
    if (sessionIndex === -1) {
      throw new APIError('Session not found', 404);
    }
    
    // Don't allow users to revoke their current session
    if (security.sessions[sessionIndex].current) {
      throw new APIError('Cannot revoke current session', 400);
    }
    
    // Remove the session
    security.sessions.splice(sessionIndex, 1);
    await security.save();
    
    logger.info('Session revoked successfully', { sessionId: id, userId: req.user.id });
    
    res.status(200).json({
      success: true,
      message: 'Session revoked successfully',
      data: security
    });
  } catch (error) {
    logger.error('Error revoking session', { error: error.message });
    throw new APIError('Failed to revoke session', 500);
  }
});

// @desc    Revoke all sessions except current
// @route   DELETE /api/security/sessions
// @access  Private
exports.revokeAllSessions = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for revoke all sessions request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get security document
    const security = await Security.findOne({ userId: req.user.id });
    
    if (!security) {
      throw new APIError('Security record not found', 404);
    }
    
    // Keep only current session
    security.sessions = security.sessions.filter(session => session.current);
    
    await security.save();
    
    logger.info('All sessions revoked successfully', { userId: req.user.id });
    
    res.status(200).json({
      success: true,
      message: 'All sessions revoked successfully',
      data: security
    });
  } catch (error) {
    logger.error('Error revoking all sessions', { error: error.message });
    throw new APIError('Failed to revoke all sessions', 500);
  }
});