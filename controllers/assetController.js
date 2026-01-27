const Asset = require('../models/Asset');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const googleDriveService = require('../utils/integrations/googleDriveService');
const { saveToLocal } = require('../middleware/upload');

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
  
  // Check if user has Google Drive connected
  const isGoogleDriveConnected = await googleDriveService.isGoogleDriveConnected(req.user.id);
  
  let assetData;
  
  if (isGoogleDriveConnected) {
    // Upload to Google Drive
    logger.info('Uploading to Google Drive', { userId: req.user.id, fileName: req.file.originalname });
    
    try {
      // Refresh token if needed
      await googleDriveService.refreshTokenIfNeeded(req.user.id);
      
      const driveResult = await googleDriveService.uploadFile(
        req.user.id,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      
      if (driveResult) {
        assetData = {
          name: req.file.originalname,
          url: driveResult.webContentLink || driveResult.webViewLink,
          mimeType: req.file.mimetype,
          size: req.file.size,
          kind: kind,
          storageType: 'GOOGLE_DRIVE',
          driveFileId: driveResult.fileId,
          thumbnailUrl: driveResult.thumbnailLink,
          webViewLink: driveResult.webViewLink,
          webContentLink: driveResult.webContentLink,
          uploadedBy: req.user.id
        };
        
        // Delete local file if it was saved
        if (req.file.path) {
          try {
            await fs.unlink(req.file.path);
          } catch (e) {
            // Ignore error if file doesn't exist
          }
        }
        
        logger.info('File uploaded to Google Drive successfully', { 
          driveFileId: driveResult.fileId,
          fileName: req.file.originalname 
        });
      } else {
        // Fall back to local storage
        logger.warn('Google Drive upload failed, falling back to local storage');
        assetData = await createLocalAssetData(req.file, kind, req.user.id);
      }
    } catch (error) {
      logger.error('Error uploading to Google Drive, falling back to local', { error: error.message });
      assetData = await createLocalAssetData(req.file, kind, req.user.id);
    }
  } else {
    // Save locally
    logger.info('Saving file locally (no Google Drive connection)', { userId: req.user.id });
    assetData = await createLocalAssetData(req.file, kind, req.user.id);
  }
  
  const asset = await Asset.create(assetData);

  logger.info('Asset created successfully', { 
    assetId: asset._id, 
    storageType: asset.storageType,
    driveFileId: asset.driveFileId 
  });
  
  res.status(201).json({
    success: true,
    data: asset
  });
});

// Helper function to create local asset data
async function createLocalAssetData(file, kind, userId) {
  // Save the buffer to local file
  const filename = await saveToLocal(file.buffer, file.originalname);
  
  return {
    name: file.originalname,
    url: `/uploads/${filename}`,
    mimeType: file.mimetype,
    size: file.size,
    kind: kind,
    storageType: 'LOCAL',
    uploadedBy: userId
  };
}

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

  // If stored in Google Drive, delete from there too
  if (asset.storageType === 'GOOGLE_DRIVE' && asset.driveFileId) {
    try {
      logger.info('Deleting file from Google Drive', { driveFileId: asset.driveFileId });
      await googleDriveService.deleteFile(req.user.id, asset.driveFileId);
    } catch (error) {
      logger.error('Error deleting from Google Drive', { error: error.message });
      // Continue with asset deletion even if Google Drive deletion fails
    }
  } else if (asset.storageType === 'LOCAL' && asset.url) {
    // Delete local file
    try {
      const filePath = path.join(__dirname, '..', asset.url);
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore error if file doesn't exist
      logger.warn('Could not delete local file', { error: error.message });
    }
  }

  // Use deleteOne() instead of remove() for newer Mongoose versions
  await asset.deleteOne();

  logger.info('Asset deleted successfully', { assetId: asset._id, storageType: asset.storageType });
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Download asset (proxy for Google Drive to avoid CORS)
// @route   GET /api/assets/:id/download
// @access  Private
exports.downloadAsset = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for downloadAsset request');
    throw new APIError('Database not available', 503);
  }
  
  const asset = await Asset.findById(req.params.id);

  if (!asset) {
    logger.warn('Asset not found for download', { assetId: req.params.id });
    throw new APIError(`Asset not found with id of ${req.params.id}`, 404);
  }

  try {
    let fileUrl;
    
    if (asset.storageType === 'GOOGLE_DRIVE' && asset.driveFileId) {
      // For Google Drive, use the direct download URL
      fileUrl = `https://drive.google.com/uc?id=${asset.driveFileId}&export=download`;
      
      // Use axios to fetch the file content
      const axios = require('axios');
      
      try {
        const response = await axios.get(fileUrl, { 
          responseType: 'stream',
          timeout: 30000 // 30 second timeout
        });
        
        // Set response headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${asset.name}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || asset.mimeType || 'application/octet-stream');
        
        // Pipe the response
        response.data.pipe(res);
      } catch (error) {
        logger.error('Error downloading from Google Drive', { error: error.message, driveFileId: asset.driveFileId });
        throw new APIError('Failed to download file from Google Drive', 500);
      }
    } else if (asset.storageType === 'LOCAL' && asset.url) {
      // For local files, serve directly
      const filePath = path.join(__dirname, '..', asset.url);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (e) {
        throw new APIError('File not found on server', 404);
      }
      
      // Set response headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${asset.name}"`);
      res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
      
      // Stream the file
      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);
    } else {
      throw new APIError('Asset has no valid download source', 400);
    }
  } catch (error) {
    if (error instanceof APIError) throw error;
    logger.error('Error downloading asset', { error: error.message, assetId: req.params.id });
    throw new APIError('Failed to download asset', 500);
  }
});