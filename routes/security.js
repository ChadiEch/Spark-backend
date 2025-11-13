const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const securityController = require('../controllers/securityController');

// All routes below are protected
router.use(protect);

// GET /api/security - Get user's security information
router.get('/', securityController.getSecurityInfo);

// POST /api/security/change-password - Change user password
router.post('/change-password', securityController.changePassword);

// POST /api/security/two-factor - Toggle two-factor authentication
router.post('/two-factor', securityController.toggleTwoFactorAuth);

// DELETE /api/security/sessions/:id - Revoke a session
router.delete('/sessions/:id', securityController.revokeSession);

// DELETE /api/security/sessions - Revoke all sessions except current
router.delete('/sessions', securityController.revokeAllSessions);

module.exports = router;