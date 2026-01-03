const { getActiveSession } = require('../utils/sessionUtils');
const { getSchoolIdForOperation } = require('../utils/getSchoolId');

/**
 * Middleware to ensure an active session exists before allowing operations
 * This middleware validates that:
 * 1. An active session exists for the school
 * 2. The active session is not archived
 * 
 * Use this middleware on routes that require an active session for data operations
 * 
 * For Superadmin: requires schoolId in query parameter
 * For others: uses req.user.schoolId from JWT token
 */
const requireActiveSession = async (req, res, next) => {
  try {
    // Get schoolId using standardized utility
    // Superadmin must provide schoolId in query parameter
    let schoolId;
    try {
      schoolId = getSchoolIdForOperation(req);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // This will throw an error if no active session exists or if it's archived
    const activeSession = await getActiveSession(schoolId);

    // Attach active session to request for use in controllers
    req.activeSession = activeSession;

    next();
  } catch (error) {
    // Handle specific error messages
    if (error.message.includes('No active session found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('archived')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: 'Error validating active session'
    });
  }
};

module.exports = {
  requireActiveSession
};

