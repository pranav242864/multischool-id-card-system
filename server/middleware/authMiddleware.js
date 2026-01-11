const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Authenticate user via JWT token
// @route   Middleware
// @access  Private
// Validates JWT token and verifies user exists and is active
const authMiddleware = asyncHandler(async (req, res, next) => {
  console.log('[AUTH] ===== MIDDLEWARE HIT =====');
  console.log('[AUTH] Path:', req.path);
  console.log('[AUTH] Method:', req.method);
  
  try {
    // STEP 1: Check Authorization header
    console.log('[AUTH] STEP 1: Checking Authorization header');
    const authHeader = req.headers.authorization;
    console.log('[AUTH] Authorization header exists:', !!authHeader);
    console.log('[AUTH] Authorization header value:', authHeader ? authHeader.substring(0, 20) + '...' : 'MISSING');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AUTH] ❌ FAIL: No Authorization header or not Bearer token');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    // STEP 2: Extract token
    console.log('[AUTH] STEP 2: Extracting token from header');
    const token = authHeader.split(' ')[1];
    console.log('[AUTH] Token extracted:', token ? token.substring(0, 20) + '...' : 'MISSING');
    
    if (!token) {
      console.log('[AUTH] ❌ FAIL: Token missing after split');
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    // STEP 3: Verify JWT_SECRET exists
    console.log('[AUTH] STEP 3: Checking JWT_SECRET');
    console.log('[AUTH] JWT_SECRET exists:', !!env.jwtSecret);
    console.log('[AUTH] JWT_SECRET length:', env.jwtSecret ? env.jwtSecret.length : 0);
    
    if (!env.jwtSecret) {
      console.log('[AUTH] ❌ FAIL: JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_SECRET not configured'
      });
    }

    // STEP 4: Verify JWT token
    console.log('[AUTH] STEP 4: Verifying JWT token');
    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
      console.log('[AUTH] ✅ JWT verified successfully');
      console.log('[AUTH] Decoded payload:', JSON.stringify(decoded, null, 2));
    } catch (jwtError) {
      console.log('[AUTH] ❌ FAIL: JWT verification error:', jwtError.name, jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please log in again.'
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please log in again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: ' + jwtError.message
      });
    }

    // STEP 5: Check decoded.user.id exists
    console.log('[AUTH] STEP 5: Checking decoded.user.id');
    console.log('[AUTH] decoded.user exists:', !!decoded.user);
    console.log('[AUTH] decoded.user.id:', decoded.user?.id);
    console.log('[AUTH] decoded.user.role:', decoded.user?.role);
    console.log('[AUTH] decoded.user.schoolId:', decoded.user?.schoolId);
    
    if (!decoded.user || !decoded.user.id) {
      console.log('[AUTH] ❌ FAIL: decoded.user.id does not exist');
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    // STEP 6: Fetch user from database (populate schoolId to check school status)
    console.log('[AUTH] STEP 6: Fetching user from database');
    console.log('[AUTH] Searching for user ID:', decoded.user.id);
    const user = await User.findById(decoded.user.id).select('status role schoolId').populate('schoolId');
    console.log('[AUTH] User query result:', user ? {
      _id: user._id?.toString(),
      status: user.status,
      role: user.role,
      schoolId: user.schoolId?.toString(),
      schoolStatus: user.schoolId?.status
    } : 'NOT FOUND');
    
    if (!user) {
      console.log('[AUTH] ❌ FAIL: User not found in database');
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists'
      });
    }

    // STEP 7: Check user status
    console.log('[AUTH] STEP 7: Checking user status');
    console.log('[AUTH] user.status:', user.status);
    console.log('[AUTH] user.status === "ACTIVE":', user.status === 'ACTIVE');
    
    if (user.status !== 'ACTIVE') {
      console.log('[AUTH] ❌ FAIL: User status is not ACTIVE');
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact an administrator.'
      });
    }

    // STEP 7.5: SECURITY - Check if school is active (for non-SUPERADMIN users)
    if (user.role !== 'SUPERADMIN' && user.role !== 'Superadmin') {
      console.log('[AUTH] STEP 7.5: Checking school status for non-SUPERADMIN user');
      if (!user.schoolId) {
        console.log('[AUTH] ❌ FAIL: Non-SUPERADMIN user has no schoolId');
        return res.status(401).json({
          success: false,
          message: 'User account is missing school association'
        });
      }
      
      if (user.schoolId.status !== 'active') {
        console.log('[AUTH] ❌ FAIL: School status is not active:', user.schoolId.status);
        return res.status(403).json({
          success: false,
          message: 'Access denied: Your school account has been deactivated. Please contact the administrator.'
        });
      }

      // SECURITY: Check if school is frozen
      if (user.schoolId.frozen) {
        console.log('[AUTH] ❌ FAIL: School is frozen');
        return res.status(403).json({
          success: false,
          message: 'Access denied: Your school account has been frozen. Please contact the administrator.'
        });
      }
      
      console.log('[AUTH] ✅ School status check passed:', user.schoolId.status);
      console.log('[AUTH] ✅ School frozen check passed:', !user.schoolId.frozen);
    }

    // STEP 8: Set req.user
    console.log('[AUTH] STEP 8: Setting req.user');
    // Extract schoolId properly: if populated (has _id), use _id.toString(), otherwise use toString()
    let schoolIdValue = null;
    if (user.schoolId) {
      schoolIdValue = user.schoolId._id ? user.schoolId._id.toString() : user.schoolId.toString();
    }
    req.user = {
      id: user._id.toString(),
      role: user.role,
      schoolId: schoolIdValue
    };
    console.log('[AUTH] ✅ req.user set:', JSON.stringify(req.user, null, 2));
    
    // STEP 9: Call next()
    console.log('[AUTH] STEP 9: Calling next()');
    console.log('[AUTH] ===== MIDDLEWARE SUCCESS =====');
    return next();
  } catch (error) {
    console.log('[AUTH] ===== MIDDLEWARE ERROR =====');
    console.log('[AUTH] Error name:', error.name);
    console.log('[AUTH] Error message:', error.message);
    console.log('[AUTH] Error stack:', error.stack);
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.'
      });
    }
    
    console.error('[AUTH] Unexpected auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
});

module.exports = authMiddleware;