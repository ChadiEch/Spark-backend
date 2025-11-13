const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');

// All routes below are protected
router.use(protect);

// GET /api/users - Get all users (now accessible to all authenticated users)
router.get('/', userController.getUsers);

// GET /api/users/:id - Get single user
router.get('/:id', userController.getUser);

// POST /api/users - Create user (Admin only)
router.post('/', authorize('ADMIN'), userController.createUser);

// PUT /api/users/:id - Update user (Admin only for updating others)
router.put('/:id', authorize('ADMIN'), userController.updateUser);

// PUT /api/users/:id/role - Update user role (Admin only)
router.put('/:id/role', authorize('ADMIN'), userController.updateUserRole);

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

// GET /api/users/stats/roles - Get role statistics (Admin only)
router.get('/stats/roles', authorize('ADMIN'), userController.getRoleStats);

module.exports = router;