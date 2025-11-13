const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const taskController = require('../controllers/taskController');

// All routes below are protected
router.use(protect);

// GET /api/tasks - Get all tasks
router.get('/', taskController.getTasks);

// GET /api/tasks/:id - Get single task
router.get('/:id', taskController.getTask);

// POST /api/tasks - Create new task
router.post('/', taskController.createTask);

// PUT /api/tasks/:id - Update task
router.put('/:id', taskController.updateTask);

// PUT /api/tasks/:id/trash - Move task to trash
router.put('/:id/trash', taskController.trashTask);

// PUT /api/tasks/:id/restore - Restore task from trash
router.put('/:id/restore', taskController.restoreTask);

// GET /api/tasks/trash - Get trashed tasks for user
router.get('/trash', taskController.getTrashedTasks);

// DELETE /api/tasks/:id - Delete task permanently
router.delete('/:id', taskController.deleteTask);

module.exports = router;