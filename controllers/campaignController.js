const Campaign = require('../models/Campaign');
const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const { createCampaignStartedNotification, createCampaignEndedNotification } = require('../utils/notificationUtils');

const logger = new Logger('campaign-controller');

// @desc    Get all campaigns with pagination and filtering
// @route   GET /api/campaigns
// @access  Private
exports.getCampaigns = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getCampaigns request');
    throw new APIError('Database not available', 503);
  }
  
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter object
  const filter = {};
  
  // Status filter
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Creator filter
  if (req.query.creator) {
    filter.createdBy = req.query.creator;
  }
  
  // Search filter
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    filter.start = {};
    if (req.query.startDate) {
      filter.start.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.start.$lte = new Date(req.query.endDate);
    }
  }
  
  // Get total count for pagination
  const total = await Campaign.countDocuments(filter);
  
  // Get campaigns with pagination and filtering
  const campaigns = await Campaign.find(filter)
    .populate('createdBy', 'name email')
    .populate('goals', 'title')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  logger.info('Campaigns retrieved successfully', { count: campaigns.length, page, total });
  
  res.status(200).json({
    success: true,
    count: campaigns.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: campaigns
  });
});

// @desc    Get single campaign
// @route   GET /api/campaigns/:id
// @access  Private
exports.getCampaign = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getCampaign request');
    throw new APIError('Database not available', 503);
  }
  
  const campaign = await Campaign.findById(req.params.id).populate('createdBy', 'name email').populate('goals', 'title');

  if (!campaign) {
    logger.warn('Campaign not found', { campaignId: req.params.id });
    throw new APIError(`Campaign not found with id of ${req.params.id}`, 404);
  }

  logger.info('Campaign retrieved successfully', { campaignId: campaign._id });
  
  res.status(200).json({
    success: true,
    data: campaign
  });
});

// @desc    Create new campaign
// @route   POST /api/campaigns
// @access  Private
exports.createCampaign = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for createCampaign request');
    throw new APIError('Database not available', 503);
  }
  
  // Ensure createdBy is set to the authenticated user
  req.body.createdBy = req.user.id;
  
  // Ensure goals is properly formatted
  if (req.body.goals && !Array.isArray(req.body.goals)) {
    req.body.goals = [req.body.goals];
  }
  
  // Validate dates
  if (req.body.start) {
    req.body.start = new Date(req.body.start);
  }
  
  if (req.body.end) {
    req.body.end = new Date(req.body.end);
  }
  
  // Check if end date is after start date
  if (req.body.start && req.body.end && req.body.end < req.body.start) {
    throw new APIError('End date must be after start date', 400);
  }
  
  const campaign = await Campaign.create(req.body);

  // Populate the response with user and goal details
  const populatedCampaign = await Campaign.findById(campaign._id)
    .populate('createdBy', 'name email')
    .populate('goals', 'title');

  logger.info('Campaign created successfully', { campaignId: campaign._id });
  
  res.status(201).json({
    success: true,
    data: populatedCampaign
  });
});

// @desc    Update campaign
// @route   PUT /api/campaigns/:id
// @access  Private
exports.updateCampaign = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for updateCampaign request');
    throw new APIError('Database not available', 503);
  }
  
  let campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    logger.warn('Campaign not found for update', { campaignId: req.params.id });
    throw new APIError(`Campaign not found with id of ${req.params.id}`, 404);
  }

  // Check if user is the owner or is an admin
  if (campaign.createdBy.toString() !== req.user.id && req.user.role !== 'ADMIN') {
    logger.warn('Unauthorized campaign update attempt', { 
      userId: req.user.id, 
      campaignId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to update this campaign', 401);
  }

  // Store previous status for notification purposes
  const previousStatus = campaign.status;

  // Handle createdBy field if present
  if (req.body.createdBy && typeof req.body.createdBy === 'object' && req.body.createdBy.id) {
    req.body.createdBy = req.body.createdBy.id;
  }
  
  // Ensure goals is properly formatted
  if (req.body.goals && !Array.isArray(req.body.goals)) {
    req.body.goals = [req.body.goals];
  }

  campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Check if campaign status changed to ACTIVE and send notification
  if (previousStatus !== 'ACTIVE' && campaign.status === 'ACTIVE') {
    try {
      // In a real implementation, you would get the team members for the campaign
      // For now, we'll just send a notification to the creator
      const teamMembers = [campaign.createdBy];
      await createCampaignStartedNotification(campaign, teamMembers);
    } catch (error) {
      logger.error('Failed to send campaign started notification', { error: error.message });
    }
  }

  // Check if campaign status changed to COMPLETED and send notification
  if (previousStatus !== 'COMPLETED' && campaign.status === 'COMPLETED') {
    try {
      // In a real implementation, you would get the team members for the campaign
      // For now, we'll just send a notification to the creator
      const teamMembers = [campaign.createdBy];
      await createCampaignEndedNotification(campaign, teamMembers);
    } catch (error) {
      logger.error('Failed to send campaign ended notification', { error: error.message });
    }
  }

  // Populate the response with user and goal details
  const populatedCampaign = await Campaign.findById(campaign._id)
    .populate('createdBy', 'name email')
    .populate('goals', 'title');

  logger.info('Campaign updated successfully', { campaignId: campaign._id });
  
  res.status(200).json({
    success: true,
    data: populatedCampaign
  });
});

// @desc    Delete campaign
// @route   DELETE /api/campaigns/:id
// @access  Private
exports.deleteCampaign = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for deleteCampaign request');
    throw new APIError('Database not available', 503);
  }
  
  const campaign = await Campaign.findById(req.params.id);

  if (!campaign) {
    logger.warn('Campaign not found for deletion', { campaignId: req.params.id });
    throw new APIError(`Campaign not found with id of ${req.params.id}`, 404);
  }

  // Check if user is the owner or is an admin
  // Convert both IDs to strings for comparison
  const campaignOwnerId = campaign.createdBy.toString();
  const userId = req.user.id.toString();
  
  if (campaignOwnerId !== userId && req.user.role !== 'ADMIN') {
    logger.warn('Unauthorized campaign deletion attempt', { 
      userId: req.user.id, 
      campaignId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to delete this campaign', 401);
  }

  // Use deleteOne() instead of remove() for newer Mongoose versions
  await campaign.deleteOne();

  logger.info('Campaign deleted successfully', { campaignId: campaign._id });
  
  res.status(200).json({
    success: true,
    message: 'Campaign deleted successfully',
    data: {}
  });
});