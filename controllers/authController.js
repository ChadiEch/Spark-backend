const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const { storeRefreshToken, getRefreshToken, removeRefreshToken, verifyRefreshToken } = require('../utils/refreshToken');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');

const logger = new Logger('auth-controller');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
// @complexity Medium - Involves database operations, password hashing, and JWT token generation
// @security Validates email format, enforces password strength, prevents duplicate registrations
exports.register = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  // This ensures we don't attempt operations on a disconnected database
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for register request');
    throw new APIError('Database not available', 503);
  }
  
  const { name, email, password, role } = req.body;

  // Validate required fields to ensure we have all necessary information
  // This prevents incomplete user registrations
  if (!name || !email || !password) {
    logger.warn('Missing required fields for registration', { email });
    throw new APIError('Please provide name, email and password', 400);
  }

  // Validate email format using regex to ensure it's a valid email address
  // This prevents invalid email addresses from being stored in the database
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger.warn('Invalid email format for registration', { email });
    throw new APIError('Please provide a valid email address', 400);
  }

  // Validate password strength to ensure security
  // Minimum 8 characters required to prevent weak passwords
  if (password.length < 8) {
    logger.warn('Password too short for registration', { email });
    throw new APIError('Password must be at least 8 characters long', 400);
  }

  // Check if user already exists to prevent duplicate accounts
  // This ensures email uniqueness in the system
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.warn('Registration attempt with existing email', { email });
    throw new APIError('User already exists', 400);
  }

  // Create user in database with plain text password
  // The User model's pre-save hook will automatically hash the password
  const user = await User.create({
    name,
    email,
    password, // Plain text password - will be hashed by User model pre-save hook
    role: role || 'CONTRIBUTOR'
  });

  // Create JWT access token for immediate authentication
  // Token expires based on JWT_EXPIRE environment variable
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  logger.info('User registered successfully', { userId: user._id, email });

  // Return success response with token and user information
  // Password is never sent back to the client for security
  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// @complexity Medium - Involves database lookup, password comparison, and token management
// @security Validates credentials, implements refresh token system, secure token storage
exports.login = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for login request');
    throw new APIError('Database not available', 503);
  }
  
  const { email, password } = req.body;

  // Validate that both email and password are provided
  // This prevents incomplete login attempts
  if (!email || !password) {
    logger.warn('Missing credentials for login');
    throw new APIError('Please provide an email and password', 400);
  }

  // Find user by email and explicitly select the password field
  // The password field is not selected by default in the User model for security
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    // Log failed login attempt with non-existent email
    // We don't distinguish between "user not found" and "wrong password" for security
    logger.warn('Login attempt with non-existent email', { email });
    throw new APIError('Invalid credentials', 401);
  }

  // Compare provided password with stored hashed password
  // This validates the user's credentials securely
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    // Log failed login attempt with invalid password
    logger.warn('Login attempt with invalid password', { email });
    throw new APIError('Invalid credentials', 401);
  }

  // Create access token for immediate authentication
  // Shorter expiration for security (based on JWT_EXPIRE)
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  // Create refresh token for long-term session management
  // Longer expiration (7 days) to reduce login frequency
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });

  // Store refresh token in secure storage (memory store in this implementation)
  // This enables token refresh without requiring re-authentication
  storeRefreshToken(user._id, refreshToken);

  logger.info('User logged in successfully', { userId: user._id, email });

  // Return success response with tokens and user information
  res.status(200).json({
    success: true,
    token,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// @desc    Logout user
// @route   GET /api/auth/logout
// @access  Private
// @complexity Low - Simple token invalidation and cleanup
// @security Removes refresh token to prevent session hijacking
exports.logout = asyncHandler(async (req, res, next) => {
  // Remove refresh token if it exists to invalidate the session
  // This prevents token reuse after logout
  if (req.user && req.user.id) {
    removeRefreshToken(req.user.id);
    logger.info('User logged out successfully', { userId: req.user.id });
  }
  
  // Clear HTTP-only cookie containing token (if used)
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  // Return success response
  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
// @complexity Medium - Involves token verification and regeneration
// @security Validates refresh token, generates new access token
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  // Validate that refresh token is provided
  if (!refreshToken) {
    logger.warn('Refresh token missing from request');
    throw new APIError('Refresh token is required', 400);
  }

  try {
    // Verify refresh token using JWT secret
    const decoded = verifyRefreshToken(refreshToken, process.env.JWT_SECRET);
    
    // Retrieve stored refresh token to ensure it hasn't been invalidated
    const storedRefreshToken = getRefreshToken(decoded.id);
    
    // Validate that the provided token matches the stored token
    if (refreshToken !== storedRefreshToken) {
      logger.warn('Invalid refresh token provided', { userId: decoded.id });
      throw new APIError('Invalid refresh token', 401);
    }

    // Generate new access token with standard expiration
    const newToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE
    });

    logger.info('Token refreshed successfully', { userId: decoded.id });

    // Return new access token
    res.status(200).json({
      success: true,
      token: newToken
    });
  } catch (error) {
    // Handle token verification errors
    logger.warn('Token refresh failed', { error: error.message });
    throw new APIError('Invalid refresh token', 401);
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
// @complexity Low - Simple database lookup
// @security Requires authentication
exports.getMe = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getMe request');
    throw new APIError('Database not available', 503);
  }
  
  // Find user by ID from authenticated request
  // The protect middleware ensures req.user is populated
  const user = await User.findById(req.user.id);
  if (!user) {
    logger.warn('User not found for getMe request', { userId: req.user.id });
    throw new APIError('User not found', 404);
  }

  logger.info('Current user retrieved successfully', { userId: user._id });

  // Return user data without sensitive information
  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});