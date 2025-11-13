const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// All routes below are protected
router.use(protect);

// GET /api/analytics/overview - Get analytics overview
router.get('/overview', analyticsController.getOverview);

// GET /api/analytics/report - Get detailed analytics report
router.get('/report', analyticsController.getDetailedReport);

// GET /api/analytics/platforms - Get platform metrics
router.get('/platforms', analyticsController.getPlatformMetrics);

// GET /api/analytics/campaigns - Get campaign performance
router.get('/campaigns', analyticsController.getCampaignPerformance);

// GET /api/analytics/content - Get content performance
router.get('/content', analyticsController.getContentPerformance);

// GET /api/analytics/export/:format - Export analytics report
router.get('/export/:format', analyticsController.exportReport);

module.exports = router;