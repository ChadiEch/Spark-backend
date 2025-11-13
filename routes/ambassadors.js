const express = require('express');
const { getAmbassadors, getAmbassador, createAmbassador, updateAmbassador, deleteAmbassador, getAmbassadorPerformance, updateAmbassadorMetrics } = require('../controllers/ambassadorController');

// Router
const router = express.Router();

// Routes
router.route('/')
  .get(getAmbassadors)
  .post(createAmbassador);

router.route('/:id')
  .get(getAmbassador)
  .put(updateAmbassador)
  .delete(deleteAmbassador);

router.route('/:id/performance')
  .get(getAmbassadorPerformance);
  
router.route('/:id/metrics')
  .put(updateAmbassadorMetrics);

module.exports = router;