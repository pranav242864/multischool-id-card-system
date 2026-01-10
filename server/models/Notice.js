const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  attachments: {
    type: [String],
    default: []
  },
  visibleTo: {
    type: [String],
    required: [true, 'Visible to is required'],
    enum: {
      values: ['SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'],
      message: 'Visible to must contain only SUPERADMIN, SCHOOLADMIN, or TEACHER'
    }
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: false, // Optional for SUPERADMIN notices targeting specific admins
    index: true
  },
  targetAdminIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [], // Array of specific admin user IDs to target (SUPERADMIN -> SCHOOLADMIN)
    index: true
  },
  targetTeacherIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [], // Array of specific teacher user IDs to target (SCHOOLADMIN -> TEACHER)
    index: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  status: {
    type: String,
    enum: {
      values: ['ACTIVE', 'ARCHIVED'],
      message: 'Status must be either ACTIVE or ARCHIVED'
    },
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notice', noticeSchema);
