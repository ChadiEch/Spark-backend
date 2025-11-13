const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const goalController = require('../controllers/goalController');

// All routes below are protected
router.use(protect);

// GET /api/goals - Get all goals
router.get('/', goalController.getGoals);

// GET /api/goals/:id - Get single goal
router.get('/:id', goalController.getGoal);

// POST /api/goals - Create new goal
router.post('/', goalController.createGoal);

// PUT /api/goals/:id - Update goal
router.put('/:id', goalController.updateGoal);

// DELETE /api/goals/:id - Delete goal
router.delete('/:id', goalController.deleteGoal);

module.exports = router;