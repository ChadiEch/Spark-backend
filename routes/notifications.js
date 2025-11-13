const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// All routes below are protected
router.use(protect);

// GET /api/notifications - Get user's notifications
router.get('/', notificationController.getNotifications);

// GET /api/notifications/unread-count - Get unread notifications count
router.get('/unread-count', notificationController.getUnreadCount);

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', notificationController.deleteNotification);

// DELETE /api/notifications/read - Delete all read notifications
router.delete('/read', notificationController.deleteReadNotifications);

module.exports = router;