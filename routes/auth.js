const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/register - Register a new user
router.post('/register', authLimiter, authController.register);

// POST /api/auth/login - Login user
router.post('/login', authLimiter, authController.login);

// GET /api/auth/logout - Logout user
router.get('/logout', protect, authController.logout);

// POST /api/auth/refresh - Refresh token
router.post('/refresh', authController.refreshToken);

// GET /api/auth/me - Get current user
router.get('/me', protect, authController.getMe);

module.exports = router;