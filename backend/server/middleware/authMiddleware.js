const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

// @desc    Protect routes
// @route   Middleware
// @access  Private
const authMiddleware = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      if (!env.jwtSecret) {
        return res.status(500).json({
          success: false,
          message: 'Server configuration error: JWT_SECRET not defined'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, env.jwtSecret);

      // Get user from token and attach to request
      req.user = decoded.user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// @desc    Role-based access control
// @route   Middleware
// @access  Private
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware
};