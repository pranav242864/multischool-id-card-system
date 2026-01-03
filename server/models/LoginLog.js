const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  role: {
    type: String,
    enum: {
      values: ['Superadmin', 'Schooladmin', 'Teacher', null],
      message: 'Role must be either Superadmin, Schooladmin, or Teacher'
    },
    default: null
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    default: null
  },
  ipAddress: {
    type: String,
    required: [true, 'IP address is required'],
    trim: true
  },
  success: {
    type: Boolean,
    required: [true, 'Success status is required'],
    default: false
  },
  failureReason: {
    type: String,
    enum: ['invalid_credentials', 'inactive_account', 'login_disabled', 'oauth_error', 'other'],
    default: null
  },
  loginMethod: {
    type: String,
    enum: ['email_password', 'google_oauth'],
    required: [true, 'Login method is required'],
    default: 'email_password'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient querying by username, role, and timestamp
loginLogSchema.index({ username: 1, role: 1, timestamp: -1 });
loginLogSchema.index({ email: 1, timestamp: -1 });
loginLogSchema.index({ success: 1, timestamp: -1 });
loginLogSchema.index({ schoolId: 1, timestamp: -1 });

module.exports = mongoose.model('LoginLog', loginLogSchema);