const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  type: {
    type: String,
    enum: ['ENGAGEMENT', 'SALES', 'REACH', 'CONVERSIONS', 'AWARENESS'],
    required: [true, 'Please specify a goal type']
  },
  targetValue: {
    type: Number,
    required: [true, 'Please add a target value']
  },
  targetUnit: {
    type: String,
    required: [true, 'Please add a target unit']
  },
  currentValue: {
    type: Number,
    default: 0
  },
  baselineValue: {
    type: Number
  },
  start: {
    type: Date,
    required: [true, 'Please add a start date']
  },
  end: {
    type: Date,
    required: [true, 'Please add an end date']
  },
  status: {
    type: String,
    enum: ['UPCOMING', 'ACTIVE', 'AT_RISK', 'OFF_TRACK', 'COMPLETE'],
    default: 'UPCOMING'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campaigns: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  }],
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
GoalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Goal', GoalSchema);