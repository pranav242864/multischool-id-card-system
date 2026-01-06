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
  active: {
    type: Boolean,
    default: false,
    comment: 'Only one active template per (schoolId + sessionId + type). Older versions are read-only.'
  }
}, {
  timestamps: true
});

// Unique compound index to prevent cross-session collisions
templateSchema.index({ schoolId: 1, sessionId: 1, type: 1, version: 1 }, { unique: true });

// Partial unique index to enforce only one active template per (schoolId + sessionId + type)
templateSchema.index(
  { schoolId: 1, sessionId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: 'unique_active_template_per_school_session_type'
  }
);

module.exports = mongoose.model('Template', templateSchema);