const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  admissionNo: {
    type: String,
    required: [true, 'Admission number is required'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  dob: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  fatherName: {
    type: String,
    required: [true, 'Father name is required'],
    trim: true,
    maxlength: [100, 'Father name cannot exceed 100 characters']
  },
  motherName: {
    type: String,
    required: [true, 'Mother name is required'],
    trim: true,
    maxlength: [100, 'Mother name cannot exceed 100 characters']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  aadhaar: {
    type: String,
    match: [/^[0-9]{12}$/, 'Please enter a valid 12-digit Aadhaar number']
  },
  photoUrl: {
    type: String,
    match: [/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i, 'Please enter a valid image URL']
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session is required']
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

// Compound unique index to enforce admissionNo uniqueness per (schoolId + sessionId)
// This ensures at the database level that admission numbers are unique within each session per school
// The same admission number can be reused across different sessions
// Index: schoolId + sessionId + admissionNo (enforces uniqueness per school per session)
studentSchema.index(
  { schoolId: 1, sessionId: 1, admissionNo: 1 },
  { 
    unique: true,
    name: 'unique_admission_no_per_school_session'
  }
);

module.exports = mongoose.model('Student', studentSchema);