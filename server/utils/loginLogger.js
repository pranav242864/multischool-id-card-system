const LoginLog = require('../models/LoginLog');

/**
 * Logs a login attempt (success or failure)
 * Ensures all login attempts are logged for audit purposes as per PRD requirements
 * @param {Object} params - Login attempt parameters
 * @param {String} params.email - User email (required)
 * @param {String} params.username - Username (optional, will use email if not provided)
 * @param {String} params.role - User role (null for failed attempts where user not found)
 * @param {Object} params.schoolId - School ID (null for failed attempts where user not found)
 * @param {String} params.ipAddress - IP address of the request (required)
 * @param {Boolean} params.success - Whether login was successful (required)
 * @param {String} params.loginMethod - 'email_password' or 'google_oauth' (required)
 * @param {String} params.failureReason - Reason for failure (if applicable): 'invalid_credentials', 'inactive_account', 'login_disabled', 'oauth_error', 'other'
 */
const logLoginAttempt = async ({
  email,
  username = null,
  role = null,
  schoolId = null,
  ipAddress,
  success,
  loginMethod = 'email_password',
  failureReason = null
}) => {
  try {
    // Validate required parameters
    if (!email || !ipAddress || success === undefined) {
      console.error('Missing required parameters for login log:', { email, ipAddress, success });
      return;
    }

    // Use email as username if username not provided
    const logUsername = username || email;

    // Create login log entry with all required fields: timestamp, IP, role, school
    await LoginLog.create({
      email: email.toLowerCase(),
      username: logUsername,
      role: role || null, // Role is null for failed attempts where user not found
      schoolId: schoolId || null, // School ID is null for failed attempts where user not found
      ipAddress: ipAddress || 'unknown',
      success: success,
      loginMethod: loginMethod || 'email_password',
      failureReason: success ? null : (failureReason || 'other'), // Only set failureReason for failed attempts
      timestamp: new Date() // Explicit timestamp for audit purposes
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break authentication
    // But log the error for monitoring
    console.error('Failed to log login attempt:', error);
    console.error('Login attempt details that failed to log:', {
      email,
      username,
      role,
      schoolId,
      ipAddress,
      success,
      loginMethod,
      failureReason
    });
  }
};

/**
 * Extracts IP address from request object
 * @param {Object} req - Express request object
 * @returns {String} - IP address
 */
const getClientIp = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         'unknown';
};

module.exports = {
  logLoginAttempt,
  getClientIp
};

