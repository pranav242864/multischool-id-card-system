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
  },
  archived: {
    type: Boolean,
    default: false,
    comment: 'Archived sessions are read-only and cannot be modified'
  },
  archivedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: {
      values: ['ACTIVE', 'DISABLED'],
      message: 'Status must be either ACTIVE or DISABLED'
    },
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

// Index for efficient querying by school and active status
sessionSchema.index({ schoolId: 1, activeStatus: 1 });

// Partial unique index to enforce only one active session per school
// This ensures at the database level that only one session can be active per school
sessionSchema.index(
  { schoolId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { activeStatus: true },
    name: 'unique_active_session_per_school'
  }
);

module.exports = mongoose.model('Session', sessionSchema);