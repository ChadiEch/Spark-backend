const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Facebook/Instagram webhook
router.get('/facebook', webhookController.handleFacebookWebhook);
router.post('/facebook', webhookController.handleFacebookWebhook);

// TikTok webhook
router.post('/tiktok', webhookController.handleTikTokWebhook);

// Google webhook (YouTube, Google Drive)
router.post('/google', webhookController.handleGoogleWebhook);

module.exports = router;