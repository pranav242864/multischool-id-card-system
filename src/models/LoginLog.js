const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['Superadmin', 'Schooladmin', 'Teacher'],
      message: 'Role must be either Superadmin, Schooladmin, or Teacher'
    }
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School'
  },
  ipAddress: {
    type: String,
    required: [true, 'IP address is required'],
    match: [/^(\d{1,3}\.){3}\d{1,3}$/, 'Please enter a valid IP address']
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

module.exports = mongoose.model('LoginLog', loginLogSchema);