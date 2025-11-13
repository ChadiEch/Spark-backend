const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
    default: 'UPCOMING'
  },
  start: {
    type: Date,
    required: [true, 'Please add a start date']
  },
  end: {
    type: Date,
    required: [true, 'Please add an end date']
  },
  budgetCents: {
    type: Number,
    default: 0
  },
  spentCents: {
    type: Number,
    default: 0
  },
  channels: [{
    type: String,
    enum: ['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'PINTEREST', 'X', 'YOUTUBE']
  }],
  goals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  }],
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
CampaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Campaign', CampaignSchema);