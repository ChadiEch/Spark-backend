const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    required: true,
    enum: [
      'TASK_ASSIGNED',
      'TASK_COMPLETED',
      'CAMPAIGN_STARTED',
      'CAMPAIGN_ENDED',
      'GOAL_PROGRESS',
      'MENTION',
      'COMMENT',
      'REMINDER',
      'SYSTEM'
    ]
  },
  title: {
    type: String,
    required: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  read: {
    type: Boolean,
    default: false
  },
  relatedEntity: {
    type: {
      type: String,
      enum: ['Task', 'Campaign', 'Goal', 'Post', 'Comment']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedEntity.type'
    }
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
NotificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);