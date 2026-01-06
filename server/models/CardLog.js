const mongoose = require('mongoose');

const cardLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  role: {
    type: String,
    enum: {
      values: ['SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'],
      message: 'Role must be SUPERADMIN, SCHOOLADMIN, or TEACHER'
    },
    required: [true, 'Role is required']
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required']
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session ID is required']
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: [true, 'Template ID is required']
  },
  entityType: {
    type: String,
    enum: {
      values: ['STUDENT', 'TEACHER'],
      message: 'Entity type must be STUDENT or TEACHER'
    },
    required: [true, 'Entity type is required']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Entity ID is required']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
cardLogSchema.index({ userId: 1, timestamp: -1 });
cardLogSchema.index({ schoolId: 1, timestamp: -1 });
cardLogSchema.index({ sessionId: 1, timestamp: -1 });
cardLogSchema.index({ templateId: 1, timestamp: -1 });
cardLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

module.exports = mongoose.model('CardLog', cardLogSchema);

