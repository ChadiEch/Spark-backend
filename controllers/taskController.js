const Task = require('../models/Task');
const mongoose = require('mongoose');
const { asyncHandler, APIError } = require('../middleware/errorHandler');
const Logger = require('../utils/logger');
const { createTaskAssignedNotification, createTaskCompletedNotification } = require('../utils/notificationUtils');

const logger = new Logger('task-controller');

// @desc    Get all tasks with pagination and filtering
// @route   GET /api/tasks
// @access  Private
// @complexity High - Involves complex querying, filtering, pagination, and population
// @security Requires authentication, implements authorization checks
exports.getTasks = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  // This prevents errors when database is unavailable
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getTasks request');
    throw new APIError('Database not available', 503);
  }
  
  // Extract pagination parameters from query with defaults
  // Page 1 if not specified, 10 items per page if not specified
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build dynamic filter object based on query parameters
  // This allows flexible filtering of tasks
  const filter = {};
  
  // Filter by task status if provided (OPEN, IN_PROGRESS, BLOCKED, DONE, TRASH)
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Filter by task priority if provided (LOW, MEDIUM, HIGH, URGENT)
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }
  
  // Filter by assignee ID if provided
  if (req.query.assignee) {
    filter.assignees = req.query.assignee;
  }
  
  // Search in title and description using regex for partial matches
  // Case-insensitive search for better user experience
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Filter by date range if provided
  // Allows filtering tasks by due date range
  if (req.query.startDate || req.query.endDate) {
    filter.due = {};
    if (req.query.startDate) {
      filter.due.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.due.$lte = new Date(req.query.endDate);
    }
  }
  
  // Get total count of tasks matching filters for pagination calculations
  // This is needed to calculate total pages
  const total = await Task.countDocuments(filter);
  
  // Execute query with filtering, pagination, and population
  // Populate related documents to avoid additional queries
  const tasks = await Task.find(filter)
    .populate('assignees', 'name email') // Only populate name and email fields
    .populate('relatedPost', 'title')    // Only populate title field
    .populate('relatedCampaign', 'name') // Only populate name field
    .sort({ createdAt: -1 })             // Sort by creation date (newest first)
    .skip(startIndex)                    // Skip to start index for pagination
    .limit(limit);                       // Limit results for pagination

  logger.info('Tasks retrieved successfully', { count: tasks.length, page, total });
  
  // Return paginated response with metadata
  res.status(200).json({
    success: true,
    count: tasks.length,
    total,
    page,
    pages: Math.ceil(total / limit), // Calculate total pages
    data: tasks
  });
});

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
// @complexity Medium - Database lookup with population
// @security Requires authentication
exports.getTask = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getTask request');
    throw new APIError('Database not available', 503);
  }
  
  // Find task by ID and populate related documents
  // Population reduces the need for additional API calls
  const task = await Task.findById(req.params.id)
    .populate('assignees', 'name email')
    .populate('relatedPost', 'title')
    .populate('relatedCampaign', 'name');

  // Handle case where task is not found
  if (!task) {
    logger.warn('Task not found', { taskId: req.params.id });
    throw new APIError(`Task not found with id of ${req.params.id}`, 404);
  }

  logger.info('Task retrieved successfully', { taskId: task._id });
  
  // Return task data
  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
// @complexity Low - Simple document creation
// @security Requires authentication
exports.createTask = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for createTask request');
    throw new APIError('Database not available', 503);
  }
  
  // Add createdBy field from authenticated user
  req.body.createdBy = req.user.id;
  
  // Create task directly from request body
  // Mongoose validation will handle data integrity
  const task = await Task.create(req.body);

  // Send notifications to assignees
  if (task.assignees && task.assignees.length > 0) {
    try {
      await createTaskAssignedNotification(task, task.assignees, req.user);
    } catch (error) {
      logger.error('Failed to send task assigned notifications', { 
        error: error.message, 
        taskId: task._id 
      });
    }
  }

  logger.info('Task created successfully', { taskId: task._id });
  
  // Return created task
  res.status(201).json({
    success: true,
    data: task
  });
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
// @complexity Medium - Database update with authorization check
// @security Requires authentication and authorization
exports.updateTask = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for updateTask request');
    throw new APIError('Database not available', 503);
  }
  
  // Find task by ID to check existence and for authorization
  let task = await Task.findById(req.params.id);

  // Handle case where task is not found
  if (!task) {
    logger.warn('Task not found for update', { taskId: req.params.id });
    throw new APIError(`Task not found with id of ${req.params.id}`, 404);
  }

  // Authorization check: Only assigned users or admins can update tasks
  // This prevents unauthorized modifications
  const isAssigned = task.assignees && task.assignees.some(assignee => assignee.toString() === req.user.id);
  const isAdmin = req.user.role === 'ADMIN';
  
  if (!isAssigned && !isAdmin) {
    logger.warn('Unauthorized task update attempt', { 
      userId: req.user.id, 
      taskId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to update this task', 401);
  }

  // Check if task status is being updated to DONE
  const isTaskCompleted = req.body.status === 'DONE' && task.status !== 'DONE';

  // Store previous assignees for notification purposes
  const previousAssignees = task.assignees ? [...task.assignees] : [];

  // Update task with new data, returning the updated document
  // runValidators ensures data integrity during update
  task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  // Send notification when task is completed
  if (isTaskCompleted && previousAssignees.length > 0) {
    try {
      // Notify the user who assigned the task (if different from who completed it)
      const assignedTo = previousAssignees.find(assignee => 
        assignee.toString() !== req.user.id
      );
      
      if (assignedTo) {
        await createTaskCompletedNotification(task, req.user, assignedTo);
      }
    } catch (error) {
      logger.error('Failed to send task completed notification', { 
        error: error.message, 
        taskId: task._id 
      });
    }
  }

  logger.info('Task updated successfully', { taskId: task._id });
  
  // Return updated task
  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Move task to trash
// @route   PUT /api/tasks/:id/trash
// @access  Private
// @complexity Medium - Database update with authorization check
// @security Requires authentication and authorization
exports.trashTask = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for trashTask request');
    throw new APIError('Database not available', 503);
  }
  
  // Find task by ID to check existence and for authorization
  let task = await Task.findById(req.params.id);

  // Handle case where task is not found
  if (!task) {
    logger.warn('Task not found for trash', { taskId: req.params.id });
    throw new APIError(`Task not found with id of ${req.params.id}`, 404);
  }

  // Authorization check: Only assigned users or admins can trash tasks
  // This prevents unauthorized modifications
  const isAssigned = task.assignees && task.assignees.some(assignee => assignee.toString() === req.user.id);
  const isAdmin = req.user.role === 'ADMIN';
  
  if (!isAssigned && !isAdmin) {
    logger.warn('Unauthorized task trash attempt', { 
      userId: req.user.id, 
      taskId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to trash this task', 401);
  }

  // Update task status to TRASH and set trashed metadata
  task = await Task.findByIdAndUpdate(req.params.id, {
    status: 'TRASH',
    trashed: true,
    trashedBy: req.user.id,
    trashedAt: new Date(),
    restoreStatus: task.status // Store the previous status for restoration
  }, {
    new: true,
    runValidators: true
  });

  logger.info('Task moved to trash successfully', { taskId: task._id, trashedBy: req.user.id });
  
  // Return updated task
  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Restore task from trash
// @route   PUT /api/tasks/:id/restore
// @access  Private
// @complexity Medium - Database update with authorization check
// @security Requires authentication and authorization
exports.restoreTask = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for restoreTask request');
    throw new APIError('Database not available', 503);
  }
  
  // Find task by ID to check existence and for authorization
  let task = await Task.findById(req.params.id);

  // Handle case where task is not found
  if (!task) {
    logger.warn('Task not found for restore', { taskId: req.params.id });
    throw new APIError(`Task not found with id of ${req.params.id}`, 404);
  }

  // Authorization check: Only users who trashed the task or admins can restore tasks
  // This ensures data privacy and ownership
  const isTrashedByUser = task.trashedBy && task.trashedBy.toString() === req.user.id;
  const isAdmin = req.user.role === 'ADMIN';
  
  if (!isTrashedByUser && !isAdmin) {
    logger.warn('Unauthorized task restore attempt', { 
      userId: req.user.id, 
      taskId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to restore this task', 401);
  }

  // Restore task to its previous status
  task = await Task.findByIdAndUpdate(req.params.id, {
    status: task.restoreStatus || 'OPEN',
    trashed: false,
    trashedBy: null,
    trashedAt: null,
    restoreStatus: null
  }, {
    new: true,
    runValidators: true
  });

  logger.info('Task restored from trash successfully', { taskId: task._id, restoredBy: req.user.id });
  
  // Return updated task
  res.status(200).json({
    success: true,
    data: task
  });
});

// @desc    Get trashed tasks for user
// @route   GET /api/tasks/trash
// @access  Private
// @complexity Medium - Database query with filtering
// @security Requires authentication
exports.getTrashedTasks = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for getTrashedTasks request');
    throw new APIError('Database not available', 503);
  }
  
  // Extract pagination parameters from query with defaults
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter for trashed tasks belonging to the user
  const filter = {
    trashed: true,
    trashedBy: req.user.id
  };
  
  // Get total count of trashed tasks for pagination calculations
  const total = await Task.countDocuments(filter);
  
  // Execute query with filtering, pagination, and population
  const tasks = await Task.find(filter)
    .populate('assignees', 'name email')
    .populate('relatedPost', 'title')
    .populate('relatedCampaign', 'name')
    .sort({ trashedAt: -1 })
    .skip(startIndex)
    .limit(limit);

  logger.info('Trashed tasks retrieved successfully', { count: tasks.length, userId: req.user.id });
  
  // Return paginated response with metadata
  res.status(200).json({
    success: true,
    count: tasks.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: tasks
  });
});

// @desc    Delete task permanently
// @route   DELETE /api/tasks/:id
// @access  Private
// @complexity Medium - Database deletion with authorization check
// @security Requires authentication and authorization
exports.deleteTask = asyncHandler(async (req, res, next) => {
  // Check if database is connected before proceeding
  if (!mongoose.connection.readyState) {
    logger.warn('Database not available for deleteTask request');
    throw new APIError('Database not available', 503);
  }
  
  // Find task by ID to check existence and for authorization
  const task = await Task.findById(req.params.id);

  // Handle case where task is not found
  if (!task) {
    logger.warn('Task not found for deletion', { taskId: req.params.id });
    throw new APIError(`Task not found with id of ${req.params.id}`, 404);
  }

  // Authorization check: Only assigned users or admins can delete tasks
  // This prevents unauthorized deletions
  const isAssigned = task.assignees && task.assignees.some(assignee => assignee.toString() === req.user.id);
  const isAdmin = req.user.role === 'ADMIN';
  
  if (!isAssigned && !isAdmin) {
    logger.warn('Unauthorized task deletion attempt', { 
      userId: req.user.id, 
      taskId: req.params.id,
      userRole: req.user.role
    });
    throw new APIError('Not authorized to delete this task', 401);
  }

  // Remove task from database using deleteOne() instead of remove()
  await Task.deleteOne({ _id: task._id });

  logger.info('Task deleted successfully', { taskId: task._id });
  
  // Return success response with empty data
  res.status(200).json({
    success: true,
    data: {}
  });
});