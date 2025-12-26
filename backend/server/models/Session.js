const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionName: {
    type: String,
    required: [true, 'Session name is required'],
    trim: true,
    maxlength: [50, 'Session name cannot exceed 50 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School is required']
  },
  activeStatus: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying by school and active status
sessionSchema.index({ schoolId: 1, activeStatus: 1 });

module.exports = mongoose.model('Session', sessionSchema);