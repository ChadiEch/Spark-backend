const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const campaignController = require('../controllers/campaignController');

// All routes below are protected
router.use(protect);

// GET /api/campaigns - Get all campaigns
router.get('/', campaignController.getCampaigns);

// GET /api/campaigns/:id - Get single campaign
router.get('/:id', campaignController.getCampaign);

// POST /api/campaigns - Create new campaign
router.post('/', campaignController.createCampaign);

// PUT /api/campaigns/:id - Update campaign
router.put('/:id', campaignController.updateCampaign);

// DELETE /api/campaigns/:id - Delete campaign
router.delete('/:id', campaignController.deleteCampaign);

module.exports = router;