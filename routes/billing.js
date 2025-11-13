const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const billingController = require('../controllers/billingController');

// All routes below are protected
router.use(protect);

// GET /api/billing - Get user's billing information
router.get('/', billingController.getBillingInfo);

// PUT /api/billing/subscription - Update user's subscription
router.put('/subscription', billingController.updateSubscription);

// PUT /api/billing/payment-method - Update user's payment method
router.put('/payment-method', billingController.updatePaymentMethod);

// GET /api/billing/invoices - Get user's invoice history
router.get('/invoices', billingController.getInvoiceHistory);

// POST /api/billing/invoices - Add an invoice
router.post('/invoices', billingController.addInvoice);

module.exports = router;