const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  due: {
    type: Date
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'TRASH'],
    default: 'OPEN'
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  relatedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  relatedCampaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  checklist: [{
    text: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
  startDate: {
    type: Date
  },
  completionDate: {
    type: Date
  },
  // Trash functionality fields
  trashed: {
    type: Boolean,
    default: false
  },
  trashedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  trashedAt: {
    type: Date
  },
  restoreStatus: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE'],
    default: 'OPEN'
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
TaskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Handle automatic time tracking based on status changes
  if (this.isModified('status')) {
    if (this.status === 'IN_PROGRESS' && !this.startDate) {
      this.startDate = new Date();
    }
    
    if (this.status === 'DONE' && !this.completionDate) {
      this.completionDate = new Date();
    }
    
    // Handle trash functionality
    if (this.status === 'TRASH' && !this.trashedAt) {
      this.trashedAt = new Date();
      // Store the previous status for restoration
      if (this.isModified('status') && this.status !== 'TRASH') {
        this.restoreStatus = this.status;
      }
    }
  }
  
  next();
});

module.exports = mongoose.model('Task', TaskSchema);