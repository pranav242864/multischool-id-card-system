const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AllowedLogin = require('../models/AllowedLogin');
const PasswordResetToken = require('../models/PasswordResetToken');
const LoginLog = require('../models/LoginLog');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { logLoginAttempt, getClientIp } = require('../utils/loginLogger');

const router = express.Router();

// Note: dotenv should already be loaded in server.js
// No need to load again here

// ============================================================================
// PUBLIC ROUTES - NO AUTHENTICATION REQUIRED
// ============================================================================

// @desc    Register Superadmin (one-time setup)
// @route   POST /auth/register-superadmin
// @access  Public (one-time setup endpoint)
router.post('/register-superadmin', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Enforce one-superadmin rule
    const existingSuperadmin = await User.findOne({ role: 'SUPERADMIN', status: 'ACTIVE' });
    if (existingSuperadmin) {
      return res.status(403).json({
        success: false,
        message: 'A Superadmin already exists. Only one Superadmin is allowed.'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generate username from email (first part before @)
    let username = email.split('@')[0].toLowerCase();

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      // If username exists, append a number
      let counter = 1;
      let newUsername = `${username}${counter}`;
      while (await User.findOne({ username: newUsername })) {
        counter++;
        newUsername = `${username}${counter}`;
      }
      username = newUsername;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create Superadmin user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      username: username,
      passwordHash: passwordHash,
      role: 'SUPERADMIN',
      status: 'ACTIVE'
      // schoolId is not required for Superadmin (handled by schema)
    });

    // Return user data without password
    res.status(201).json({
      success: true,
      message: 'Superadmin created successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    // Handle duplicate key errors (email or username)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    // Log error server-side only
    console.error('Register Superadmin error:', {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @desc    Login user (email/password)
// @route   POST /auth/login
// @access  Public (NO authMiddleware - login must work without token)
router.post('/login', async (req, res) => {
  // CRITICAL: Log that this route is being hit
  console.log('🚨 LOGIN ROUTE HIT:', {
    method: req.method,
    path: req.path,
    url: req.url,
    body: {
      email: req.body?.email,
      passwordProvided: req.body?.password ? 'YES' : 'NO',
      passwordLength: req.body?.password ? req.body.password.length : 0
    },
    timestamp: new Date().toISOString()
  });

  const ipAddress = getClientIp(req);
  let user = null;
  let failureReason = 'invalid_credentials';

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      // Log failed attempt
      await logLoginAttempt({
        email: email || 'unknown',
        ipAddress,
        success: false,
        loginMethod: 'email_password',
        failureReason: 'invalid_credentials'
      });

      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email (explicitly select passwordHash for authentication)
    user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .populate('schoolId');
    if (!user) {
      // Log failed attempt
      await logLoginAttempt({
        email: email.toLowerCase(),
        ipAddress,
        success: false,
        loginMethod: 'email_password',
        failureReason: 'invalid_credentials'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      failureReason = 'inactive_account';
      await logLoginAttempt({
        email: user.email,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId ? user.schoolId._id : null,
        ipAddress,
        success: false,
        loginMethod: 'email_password',
        failureReason
      });

      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Check if login is allowed based on role and school
    if (user.role !== 'SUPERADMIN') {
      if (!user.schoolId) {
        await logLoginAttempt({
          email: user.email,
          username: user.username,
          role: user.role,
          ipAddress,
          success: false,
          loginMethod: 'email_password',
          failureReason: 'invalid_credentials'
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // SECURITY: Check if school is active (not deleted)
      if (user.schoolId.status !== 'active') {
        failureReason = 'school_deleted';
        await logLoginAttempt({
          email: user.email,
          username: user.username,
          role: user.role,
          schoolId: user.schoolId._id,
          ipAddress,
          success: false,
          loginMethod: 'email_password',
          failureReason
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied: Your school account has been deactivated. Please contact the administrator.'
        });
      }

      // SECURITY: Check if school is frozen
      if (user.schoolId.frozen) {
        failureReason = 'school_frozen';
        await logLoginAttempt({
          email: user.email,
          username: user.username,
          role: user.role,
          schoolId: user.schoolId._id,
          ipAddress,
          success: false,
          loginMethod: 'email_password',
          failureReason
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied: Your school account has been frozen. Please contact the administrator.'
        });
      }
      
      let allowedLogin = await AllowedLogin.findOne({ schoolId: user.schoolId._id });
      if (!allowedLogin) {
        // If no AllowedLogin record exists, create one with default permissions (allow all)
        // This ensures backward compatibility for schools without explicit configuration
        allowedLogin = await AllowedLogin.create({
          schoolId: user.schoolId._id,
          allowSchoolAdmin: true,
          allowTeacher: true,
          allowTeacherCardGeneration: false
        });
        // Continue with login using default permissions
        // No need to check permissions as defaults allow all
      } else {
        // Check permissions only if record exists
      if (user.role === 'SCHOOLADMIN' && !allowedLogin.allowSchoolAdmin) {
          failureReason = 'login_disabled';
          await logLoginAttempt({
            email: user.email,
            username: user.username,
            role: user.role,
            schoolId: user.schoolId._id,
            ipAddress,
            success: false,
            loginMethod: 'email_password',
            failureReason
          });

          return res.status(403).json({
          success: false,
            message: 'School admin login is currently disabled for your school. Please contact your administrator.'
        });
      }

      if (user.role === 'TEACHER' && !allowedLogin.allowTeacher) {
          failureReason = 'login_disabled';
          await logLoginAttempt({
            email: user.email,
            username: user.username,
            role: user.role,
            schoolId: user.schoolId._id,
            ipAddress,
            success: false,
            loginMethod: 'email_password',
            failureReason
          });

          return res.status(403).json({
          success: false,
            message: 'Teacher login is currently disabled for your school. Please contact your administrator.'
        });
      }
      }
    }

    // CRITICAL: Validate passwordHash exists
    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      console.error('SECURITY ALERT: User missing passwordHash:', {
        userId: user._id,
        email: user.email,
        username: user.username
      });
      await logLoginAttempt({
        email: user.email,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId ? user.schoolId._id : null,
        ipAddress,
        success: false,
        loginMethod: 'email_password',
        failureReason: 'invalid_credentials'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // CRITICAL: Detect plain text passwords - bcrypt hashes start with $2a$, $2b$, or $2y$
    // Only reject if it's clearly NOT a bcrypt hash (doesn't start with $2)
    const isBcryptHash = user.passwordHash.startsWith('$2');
    if (!isBcryptHash) {
      console.error('SECURITY ALERT: User has plain text password (not bcrypt hash):', {
        userId: user._id,
        email: user.email,
        username: user.username,
        passwordHashLength: user.passwordHash.length,
        passwordHashPrefix: user.passwordHash.substring(0, 20)
      });
      await logLoginAttempt({
        email: user.email,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId ? user.schoolId._id : null,
        ipAddress,
        success: false,
        loginMethod: 'email_password',
        failureReason: 'invalid_credentials'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // CRITICAL: Validate password input
    if (!password || typeof password !== 'string' || password.length === 0) {
      console.error('SECURITY ALERT: Invalid password input:', {
        email: user.email,
        passwordType: typeof password
      });
      await logLoginAttempt({
        email: user.email,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId ? user.schoolId._id : null,
        ipAddress,
        success: false,
        loginMethod: 'email_password',
        failureReason: 'invalid_credentials'
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // CRITICAL: Perform password comparison using bcrypt.compare
    // This is the ONLY way to verify passwords - no bypasses, no exceptions
    let isMatch = false;
    try {
      // Compare password with stored hash - bcrypt.compare handles everything
      isMatch = await bcrypt.compare(password, user.passwordHash);
      
      console.log('🔐 PASSWORD COMPARISON:', {
        email: user.email,
        isMatch: isMatch,
        isMatchType: typeof isMatch,
        hashPrefix: user.passwordHash.substring(0, 20)
      });
      
    } catch (compareError) {
      console.error('❌ SECURITY ALERT: bcrypt.compare error:', {
        userId: user._id,
        email: user.email,
        error: compareError.message
      });
      isMatch = false;
    }
    
    // CRITICAL: Only allow login if password matches
    // isMatch must be exactly true - reject false, null, undefined, or any other value
    if (isMatch !== true) {
      console.log('❌ LOGIN REJECTED: Password does not match', {
        email: user.email,
        isMatch: isMatch
      });
      
      await logLoginAttempt({
        email: user.email,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId ? user.schoolId._id : null,
        ipAddress,
        success: false,
        loginMethod: 'email_password',
        failureReason: 'invalid_credentials'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create JWT payload - Standardized structure
    // Must include: user.id, user.role, user.schoolId (null for SUPERADMIN)
    const payload = {
      user: {
        id: user._id.toString(), // Ensure string format
        role: user.role, // Use exact database value: 'SUPERADMIN', 'SCHOOLADMIN', or 'TEACHER'
        schoolId: user.schoolId ? user.schoolId._id.toString() : null // null for SUPERADMIN, string for others
      }
    };

    // Verify JWT secret exists (should be validated at startup, but check as fallback)
    const env = require('../config/env');
    if (!env.jwtSecret) {
      console.error('JWT_SECRET environment variable not defined');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_SECRET not defined'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(payload, env.jwtSecret, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    // Log successful login
    await logLoginAttempt({
      email: user.email,
      username: user.username,
      role: user.role,
      schoolId: user.schoolId ? user.schoolId._id : null,
      ipAddress,
      success: true,
      loginMethod: 'email_password'
    });

    // Audit log: successful login
    const { logAuditEvent } = require('../services/auditLog.service');
    try {
      await logAuditEvent({
        action: 'LOGIN',
        entityType: 'USER',
        entityId: user._id,
        schoolId: user.schoolId ? user.schoolId._id : null,
        user: { id: user._id.toString(), role: user.role },
        req,
        status: 'SUCCESS',
        metadata: { email: user.email }
      });
    } catch (error) {
      // Fire-and-forget: never block login
    }

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
    // Log error server-side only (never sent to client)
    console.error('LOGIN ERROR:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // CRITICAL: Log failed attempt - always log, even if we don't have user info
    // This ensures all login attempts are tracked for security
    try {
      if (user) {
        await logLoginAttempt({
          email: user.email,
          username: user.username,
          role: user.role,
          schoolId: user.schoolId ? user.schoolId._id : null,
          ipAddress,
          success: false,
          loginMethod: 'email_password',
          failureReason: 'other'
        });
      } else {
        // Log even if we don't have user info (e.g., early validation errors)
        // Try to get email from request body if available
        const email = req.body?.email || 'unknown';
        await logLoginAttempt({
          email: email,
          ipAddress,
          success: false,
          loginMethod: 'email_password',
          failureReason: 'other'
        });
      }
    } catch (logError) {
      // Don't let logging errors break the error response
      console.error('Failed to log login attempt in error handler:', logError);
    }
    
    // CRITICAL: Error handling paths MUST NOT allow login
    // All error paths return failure - no exceptions, no bypasses
    // Return more specific error based on error type, but ALWAYS reject login
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
    
    // Default error response - ALWAYS reject login on any error
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// ============================================================================
// PROTECTED ROUTES - AUTHENTICATION REQUIRED
// ============================================================================

// @desc    Get current user
// @route   GET /auth/me
// @access  Private (REQUIRES authMiddleware)
// Note: authMiddleware already validates user existence and active status
// This endpoint provides additional user details for the authenticated user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('schoolId').select('-passwordHash');
    
    // Additional check (though authMiddleware should have already validated)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify user is still active (defense-in-depth)
    if (user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact an administrator.'
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

// @desc    Google OAuth 2.0 login
// @route   POST /auth/google
// @access  Public (NO authMiddleware - OAuth must work without token)
router.post('/google', async (req, res) => {
  const ipAddress = getClientIp(req);
  let user = null;

  try {
    const { idToken, email, name } = req.body;

    // Validate input
    if (!email) {
      await logLoginAttempt({
        email: 'unknown',
        ipAddress,
        success: false,
        loginMethod: 'google_oauth',
        failureReason: 'oauth_error'
      });

      return res.status(400).json({
        success: false,
        message: 'Email is required for Google OAuth'
      });
    }

    // Find user by email
    user = await User.findOne({ email: email.toLowerCase() }).populate('schoolId');
    
    if (!user) {
      await logLoginAttempt({
        email: email.toLowerCase(),
        ipAddress,
        success: false,
        loginMethod: 'google_oauth',
        failureReason: 'invalid_credentials'
      });

      return res.status(401).json({
        success: false,
        message: 'No account found with this email. Please contact your administrator.'
      });
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      await logLoginAttempt({
        email: user.email,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId ? user.schoolId._id : null,
        ipAddress,
        success: false,
        loginMethod: 'google_oauth',
        failureReason: 'inactive_account'
      });

      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Check if login is allowed based on role and school
    if (user.role !== 'SUPERADMIN') {
      if (!user.schoolId) {
        await logLoginAttempt({
          email: user.email,
          username: user.username,
          role: user.role,
          ipAddress,
          success: false,
          loginMethod: 'google_oauth',
          failureReason: 'invalid_credentials'
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // SECURITY: Check if school is active (not deleted)
      if (user.schoolId.status !== 'active') {
        await logLoginAttempt({
          email: user.email,
          username: user.username,
          role: user.role,
          schoolId: user.schoolId._id,
          ipAddress,
          success: false,
          loginMethod: 'google_oauth',
          failureReason: 'school_deleted'
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied: Your school account has been deactivated. Please contact the administrator.'
        });
      }
      
      let allowedLogin = await AllowedLogin.findOne({ schoolId: user.schoolId._id });
      if (!allowedLogin) {
        // If no AllowedLogin record exists, create one with default permissions (allow all)
        allowedLogin = await AllowedLogin.create({
          schoolId: user.schoolId._id,
          allowSchoolAdmin: true,
          allowTeacher: true,
          allowTeacherCardGeneration: false
        });
        // Continue with login using default permissions
      } else {
        // Check permissions only if record exists
        if (user.role === 'SCHOOLADMIN' && !allowedLogin.allowSchoolAdmin) {
          await logLoginAttempt({
            email: user.email,
            username: user.username,
            role: user.role,
            schoolId: user.schoolId._id,
            ipAddress,
            success: false,
            loginMethod: 'google_oauth',
            failureReason: 'login_disabled'
          });

          return res.status(403).json({
            success: false,
            message: 'School admin login is currently disabled for your school. Please contact your administrator.'
          });
        }

        if (user.role === 'TEACHER' && !allowedLogin.allowTeacher) {
          await logLoginAttempt({
            email: user.email,
            username: user.username,
            role: user.role,
            schoolId: user.schoolId._id,
            ipAddress,
            success: false,
            loginMethod: 'google_oauth',
            failureReason: 'login_disabled'
          });

          return res.status(403).json({
            success: false,
            message: 'Teacher login is currently disabled for your school. Please contact your administrator.'
          });
        }
      }
    }

    // Create JWT payload - Standardized structure
    // Must include: user.id, user.role, user.schoolId (null for SUPERADMIN)
    const payload = {
      user: {
        id: user._id.toString(), // Ensure string format
        role: user.role, // Use exact database value: 'SUPERADMIN', 'SCHOOLADMIN', or 'TEACHER'
        schoolId: user.schoolId ? user.schoolId._id.toString() : null // null for SUPERADMIN, string for others
      }
    };

    // Verify JWT secret exists (should be validated at startup, but check as fallback)
    const env = require('../config/env');
    if (!env.jwtSecret) {
      console.error('JWT_SECRET environment variable not defined');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: JWT_SECRET not defined'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(payload, env.jwtSecret, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    // Log successful login
    await logLoginAttempt({
      email: user.email,
      username: user.username,
      role: user.role,
      schoolId: user.schoolId ? user.schoolId._id : null,
      ipAddress,
      success: true,
      loginMethod: 'google_oauth'
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
    console.error('GOOGLE OAUTH ERROR:', error);

    // Log failed attempt - always log, even if we don't have user info
    try {
      if (user) {
        await logLoginAttempt({
          email: user.email,
          username: user.username,
          role: user.role,
          schoolId: user.schoolId ? user.schoolId._id : null,
          ipAddress,
          success: false,
          loginMethod: 'google_oauth',
          failureReason: 'oauth_error'
        });
      } else {
        // Log even if we don't have user info (e.g., early validation errors)
        // Try to get email from request body if available
        const email = req.body?.email || 'unknown';
        await logLoginAttempt({
          email: email,
          ipAddress,
          success: false,
          loginMethod: 'google_oauth',
          failureReason: 'oauth_error'
        });
      }
    } catch (logError) {
      // Don't let logging errors break the error response
      console.error('Failed to log login attempt in error handler:', logError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during Google OAuth login'
    });
  }
});

// @desc    Request password reset
// @route   POST /auth/forgot-password
// @access  Public (NO authMiddleware - password reset must work without token)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success message to prevent email enumeration
    // Don't reveal whether email exists or not
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = PasswordResetToken.generateToken();
    
    // Save reset token
    await PasswordResetToken.create({
      userId: user._id,
      token: resetToken,
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    });

    // In production, send email with reset link
    // For now, we'll return the token in development
    // TODO: Implement email service (e.g., nodemailer, SendGrid, etc.)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset link:', resetLink);
    }

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(user.email, resetLink);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Only include in development
      ...(process.env.NODE_ENV === 'development' && { resetLink })
    });
  } catch (error) {
    console.error('FORGOT PASSWORD ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset request'
    });
  }
});

// @desc    Reset password with token
// @route   POST /auth/reset-password
// @access  Public (NO authMiddleware - password reset must work without token)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find reset token
    const resetToken = await PasswordResetToken.findOne({ token });
    
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Check if token is valid and not used
    if (!resetToken.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Find user
    const user = await User.findById(resetToken.userId);
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user password
    user.passwordHash = passwordHash;
    await user.save();

    // Mark token as used
    resetToken.used = true;
    await resetToken.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('RESET PASSWORD ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
});

// @desc    Get login logs (Superadmin only)
// @route   GET /auth/login-logs
// @access  Private (Superadmin only)
router.get('/login-logs', authMiddleware, requireRole('SUPERADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 50, schoolId, role, success, startDate, endDate } = req.query;

    // Build query
    const query = {};

    if (schoolId) {
      query.schoolId = schoolId;
    }

    if (role) {
      query.role = role;
    }

    if (success !== undefined) {
      query.success = success === 'true';
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get logs with pagination
    const logs = await LoginLog.find(query)
      .populate('schoolId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await LoginLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('GET LOGIN LOGS ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving login logs'
    });
  }
});

// @desc    Get login permissions for a school
// @route   GET /auth/login-permissions/:schoolId
// @access  Private (Superadmin, Schooladmin)
router.get('/login-permissions/:schoolId', authMiddleware, require('../controllers/allowedLogin.controller').getLoginPermissions);

// @desc    Get login permissions for all schools (Superadmin only)
// @route   GET /auth/login-permissions
// @access  Private (Superadmin only)
router.get('/login-permissions', authMiddleware, require('../controllers/allowedLogin.controller').getAllLoginPermissions);

// @desc    Update login permissions for a school
// @route   PATCH /auth/login-permissions/:schoolId
// @access  Private (Superadmin, Schooladmin)
router.patch('/login-permissions/:schoolId', authMiddleware, require('../controllers/allowedLogin.controller').updateLoginPermissions);

module.exports = router;