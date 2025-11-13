// Utility functions for handling refresh tokens
const jwt = require('jsonwebtoken');

// In production, use Redis or database instead of Map
const refreshTokens = new Map();

// Store refresh token
const storeRefreshToken = (userId, refreshToken) => {
  refreshTokens.set(userId.toString(), refreshToken);
};

// Get refresh token
const getRefreshToken = (userId) => {
  return refreshTokens.get(userId.toString());
};

// Remove refresh token
const removeRefreshToken = (userId) => {
  refreshTokens.delete(userId.toString());
};

// Verify refresh token
const verifyRefreshToken = (refreshToken, secret) => {
  try {
    return jwt.verify(refreshToken, secret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  storeRefreshToken,
  getRefreshToken,
  removeRefreshToken,
  verifyRefreshToken
};