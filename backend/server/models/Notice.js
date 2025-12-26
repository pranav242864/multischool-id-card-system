const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School is required']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  noticeDate: {
    type: Date,
    required: [true, 'Notice date is required'],
    default: Date.now
  },
  attachmentUrl: {
    type: String,
    match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif|pdf|doc|docx)$/i, 'Please enter a valid file URL']
  },
  attachmentType: {
    type: String,
    enum: {
      values: ['image', 'document', 'pdf'],
      message: 'Attachment type must be image, document, or pdf'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'archived'],
      message: 'Status must be either active, inactive, or archived'
    },
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for efficient querying by school and status
noticeSchema.index({ schoolId: 1, status: 1 });

module.exports = mongoose.model('Notice', noticeSchema);