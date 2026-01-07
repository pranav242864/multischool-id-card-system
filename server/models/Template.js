const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
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
  type: {
    type: String,
    required: [true, 'Template type is required'],
    enum: {
      values: ['STUDENT', 'TEACHER', 'SCHOOLADMIN'],
      message: 'Type must be either STUDENT, TEACHER, or SCHOOLADMIN'
    }
  },
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  version: {
    type: Number,
    required: [true, 'Version is required'],
    default: 1
  },
  layoutConfig: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Layout configuration is required']
  },
  dataTags: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Unique compound index to prevent cross-session collisions
templateSchema.index({ schoolId: 1, sessionId: 1, type: 1, version: 1 }, { unique: true });

// Partial unique index to enforce only one active template per (schoolId + sessionId + classId + type) where isActive=true
templateSchema.index(
  { schoolId: 1, sessionId: 1, classId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: 'unique_active_template_per_school_session_class_type'
  }
);

module.exports = mongoose.model('Template', templateSchema);