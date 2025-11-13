const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const Post = require('../models/Post');
const Campaign = require('../models/Campaign');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const User = require('../models/User');

const logger = new Logger('search-controller');

// @desc    Search across all entities
// @route   GET /api/search
// @access  Private
exports.searchAll = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for search request');
    throw new APIError('Database not available', 503);
  }
  
  const { query, type, limit = 10 } = req.query;
  
  // Validate search query
  if (!query) {
    throw new APIError('Search query is required', 400);
  }
  
  try {
    // Build search filter
    const searchFilter = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Initialize results object
    const results = {
      posts: [],
      campaigns: [],
      tasks: [],
      goals: [],
      users: []
    };
    
    // Search based on type or search all
    if (!type || type === 'posts') {
      results.posts = await Post.find(searchFilter)
        .populate('createdBy', 'name email')
        .limit(parseInt(limit));
    }
    
    if (!type || type === 'campaigns') {
      results.campaigns = await Campaign.find(searchFilter)
        .limit(parseInt(limit));
    }
    
    if (!type || type === 'tasks') {
      // Exclude trashed tasks from search results
      const taskFilter = {
        ...searchFilter,
        status: { $ne: 'TRASH' }
      };
      results.tasks = await Task.find(taskFilter)
        .populate('assignees', 'name email')
        .limit(parseInt(limit));
    }
    
    if (!type || type === 'goals') {
      results.goals = await Goal.find(searchFilter)
        .limit(parseInt(limit));
    }
    
    if (!type || type === 'users') {
      results.users = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      })
        .limit(parseInt(limit));
    }
    
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error performing search', { error: error.message });
    throw new APIError('Failed to perform search', 500);
  }
});

// @desc    Search posts
// @route   GET /api/search/posts
// @access  Private
exports.searchPosts = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for posts search request');
    throw new APIError('Database not available', 503);
  }
  
  const { query, status, platform, limit = 10, page = 1 } = req.query;
  
  // Validate search query
  if (!query) {
    throw new APIError('Search query is required', 400);
  }
  
  try {
    // Build search filter
    const filter = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { caption: { $regex: query, $options: 'i' } },
        { notes: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Add status filter if provided
    if (status) {
      filter.status = status;
    }
    
    // Add platform filter if provided
    if (platform) {
      filter.platform = platform;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute search with pagination
    const posts = await Post.find(filter)
      .populate('createdBy', 'name email')
      .populate('campaign')
      .populate('goal')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Post.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: posts
    });
  } catch (error) {
    logger.error('Error searching posts', { error: error.message });
    throw new APIError('Failed to search posts', 500);
  }
});

// @desc    Search campaigns
// @route   GET /api/search/campaigns
// @access  Private
exports.searchCampaigns = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for campaigns search request');
    throw new APIError('Database not available', 503);
  }
  
  const { query, status, limit = 10, page = 1 } = req.query;
  
  // Validate search query
  if (!query) {
    throw new APIError('Search query is required', 400);
  }
  
  try {
    // Build search filter
    const filter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Add status filter if provided
    if (status) {
      filter.status = status;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute search with pagination
    const campaigns = await Campaign.find(filter)
      .populate('goals')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Campaign.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: campaigns.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: campaigns
    });
  } catch (error) {
    logger.error('Error searching campaigns', { error: error.message });
    throw new APIError('Failed to search campaigns', 500);
  }
});

// @desc    Search tasks
// @route   GET /api/search/tasks
// @access  Private
exports.searchTasks = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for tasks search request');
    throw new APIError('Database not available', 503);
  }
  
  const { query, status, priority, limit = 10, page = 1 } = req.query;
  
  // Validate search query
  if (!query) {
    throw new APIError('Search query is required', 400);
  }
  
  try {
    // Build search filter
    const filter = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Exclude trashed tasks from search results by default
    filter.status = { $ne: 'TRASH' };
    
    // Add status filter if provided (but don't override the TRASH exclusion)
    if (status && status !== 'TRASH') {
      filter.status = status;
    } else if (status === 'TRASH') {
      // If specifically searching for trashed tasks, only show trashed tasks
      filter.status = 'TRASH';
    }
    
    // Add priority filter if provided
    if (priority) {
      filter.priority = priority;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute search with pagination
    const tasks = await Task.find(filter)
      .populate('assignees', 'name email')
      .populate('relatedPost', 'title')
      .populate('relatedCampaign', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Task.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: tasks
    });
  } catch (error) {
    logger.error('Error searching tasks', { error: error.message });
    throw new APIError('Failed to search tasks', 500);
  }
});