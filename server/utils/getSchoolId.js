const { isSuperadmin } = require('./roleGuards');

/**
 * Get School ID from Request
 * 
 * Standardized function to get schoolId from req.user context.
 * 
 * Rules:
 * - Superadmin: schoolId is null in req.user, but can specify schoolId in query for filtering
 * - Schooladmin/Teacher: MUST use req.user.schoolId (from JWT token)
 * - NEVER use req.body.schoolId for authentication decisions
 * 
 * @param {Object} req - Express request object
 * @param {Object} options - Options
 * @param {boolean} options.allowQueryForSuperadmin - Allow req.query.schoolId for Superadmin (default: true)
 * @param {boolean} options.requireSchoolId - Require schoolId to be present (default: false)
 * @returns {string|null} - School ID or null
 * @throws {Error} - If schoolId is required but not found
 */
function getSchoolId(req, options = {}) {
  const {
    allowQueryForSuperadmin = true,
    requireSchoolId = false
  } = options;

  // Get user from request (should be set by authMiddleware)
  if (!req.user) {
    throw new Error('User not authenticated. req.user is missing.');
  }

  const { role, schoolId: userSchoolId } = req.user;

  // Superadmin: schoolId is null in JWT, but can specify in query for filtering
  if (isSuperadmin({ role })) {
    if (allowQueryForSuperadmin && req.query.schoolId) {
      // Validate it's a valid ObjectId
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(req.query.schoolId)) {
        throw new Error('Invalid school ID format in query parameter');
      }
      return req.query.schoolId;
    }
    
    // Superadmin without query schoolId
    if (requireSchoolId) {
      throw new Error('School ID is required. As a Superadmin, you must specify the schoolId query parameter (e.g., ?schoolId=...).');
    }
    return null;
  }

  // Non-superadmin users: MUST use req.user.schoolId (from JWT)
  if (!userSchoolId) {
    if (requireSchoolId) {
      throw new Error('School ID is required. User must be assigned to a school.');
    }
    return null;
  }

  // Return the schoolId from JWT token (most secure)
  return userSchoolId.toString();
}

/**
 * Get School ID for operations (create/update/delete)
 * 
 * For Superadmin: requires schoolId in query parameter
 * For others: uses req.user.schoolId
 * 
 * @param {Object} req - Express request object
 * @returns {string} - School ID (never null)
 * @throws {Error} - If schoolId is missing
 */
function getSchoolIdForOperation(req) {
  return getSchoolId(req, {
    allowQueryForSuperadmin: true,
    requireSchoolId: true
  });
}

/**
 * Get School ID for filtering (GET requests)
 * 
 * For Superadmin: can use query parameter or null (to get all)
 * For others: uses req.user.schoolId
 * 
 * @param {Object} req - Express request object
 * @returns {string|null} - School ID or null
 */
function getSchoolIdForFilter(req) {
  return getSchoolId(req, {
    allowQueryForSuperadmin: true,
    requireSchoolId: false
  });
}

module.exports = {
  getSchoolId,
  getSchoolIdForOperation,
  getSchoolIdForFilter
};

