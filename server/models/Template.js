const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School is required']
  },
  type: {
    type: String,
    required: [true, 'Template type is required'],
    enum: {
      values: ['student', 'teacher', 'admin'],
      message: 'Type must be either student, teacher, or admin'
    }
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

// Index for efficient querying by school and type
templateSchema.index({ schoolId: 1, type: 1 });

module.exports = mongoose.model('Template', templateSchema);