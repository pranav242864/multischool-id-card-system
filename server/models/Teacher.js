const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Teacher name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  photoUrl: {
    type: String,
    match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i, 'Please enter a valid image URL']
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School is required']
  },
  status: {
    type: String,
    enum: {
      values: ['ACTIVE', 'DISABLED'],
      message: 'Status must be either ACTIVE or DISABLED'
    },
    default: 'ACTIVE'
  }
}, {
  timestamps: true
});

// Compound unique index for school-scoped uniqueness
teacherSchema.index({ schoolId: 1, classId: 1 }, { unique: true });

module.exports = mongoose.model('Teacher', teacherSchema);