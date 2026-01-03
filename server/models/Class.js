const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  className: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
    maxlength: [50, 'Class name cannot exceed 50 characters']
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School is required']
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session is required']
  },
  frozen: {
    type: Boolean,
    default: false
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

// Compound unique index to enforce className uniqueness per (schoolId + sessionId)
// This ensures at the database level that class names are unique within each session per school
// Index: schoolId + sessionId + className (enforces uniqueness per school per session)
classSchema.index(
  { schoolId: 1, sessionId: 1, className: 1 },
  { 
    unique: true,
    name: 'unique_class_name_per_school_session'
  }
);

module.exports = mongoose.model('Class', classSchema);