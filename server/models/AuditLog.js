const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true
  },
  entityType: {
    type: String,
    required: [true, 'Entity type is required'],
    trim: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: function() {
      const loginActions = ['LOGIN', 'LOGOUT', 'TOKEN_REFRESH'];
      return !loginActions.includes(this.action);
    }
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Performed by is required']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'],
      message: 'Role must be SUPERADMIN, SCHOOLADMIN, or TEACHER'
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    required: [true, 'IP address is required']
  },
  userAgent: {
    type: String,
    required: [true, 'User agent is required']
  },
  status: {
    type: String,
    enum: {
      values: ['SUCCESS', 'FAILED'],
      message: 'Status must be SUCCESS or FAILED'
    },
    default: 'SUCCESS'
  },
  errorMessage: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Indexes for efficient querying
auditLogSchema.index({ schoolId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

