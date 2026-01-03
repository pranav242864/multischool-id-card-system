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
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
    minlength: [6, 'Password must be at least 6 characters']
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
    ref: 'School',
    required: function() {
      return this.role !== 'Superadmin';
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive'],
      message: 'Status must be either active or inactive'
    },
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);