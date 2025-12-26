const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AllowedLogin = require('../models/AllowedLogin');
const LoginLog = require('../models/LoginLog');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Load environment variables
require('dotenv').config();

// @desc    Login user
// @route   POST /auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).populate('schoolId');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Check if login is allowed based on role and school
    if (user.role.toLowerCase() !== 'superadmin') {
      if (!user.schoolId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      const allowedLogin = await AllowedLogin.findOne({ schoolId: user.schoolId._id });
      if (!allowedLogin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (user.role === 'Schooladmin' && !allowedLogin.allowSchoolAdmin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (user.role === 'Teacher' && !allowedLogin.allowTeacher) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user._id,
        role: user.role,
        schoolId: user.schoolId ? user.schoolId._id : null
      }
    };

    // Verify JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable not defined');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_SECRET not defined'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    // Log successful login
    await LoginLog.create({
      username: user.username,
      role: user.role,
      schoolId: user.schoolId && user.schoolId._id ? user.schoolId._id : null,
      ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null)
    });

    // Return user data without passwordHash
    res.status(200).json({
      success: true,
      token,
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
    console.error('LOGIN ERROR:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return more specific error based on error type
    if (error.name === 'JsonWebTokenError') {
      return res.status(500).json({
        success: false,
        message: 'Token generation error'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

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