const { getSessionById } = require('../services/session.service');
const { getSchoolIdForFilter } = require('../utils/getSchoolId');

/**
 * Middleware to prevent modifications to archived sessions
 * Archived sessions are read-only
 * 
 * For Superadmin: can use query parameter for schoolId (optional for filtering)
 * For others: uses req.user.schoolId from JWT token
 */
const preventArchivedSessionModification = async (req, res, next) => {
  // Extract sessionId from various sources (params, body, query)
  let sessionId = req.params.sessionId || req.params.id || req.body.sessionId || req.query.sessionId;

  // If no sessionId found, skip this middleware
  if (!sessionId) {
    return next();
  }

  try {
    // Get schoolId using standardized utility (optional for Superadmin)
    let schoolId;
    try {
      schoolId = getSchoolIdForFilter(req);
    } catch (error) {
      // If schoolId is required but missing, let other validations handle it
      return next();
    }
    
    if (!schoolId) {
      return next(); // Let other validations handle missing schoolId
    }

    const session = await getSessionById(sessionId, schoolId);

    // Prevent modifications to archived sessions
    if (session.archived) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify data in an archived session. Archived sessions are read-only.'
      });
    }

    next();
  } catch (error) {
    // If session not found or other error, let other middleware handle it
    next();
  }
};

/**
 * Middleware to prevent modifications to inactive sessions (except promotion)
 * Inactive sessions should only allow read operations
 * 
 * For Superadmin: can use query parameter for schoolId (optional for filtering)
 * For others: uses req.user.schoolId from JWT token
 */
const preventInactiveSessionModification = async (req, res, next) => {
  // Skip for promotion endpoint
  if (req.path.includes('/promote') || req.method === 'GET') {
    return next();
  }

  // Extract sessionId from various sources
  let sessionId = req.params.sessionId || req.params.id || req.body.sessionId || req.query.sessionId;

  if (!sessionId) {
    return next();
  }

  try {
    // Get schoolId using standardized utility (optional for Superadmin)
    let schoolId;
    try {
      schoolId = getSchoolIdForFilter(req);
    } catch (error) {
      // If schoolId is required but missing, let other validations handle it
      return next();
    }
    
    if (!schoolId) {
      return next();
    }

    const session = await getSessionById(sessionId, schoolId);

    // Prevent modifications to inactive sessions (except promotion)
    if (!session.activeStatus && !session.archived) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify data in an inactive session. Only active sessions allow data modifications.'
      });
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  preventArchivedSessionModification,
  preventInactiveSessionModification
};

