const mongoose = require('mongoose');

const allowedLoginSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School is required']
  },
  allowSchoolAdmin: {
    type: Boolean,
    default: true
  },
  allowTeacher: {
    type: Boolean,
    default: true
  },
  allowTeacherCardGeneration: {
    type: Boolean,
    default: false,
    comment: 'Allows teachers to generate ID cards for students in their assigned class'
  }
}, {
  timestamps: true
});

// Index for efficient querying by schoolId
allowedLoginSchema.index({ schoolId: 1 });

module.exports = mongoose.model('AllowedLogin', allowedLoginSchema);