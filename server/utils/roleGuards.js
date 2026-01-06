/**
 * Role Guard Helpers
 * 
 * Reusable functions to check user roles without hardcoding role strings.
 * Use these helpers instead of direct role comparisons in controllers.
 * 
 * Usage:
 *   const { isSuperadmin, isSchooladmin, isTeacher } = require('../utils/roleGuards');
 *   
 *   if (isSuperadmin(req.user)) { ... }
 *   if (isTeacher(req.user)) { ... }
 */

/**
 * Check if user is Superadmin
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
function isSuperadmin(user) {
  if (!user || !user.role) {
    return false;
  }
  // Handle both 'SUPERADMIN' (uppercase) and 'Superadmin' (mixed case) for compatibility
  return user.role.toUpperCase() === 'SUPERADMIN';
}

/**
 * Check if user is Schooladmin
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
function isSchooladmin(user) {
  if (!user || !user.role) {
    return false;
  }
  return user.role === 'Schooladmin';
}

/**
 * Check if user is Teacher
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
function isTeacher(user) {
  if (!user || !user.role) {
    return false;
  }
  return user.role === 'Teacher';
}

/**
 * Check if user is admin (Superadmin or Schooladmin)
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
function isAdmin(user) {
  return isSuperadmin(user) || isSchooladmin(user);
}

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object from req.user
 * @param {string[]} roles - Array of role names to check
 * @returns {boolean}
 */
function hasRole(user, ...roles) {
  if (!user || !user.role) {
    return false;
  }
  return roles.includes(user.role);
}

/**
 * Check if user has schoolId (not Superadmin)
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
function hasSchoolId(user) {
  if (!user) {
    return false;
  }
  return user.schoolId !== null && user.schoolId !== undefined;
}

/**
 * Require user to be Superadmin (throws error if not)
 * @param {Object} user - User object from req.user
 * @throws {Error} If user is not Superadmin
 */
function requireSuperadmin(user) {
  if (!isSuperadmin(user)) {
    throw new Error('Superadmin access required');
  }
}

/**
 * Require user to be Admin (Superadmin or Schooladmin) (throws error if not)
 * @param {Object} user - User object from req.user
 * @throws {Error} If user is not Admin
 */
function requireAdmin(user) {
  if (!isAdmin(user)) {
    throw new Error('Admin access required');
  }
}

/**
 * Require user to have schoolId (throws error if Superadmin)
 * @param {Object} user - User object from req.user
 * @throws {Error} If user is Superadmin (no schoolId)
 */
function requireSchoolId(user) {
  if (!hasSchoolId(user)) {
    throw new Error('School ID is required. This operation is not available for Superadmin.');
  }
}

module.exports = {
  isSuperadmin,
  isSchooladmin,
  isTeacher,
  isAdmin,
  hasRole,
  hasSchoolId,
  requireSuperadmin,
  requireAdmin,
  requireSchoolId
};


