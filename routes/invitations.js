const express = require('express');
const { 
  inviteMember,
  getInvitation,
  acceptInvitation
} = require('../controllers/invitationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes below are protected
router.use(protect);

// Admin routes
router.route('/')
  .post(authorize('ADMIN'), inviteMember);

// Public routes (no authentication required)
router.route('/:token')
  .get(getInvitation);

router.route('/:token/accept')
  .post(acceptInvitation);

module.exports = router;