const express = require('express');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const { loginUser } = require('../controllers/authController');

const router = express.Router();

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
router.post('/login', loginUser);

// @desc    Get current user
// @route   GET /auth/me
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('schoolId').select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId ? user.schoolId._id : null,
        schoolName: user.schoolId ? user.schoolId.name : null,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting user'
    });
  }
});

module.exports = router;