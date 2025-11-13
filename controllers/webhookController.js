const mongoose = require('mongoose');
const crypto = require('crypto');
const IntegrationConnection = require('../models/IntegrationConnection');
const Logger = require('../utils/logger');

const logger = new Logger('webhook-controller');

/**
 * Verify webhook signature for Facebook/Instagram
 * @param {string} signature - The X-Hub-Signature header
 * @param {string} payload - The webhook payload
 * @param {string} secret - The app secret
 * @returns {boolean} - Whether the signature is valid
 */
const verifyFacebookSignature = (signature, payload, secret) => {
  if (!signature) return false;
  
  const signatureHash = signature.split('=')[1];
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
    
  return signatureHash === expectedHash;
};

/**
 * Verify webhook signature for TikTok
 * @param {string} timestamp - The X-Timestamp header
 * @param {string} nonce - The X-Nonce header
 * @param {string} signature - The X-Signature header
 * @param {string} payload - The webhook payload
 * @param {string} secret - The webhook secret
 * @returns {boolean} - Whether the signature is valid
 */
const verifyTikTokSignature = (timestamp, nonce, signature, payload, secret) => {
  const signatureBase = `${timestamp}${nonce}${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signatureBase)
    .digest('hex');
    
  return signature === expectedSignature;
};

/**
 * Handle Facebook/Instagram webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.handleFacebookWebhook = async (req, res) => {
  try {
    // Handle verification challenge
    if (req.query['hub.mode'] === 'subscribe') {
      // In a real implementation, you would verify the verify_token
      return res.status(200).send(req.query['hub.challenge']);
    }
    
    // Verify signature
    const signature = req.get('X-Hub-Signature-256');
    // Note: You would need to retrieve the app secret from the integration config
    // const secret = integration.clientSecret;
    // if (!verifyFacebookSignature(signature, JSON.stringify(req.body), secret)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }
    
    // Process the webhook event
    const event = req.body;
    
    // Log the event for debugging
    logger.info('Received Facebook webhook event', { event });
    
    // Process different types of events
    if (event.object === 'page') {
      for (const entry of event.entry) {
        const pageId = entry.id;
        
        // Process each change
        for (const change of entry.changes) {
          // Handle different field changes
          switch (change.field) {
            case 'feed':
              // Handle feed updates (new posts, comments, etc.)
              logger.info('Feed update', { pageId, change });
              break;
              
            case 'messages':
              // Handle message updates
              logger.info('Message update', { pageId, change });
              break;
              
            default:
              logger.info('Unhandled field change', { field: change.field, change });
          }
        }
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling Facebook webhook', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Handle TikTok webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.handleTikTokWebhook = async (req, res) => {
  try {
    // Verify signature
    const timestamp = req.get('X-Timestamp');
    const nonce = req.get('X-Nonce');
    const signature = req.get('X-Signature');
    
    // Note: You would need to retrieve the webhook secret from the integration config
    // const secret = integration.webhookSecret;
    // if (!verifyTikTokSignature(timestamp, nonce, signature, JSON.stringify(req.body), secret)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }
    
    // Process the webhook event
    const event = req.body;
    
    // Log the event for debugging
    logger.info('Received TikTok webhook event', { event });
    
    // Process different types of events
    switch (event.type) {
      case 'video.like':
        // Handle video like events
        logger.info('Video like event', { event });
        break;
        
      case 'video.comment':
        // Handle video comment events
        logger.info('Video comment event', { event });
        break;
        
      case 'video.share':
        // Handle video share events
        logger.info('Video share event', { event });
        break;
        
      default:
        logger.info('Unhandled TikTok event type', { type: event.type, event });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling TikTok webhook', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Handle Google webhook events (Pub/Sub)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.handleGoogleWebhook = async (req, res) => {
  try {
    // Google webhooks use Pub/Sub push notifications
    // The payload is in the message.data field (base64 encoded)
    const message = req.body.message;
    
    if (!message) {
      return res.status(400).json({ error: 'Invalid message format' });
    }
    
    // Decode the message data
    const payload = JSON.parse(Buffer.from(message.data, 'base64').toString());
    
    // Log the event for debugging
    logger.info('Received Google webhook event', { payload });
    
    // Process YouTube events
    if (payload.resource && payload.resource.kind === 'youtube#video') {
      // Handle YouTube video events
      logger.info('YouTube video event', { payload });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error handling Google webhook', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};