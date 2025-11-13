const Post = require('../models/Post');
const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const PostingService = require('../utils/integrations/postingService');

const logger = new Logger('post-controller');

// @desc    Get all posts with pagination and filtering
// @route   GET /api/posts
// @access  Private
exports.getPosts = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getPosts request');
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
      { title: { $regex: req.query.search, $options: 'i' } },
      { content: { $regex: req.query.search, $options: 'i' } }
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
  const total = await Post.countDocuments(filter);
  
  // Get posts with pagination and filtering
  const posts = await Post.find(filter)
    .populate('createdBy', 'name email')
    .populate('attachments')
    .populate('campaign')
    .populate('goal')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);

  logger.info('Posts retrieved successfully', { count: posts.length, page, total });
  
  res.status(200).json({
    success: true,
    count: posts.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: posts
  });
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
exports.getPost = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getPost request');
    throw new APIError('Database not available', 503);
  }
  
  const post = await Post.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('attachments')
    .populate('campaign')
    .populate('goal');

  if (!post) {
    logger.warn('Post not found', { postId: req.params.id });
    throw new APIError(`Post not found with id of ${req.params.id}`, 404);
  }

  logger.info('Post retrieved successfully', { postId: post._id });
  
  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
exports.createPost = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for createPost request');
    throw new APIError('Database not available', 503);
  }
  
  // Add createdBy field from authenticated user
  req.body.createdBy = req.user.id;
  
  const post = await Post.create(req.body);

  // Populate the response with related data
  const populatedPost = await Post.findById(post._id)
    .populate('createdBy', 'name email')
    .populate('attachments')
    .populate('campaign')
    .populate('goal');

  logger.info('Post created successfully', { postId: post._id });
  
  res.status(201).json({
    success: true,
    data: populatedPost
  });
});

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for updatePost request');
    throw new APIError('Database not available', 503);
  }
  
  let post = await Post.findById(req.params.id);

  if (!post) {
    logger.warn('Post not found for update', { postId: req.params.id });
    throw new APIError(`Post not found with id of ${req.params.id}`, 404);
  }

  // Check if user is the owner or is an admin
  if (post.createdBy.toString() !== req.user.id && req.user.role !== 'ADMIN') {
    logger.warn('Unauthorized post update attempt', { 
      userId: req.user.id, 
      postId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to update this post', 401);
  }

  // Preserve existing attachments if not provided in the update
  if (!req.body.attachments && post.attachments) {
    req.body.attachments = post.attachments;
  }

  post = await Post.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
    .populate('createdBy', 'name email')
    .populate('attachments')
    .populate('campaign')
    .populate('goal');

  logger.info('Post updated successfully', { postId: post._id });
  
  res.status(200).json({
    success: true,
    data: post
  });
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for deletePost request');
    throw new APIError('Database not available', 503);
  }
  
  const post = await Post.findById(req.params.id);

  if (!post) {
    logger.warn('Post not found for deletion', { postId: req.params.id });
    throw new APIError(`Post not found with id of ${req.params.id}`, 404);
  }

  // Check if user is the owner or is an admin
  // Convert both IDs to strings for comparison
  const postOwnerId = post.createdBy.toString();
  const userId = req.user.id.toString();
  
  if (postOwnerId !== userId && req.user.role !== 'ADMIN') {
    logger.warn('Unauthorized post deletion attempt', { 
      userId: req.user.id, 
      postId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to delete this post', 401);
  }

  // Use deleteOne() instead of remove() for newer Mongoose versions
  await post.deleteOne();

  logger.info('Post deleted successfully', { postId: post._id });
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Publish post to social media
// @route   POST /api/posts/:id/publish
// @access  Private
exports.publishPost = asyncHandler(async (req, res, next) => {
  // Check if database is connected
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for publishPost request');
    throw new APIError('Database not available', 503);
  }
  
  const post = await Post.findById(req.params.id);

  if (!post) {
    logger.warn('Post not found for publishing', { postId: req.params.id });
    throw new APIError(`Post not found with id of ${req.params.id}`, 404);
  }

  // Check if user is the owner or is an admin
  if (post.createdBy.toString() !== req.user.id && req.user.role !== 'ADMIN') {
    logger.warn('Unauthorized post publish attempt', { 
      userId: req.user.id, 
      postId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to publish this post', 401);
  }

  try {
    // Prepare post data for the specific platform
    const postData = {
      platform: post.platform,
      message: post.caption,
      title: post.title,
      description: post.caption,
      tags: post.hashtags
    };

    // Add platform-specific data
    switch (post.platform) {
      case 'FACEBOOK':
        postData.pageId = req.body.pageId;
        postData.link = req.body.link;
        break;
      case 'INSTAGRAM':
        postData.accountId = req.body.accountId;
        postData.imageUrl = req.body.imageUrl;
        postData.caption = post.caption;
        break;
      case 'TIKTOK':
        postData.videoFile = req.body.videoFile;
        postData.title = post.title;
        postData.description = post.caption;
        break;
      case 'YOUTUBE':
        postData.videoFile = req.body.videoFile;
        postData.title = post.title;
        postData.description = post.caption;
        postData.tags = post.hashtags;
        postData.categoryId = req.body.categoryId || '22';
        postData.privacyStatus = req.body.privacyStatus || 'private';
        break;
    }

    // Publish the post
    const response = await PostingService.postToPlatform(req.user.id, postData);

    // Update post status to POSTED
    post.status = 'POSTED';
    post.publishedAt = new Date();
    // Store the external post ID if available
    if (response.externalId) {
      post.externalId = response.externalId;
    }
    await post.save();

    logger.info('Post published successfully', { postId: post._id, platform: post.platform });
    
    res.status(200).json({
      success: true,
      data: {
        post,
        response
      }
    });
  } catch (error) {
    logger.error('Error publishing post', { 
      postId: post._id, 
      platform: post.platform,
      error: error.message 
    });
    throw new APIError(`Failed to publish post: ${error.message}`, 500);
  }
});