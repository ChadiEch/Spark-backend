const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity
} = require('../controllers/activityController');

const router = express.Router();

// All routes below are protected
router.use(protect);

// GET /api/activities - Get all activities
// POST /api/activities - Create new activity
router.route('/')
  .get(getActivities)
  .post(authorize('ADMIN', 'MANAGER'), createActivity);

// GET /api/activities/:id - Get single activity
// PUT /api/activities/:id - Update activity
// DELETE /api/activities/:id - Delete activity
router.route('/:id')
  .get(getActivity)
  .put(authorize('ADMIN', 'MANAGER'), updateActivity)
  .delete(authorize('ADMIN', 'MANAGER'), deleteActivity);

module.exports = router;