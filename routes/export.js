const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const exportController = require('../controllers/exportController');

// All routes below are protected
router.use(protect);

// GET /api/export/:entity/:format - Export data by entity and format
router.get('/:entity/:format', exportController.exportData);

// GET /api/export/analytics/:format - Export analytics report
router.get('/analytics/:format', exportController.exportAnalytics);

module.exports = router;