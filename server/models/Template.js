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
  }]
}, {
  timestamps: true
});

// Unique compound index to prevent cross-session collisions
templateSchema.index({ schoolId: 1, sessionId: 1, type: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('Template', templateSchema);