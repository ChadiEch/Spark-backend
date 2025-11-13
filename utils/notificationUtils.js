const Notification = require('../models/Notification');

/**
 * Create a notification for a user
 * @param {Object} options - Notification options
 * @param {string} options.recipient - User ID of the recipient
 * @param {string} options.sender - User ID of the sender (optional)
 * @param {string} options.type - Type of notification
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {Object} options.relatedEntity - Related entity (optional)
 * @param {string} options.relatedEntity.type - Type of related entity
 * @param {string} options.relatedEntity.id - ID of related entity
 * @param {string} options.priority - Priority level (LOW, MEDIUM, HIGH, URGENT)
 * @returns {Promise<Object>} Created notification
 */
exports.createNotification = async (options) => {
  try {
    const notification = new Notification({
      recipient: options.recipient,
      sender: options.sender,
      type: options.type,
      title: options.title,
      message: options.message,
      relatedEntity: options.relatedEntity,
      priority: options.priority || 'MEDIUM'
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create multiple notifications
 * @param {Array} notifications - Array of notification options
 * @returns {Promise<Array>} Array of created notifications
 */
exports.createNotifications = async (notifications) => {
  try {
    const createdNotifications = [];
    
    for (const notificationOptions of notifications) {
      const notification = await exports.createNotification(notificationOptions);
      createdNotifications.push(notification);
    }
    
    return createdNotifications;
  } catch (error) {
    console.error('Error creating notifications:', error);
    throw error;
  }
};

/**
 * Get unread notifications count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread notifications count
 */
exports.getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      recipient: userId,
      read: false
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for validation)
 * @returns {Promise<Object>} Updated notification
 */
exports.markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true },
      { new: true }
    );
    
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications marked as read
 */
exports.markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
    
    return result.modifiedCount;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for validation)
 * @returns {Promise<Object>} Deletion result
 */
exports.deleteNotification = async (notificationId, userId) => {
  try {
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: userId
    });
    
    return result;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Create task assigned notification
 * @param {Object} task - Task object
 * @param {Array} assignees - Array of assignee user objects
 * @param {Object} assignedBy - User who assigned the task
 */
exports.createTaskAssignedNotification = async (task, assignees, assignedBy) => {
  try {
    const notifications = assignees.map(assignee => ({
      recipient: assignee.id,
      sender: assignedBy.id,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You have been assigned to task: ${task.title}`,
      relatedEntity: {
        type: 'Task',
        id: task.id
      },
      priority: task.priority || 'MEDIUM'
    }));
    
    await exports.createNotifications(notifications);
  } catch (error) {
    console.error('Error creating task assigned notifications:', error);
  }
};

/**
 * Create task completed notification
 * @param {Object} task - Task object
 * @param {Object} completedBy - User who completed the task
 * @param {Object} assignedTo - User who was assigned the task (if different from completedBy)
 */
exports.createTaskCompletedNotification = async (task, completedBy, assignedTo) => {
  try {
    // Notify the user who assigned the task
    if (assignedTo && assignedTo.id !== completedBy.id) {
      await exports.createNotification({
        recipient: assignedTo.id,
        sender: completedBy.id,
        type: 'TASK_COMPLETED',
        title: 'Task Completed',
        message: `${completedBy.name} has completed task: ${task.title}`,
        relatedEntity: {
          type: 'Task',
          id: task.id
        },
        priority: 'MEDIUM'
      });
    }
  } catch (error) {
    console.error('Error creating task completed notification:', error);
  }
};

/**
 * Create campaign started notification
 * @param {Object} campaign - Campaign object
 * @param {Array} teamMembers - Array of team member user objects
 */
exports.createCampaignStartedNotification = async (campaign, teamMembers) => {
  try {
    const notifications = teamMembers.map(member => ({
      recipient: member.id,
      type: 'CAMPAIGN_STARTED',
      title: 'Campaign Started',
      message: `Campaign "${campaign.name}" has started today`,
      relatedEntity: {
        type: 'Campaign',
        id: campaign.id
      },
      priority: 'MEDIUM'
    }));
    
    await exports.createNotifications(notifications);
  } catch (error) {
    console.error('Error creating campaign started notifications:', error);
  }
};

/**
 * Create campaign ended notification
 * @param {Object} campaign - Campaign object
 * @param {Array} teamMembers - Array of team member user objects
 */
exports.createCampaignEndedNotification = async (campaign, teamMembers) => {
  try {
    const notifications = teamMembers.map(member => ({
      recipient: member.id,
      type: 'CAMPAIGN_ENDED',
      title: 'Campaign Ended',
      message: `Campaign "${campaign.name}" has ended`,
      relatedEntity: {
        type: 'Campaign',
        id: campaign.id
      },
      priority: 'LOW'
    }));
    
    await exports.createNotifications(notifications);
  } catch (error) {
    console.error('Error creating campaign ended notifications:', error);
  }
};

/**
 * Create goal progress notification
 * @param {Object} goal - Goal object
 * @param {Object} user - User object
 * @param {number} progress - Current progress percentage
 */
exports.createGoalProgressNotification = async (goal, user, progress) => {
  try {
    let priority = 'LOW';
    let message = `You've made progress on goal: ${goal.title}`;
    
    if (progress >= 100) {
      priority = 'HIGH';
      message = `Congratulations! You've completed goal: ${goal.title}`;
    } else if (progress >= 90) {
      priority = 'MEDIUM';
      message = `You're close to completing goal: ${goal.title}`;
    } else if (progress >= 50) {
      priority = 'LOW';
      message = `Good progress on goal: ${goal.title}`;
    }
    
    await exports.createNotification({
      recipient: user.id,
      type: 'GOAL_PROGRESS',
      title: 'Goal Progress Update',
      message,
      relatedEntity: {
        type: 'Goal',
        id: goal.id
      },
      priority
    });
  } catch (error) {
    console.error('Error creating goal progress notification:', error);
  }
};