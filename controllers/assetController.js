const Asset = require('../models/Asset');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');

const logger = new Logger('asset-controller');

// @desc    Get all assets with pagination and filtering
// @route   GET /api/assets
// @access  Private
exports.getAssets = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getAssets request');
    throw new APIError('Database not available', 503);
  }
  
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter object
  const filter = {};
  
  // Kind filter
  if (req.query.kind) {
    filter.kind = req.query.kind;
  }
  
  // Uploader filter
  if (req.query.uploader) {
    filter.uploadedBy = req.query.uploader;
  }
  
  // Search filter
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) {
      filter.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.createdAt.$lte = new Date(req.query.endDate);
    }
  }
  
  // Get total count for pagination
  const total = await Asset.countDocuments(filter);
  
  // Get assets with pagination and filtering
  const assets = await Asset.find(filter)
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  logger.info('Assets retrieved successfully', { count: assets.length, page, total });
  
  res.status(200).json({
    success: true,
    count: assets.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: assets
  });
});

// @desc    Get single asset
// @route   GET /api/assets/:id
// @access  Private
exports.getAsset = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getAsset request');
    throw new APIError('Database not available', 503);
  }
  
  const asset = await Asset.findById(req.params.id).populate('uploadedBy', 'name email');

  if (!asset) {
    logger.warn('Asset not found', { assetId: req.params.id });
    throw new APIError(`Asset not found with id of ${req.params.id}`, 404);
  }

  logger.info('Asset retrieved successfully', { assetId: asset._id });
  
  res.status(200).json({
    success: true,
    data: asset
  });
});

// @desc    Create new asset
// @route   POST /api/assets
// @access  Private
exports.createAsset = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for createAsset request');
    throw new APIError('Database not available', 503);
  }
  
  // Handle file upload
  if (!req.file) {
    throw new APIError('No file uploaded', 400);
  }
  
  // Determine asset kind based on MIME type
  let kind = 'DOC'; // Default
  if (req.file.mimetype.startsWith('image/')) {
    kind = 'IMAGE';
  } else if (req.file.mimetype.startsWith('video/')) {
    kind = 'VIDEO';
  }
  
  // Create asset object
  const assetData = {
    name: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    mimeType: req.file.mimetype,
    size: req.file.size,
    kind: kind,
    uploadedBy: req.user.id
  };
  
  const asset = await Asset.create(assetData);

  logger.info('Asset created successfully', { assetId: asset._id });
  
  res.status(201).json({
    success: true,
    data: asset
  });
});

// @desc    Update asset
// @route   PUT /api/assets/:id
// @access  Private
exports.updateAsset = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for updateAsset request');
    throw new APIError('Database not available', 503);
  }
  
  let asset = await Asset.findById(req.params.id);

  if (!asset) {
    logger.warn('Asset not found for update', { assetId: req.params.id });
    throw new APIError(`Asset not found with id of ${req.params.id}`, 404);
  }

  // Check if user is the owner or is an admin
  if (asset.uploadedBy.toString() !== req.user.id && req.user.role !== 'ADMIN') {
    logger.warn('Unauthorized asset update attempt', { 
      userId: req.user.id, 
      assetId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to update this asset', 401);
  }

  asset = await Asset.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  logger.info('Asset updated successfully', { assetId: asset._id });
  
  res.status(200).json({
    success: true,
    data: asset
  });
});

// @desc    Delete asset
// @route   DELETE /api/assets/:id
// @access  Private
exports.deleteAsset = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for deleteAsset request');
    throw new APIError('Database not available', 503);
  }
  
  const asset = await Asset.findById(req.params.id);

  if (!asset) {
    logger.warn('Asset not found for deletion', { assetId: req.params.id });
    throw new APIError(`Asset not found with id of ${req.params.id}`, 404);
  }

  // Check if user is the owner or is an admin
  // Convert both IDs to strings for comparison
  const assetOwnerId = asset.uploadedBy.toString();
  const userId = req.user.id.toString();
  
  if (assetOwnerId !== userId && req.user.role !== 'ADMIN') {
    logger.warn('Unauthorized asset deletion attempt', { 
      userId: req.user.id, 
      assetId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to delete this asset', 401);
  }

  // Use deleteOne() instead of remove() for newer Mongoose versions
  await asset.deleteOne();

  logger.info('Asset deleted successfully', { assetId: asset._id });
  
  res.status(200).json({
    success: true,
    data: {}
  });
});