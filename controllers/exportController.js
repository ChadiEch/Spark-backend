const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const Post = require('../models/Post');
const Campaign = require('../models/Campaign');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const User = require('../models/User');

const logger = new Logger('export-controller');

// @desc    Export data in specified format
// @route   GET /api/export/:entity/:format
// @access  Private
exports.exportData = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for export request');
    throw new APIError('Database not available', 503);
  }
  
  const { entity, format } = req.params;
  const { startDate, endDate } = req.query;
  
  try {
    // Build date filter if provided
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }
    
    let data;
    let filename;
    
    // Export based on entity type
    switch (entity.toLowerCase()) {
      case 'posts':
        data = await Post.find(dateFilter)
          .populate('createdBy', 'name email')
          .populate('campaign', 'name')
          .populate('goal', 'title');
        filename = 'posts';
        break;
        
      case 'campaigns':
        data = await Campaign.find(dateFilter)
          .populate('goals');
        filename = 'campaigns';
        break;
        
      case 'tasks':
        // Exclude trashed tasks by default
        const taskFilter = {
          ...dateFilter,
          status: { $ne: 'TRASH' }
        };
        data = await Task.find(taskFilter)
          .populate('assignees', 'name email')
          .populate('relatedPost', 'title')
          .populate('relatedCampaign', 'name');
        filename = 'tasks';
        break;
        
      case 'goals':
        data = await Goal.find(dateFilter);
        filename = 'goals';
        break;
        
      case 'users':
        data = await User.find(dateFilter, '-password'); // Exclude password field
        filename = 'users';
        break;
        
      default:
        throw new APIError('Invalid entity type', 400);
    }
    
    // Format data based on requested format
    let exportData;
    let contentType;
    
    switch (format.toLowerCase()) {
      case 'csv':
        // Convert to CSV format
        exportData = convertToCSV(data);
        contentType = 'text/csv';
        filename += `-${new Date().toISOString().split('T')[0]}.csv`;
        break;
        
      case 'json':
      default:
        // Convert to JSON format
        exportData = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        filename += `-${new Date().toISOString().split('T')[0]}.json`;
        break;
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.status(200).send(exportData);
  } catch (error) {
    logger.error('Error exporting data', { error: error.message });
    throw new APIError('Failed to export data', 500);
  }
});

// Helper function to convert data to CSV format
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
  
  // Create CSV rows
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  // Add data rows
  data.forEach(item => {
    const values = headers.map(header => {
      let value = item[header];
      
      // Handle nested objects
      if (typeof value === 'object' && value !== null) {
        if (value.name) {
          value = value.name;
        } else if (value.title) {
          value = value.title;
        } else if (Array.isArray(value)) {
          value = value.map(v => v.name || v.title || v).join(';');
        } else {
          value = JSON.stringify(value);
        }
      }
      
      // Escape commas and quotes
      if (typeof value === 'string') {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
}

// @desc    Export analytics report
// @route   GET /api/export/analytics/:format
// @access  Private
exports.exportAnalytics = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for analytics export request');
    throw new APIError('Database not available', 503);
  }
  
  const { format } = req.params;
  
  try {
    // Get analytics data
    const posts = await Post.find()
      .populate('createdBy', 'name email')
      .populate('campaign', 'name')
      .populate('goal', 'title');
    
    const campaigns = await Campaign.find()
      .populate('goals');
    
    // Exclude trashed tasks from analytics
    const tasks = await Task.find({ status: { $ne: 'TRASH' } })
      .populate('assignees', 'name email');
    
    const analyticsData = {
      posts: posts.map(post => ({
        title: post.title,
        platform: post.platform,
        status: post.status,
        createdBy: post.createdBy?.name,
        campaign: post.campaign?.name,
        goal: post.goal?.title,
        createdAt: post.createdAt,
        metrics: post.metrics
      })),
      campaigns: campaigns.map(campaign => ({
        name: campaign.name,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        budget: campaign.budgetCents,
        goalsCount: campaign.goals?.length || 0,
        createdAt: campaign.createdAt
      })),
      tasks: tasks.map(task => ({
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignees: task.assignees?.map(a => a.name).join(', '),
        dueDate: task.due,
        createdAt: task.createdAt
      }))
    };
    
    let exportData;
    let contentType;
    let filename = `analytics-report-${new Date().toISOString().split('T')[0]}`;
    
    switch (format.toLowerCase()) {
      case 'csv':
        // For CSV, we'll create multiple CSV sections
        exportData = `# Analytics Report\n\n`;
        exportData += `## Posts\n${convertToCSV(analyticsData.posts)}\n\n`;
        exportData += `## Campaigns\n${convertToCSV(analyticsData.campaigns)}\n\n`;
        exportData += `## Tasks\n${convertToCSV(analyticsData.tasks)}\n`;
        contentType = 'text/csv';
        filename += '.csv';
        break;
        
      case 'json':
      default:
        exportData = JSON.stringify(analyticsData, null, 2);
        contentType = 'application/json';
        filename += '.json';
        break;
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.status(200).send(exportData);
  } catch (error) {
    logger.error('Error exporting analytics data', { error: error.message });
    throw new APIError('Failed to export analytics data', 500);
  }
});