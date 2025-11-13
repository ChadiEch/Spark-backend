const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const Billing = require('../models/Billing');

const logger = new Logger('billing-controller');

// @desc    Get user's billing information
// @route   GET /api/billing
// @access  Private
exports.getBillingInfo = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for billing info request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get or create billing information for the user
    let billing = await Billing.findOne({ userId: req.user.id });
    
    // If no billing document exists, create one with default values
    if (!billing) {
      billing = await Billing.create({ 
        userId: req.user.id,
        subscription: {
          plan: 'free',
          status: 'active',
          startDate: new Date(),
          autoRenew: true,
          price: {
            amount: 0,
            currency: 'USD'
          }
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: billing
    });
  } catch (error) {
    logger.error('Error fetching billing information', { error: error.message });
    throw new APIError('Failed to fetch billing information', 500);
  }
});

// @desc    Update user's subscription
// @route   PUT /api/billing/subscription
// @access  Private
exports.updateSubscription = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for subscription update request');
    throw new APIError('Database not available', 503);
  }
  
  const { plan } = req.body;
  
  // Validate plan
  const validPlans = ['free', 'starter', 'professional', 'enterprise'];
  if (!validPlans.includes(plan)) {
    throw new APIError('Invalid plan', 400);
  }
  
  try {
    // Get or create billing information for the user
    let billing = await Billing.findOne({ userId: req.user.id });
    
    // If no billing document exists, create one
    if (!billing) {
      billing = await Billing.create({ userId: req.user.id });
    }
    
    // Update subscription plan
    const planPrices = {
      'free': 0,
      'starter': 14.99,
      'professional': 29.99,
      'enterprise': 99.99
    };
    
    billing.subscription.plan = plan;
    billing.subscription.price.amount = planPrices[plan];
    
    // Set end date based on current plan (1 month from now for paid plans)
    if (plan !== 'free') {
      billing.subscription.endDate = new Date();
      billing.subscription.endDate.setMonth(billing.subscription.endDate.getMonth() + 1);
    } else {
      billing.subscription.endDate = undefined;
    }
    
    await billing.save();
    
    res.status(200).json({
      success: true,
      data: billing
    });
  } catch (error) {
    logger.error('Error updating subscription', { error: error.message });
    throw new APIError('Failed to update subscription', 500);
  }
});

// @desc    Update user's payment method
// @route   PUT /api/billing/payment-method
// @access  Private
exports.updatePaymentMethod = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for payment method update request');
    throw new APIError('Database not available', 503);
  }
  
  const { paymentMethod } = req.body;
  
  try {
    // Get or create billing information for the user
    let billing = await Billing.findOne({ userId: req.user.id });
    
    // If no billing document exists, create one
    if (!billing) {
      billing = await Billing.create({ userId: req.user.id });
    }
    
    // Update payment method
    billing.paymentMethod = {
      ...billing.paymentMethod,
      ...paymentMethod
    };
    
    await billing.save();
    
    res.status(200).json({
      success: true,
      data: billing
    });
  } catch (error) {
    logger.error('Error updating payment method', { error: error.message });
    throw new APIError('Failed to update payment method', 500);
  }
});

// @desc    Get user's invoice history
// @route   GET /api/billing/invoices
// @access  Private
exports.getInvoiceHistory = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for invoice history request');
    throw new APIError('Database not available', 503);
  }
  
  try {
    // Get billing information for the user
    const billing = await Billing.findOne({ userId: req.user.id });
    
    if (!billing) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    res.status(200).json({
      success: true,
      count: billing.invoices.length,
      data: billing.invoices
    });
  } catch (error) {
    logger.error('Error fetching invoice history', { error: error.message });
    throw new APIError('Failed to fetch invoice history', 500);
  }
});

// @desc    Add an invoice
// @route   POST /api/billing/invoices
// @access  Private
exports.addInvoice = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for add invoice request');
    throw new APIError('Database not available', 503);
  }
  
  const { amount, description } = req.body;
  
  try {
    // Get or create billing information for the user
    let billing = await Billing.findOne({ userId: req.user.id });
    
    // If no billing document exists, create one
    if (!billing) {
      billing = await Billing.create({ userId: req.user.id });
    }
    
    // Create new invoice
    const newInvoice = {
      id: `inv_${Date.now()}`,
      date: new Date(),
      amount: {
        value: amount,
        currency: 'USD'
      },
      status: 'pending',
      description
    };
    
    // Add invoice to billing document
    billing.invoices.unshift(newInvoice);
    
    await billing.save();
    
    res.status(201).json({
      success: true,
      data: newInvoice
    });
  } catch (error) {
    logger.error('Error adding invoice', { error: error.message });
    throw new APIError('Failed to add invoice', 500);
  }
});