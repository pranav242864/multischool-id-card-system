const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AllowedLogin = require('../models/AllowedLogin');
const LoginLog = require('../models/LoginLog');

require('dotenv').config();

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
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
    if (user.status !== 'active' && user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Check if login is allowed based on role and school
    if (user.role !== 'Superadmin' && user.role !== 'SUPERADMIN') {
      const allowedLogin = await AllowedLogin.findOne({ schoolId: user.schoolId._id });
      if (!allowedLogin) {
        return res.status(401).json({
          success: false,
          message: 'Login not allowed for this school'
        });
      }

      if ((user.role === 'Schooladmin' || user.role === 'SCHOOLADMIN') && !allowedLogin.allowSchoolAdmin) {
        return res.status(401).json({
          success: false,
          message: 'School admin login is currently disabled'
        });
      }

      if ((user.role === 'Teacher' || user.role === 'TEACHER') && !allowedLogin.allowTeacher) {
        return res.status(401).json({
          success: false,
          message: 'Teacher login is currently disabled'
        });
      }
    }

    // Verify hashed password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create JWT payload - Standard format: { user: { id, role, schoolId } }
    const payload = {
      user: {
        id: user._id.toString(),
        role: user.role,
        schoolId: user.schoolId ? user.schoolId._id.toString() : null
      }
    };

    // Generate JWT using JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    // Log successful login
    await LoginLog.create({
      username: user.username,
      role: user.role,
      schoolId: user.schoolId ? user.schoolId._id : null,
      ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket ? req.connection.socket.remoteAddress : null)
    });

    // Return { success, token, user }
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
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

module.exports = {
  loginUser
};

