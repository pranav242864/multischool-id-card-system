const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    default: () => new Date(Date.now() + 3600000) // 1 hour from now
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Auto-delete after 1 hour (in seconds)
  }
}, {
  timestamps: true
});

// Index for efficient token lookup
passwordResetTokenSchema.index({ token: 1 });
passwordResetTokenSchema.index({ userId: 1, used: 1 });

// Static method to generate a secure random token
passwordResetTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Instance method to check if token is valid
passwordResetTokenSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date();
};

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

