const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// GET /api/health - Basic health check (no database required)
router.get('/', healthController.getHealth);

// GET /api/health/detailed - Detailed health check (no database required)
router.get('/detailed', healthController.getDetailedHealth);

module.exports = router;