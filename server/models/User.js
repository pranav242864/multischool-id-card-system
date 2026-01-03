const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'],
      message: 'Role must be either SUPERADMIN, SCHOOLADMIN, or TEACHER'
    }
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: function() {
      return this.role !== 'SUPERADMIN';
    }
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

// Compound unique indexes for multi-tenant safety
userSchema.index(
  { email: 1, schoolId: 1 },
  { unique: true, partialFilterExpression: { role: { $ne: 'SUPERADMIN' } } }
);
userSchema.index(
  { username: 1, schoolId: 1 },
  { unique: true, partialFilterExpression: { role: { $ne: 'SUPERADMIN' } } }
);

module.exports = mongoose.model('User', userSchema);