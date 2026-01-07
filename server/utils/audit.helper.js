const { logAuditEvent } = require('../services/auditLog.service');
const { getSchoolIdForOperation } = require('../utils/getSchoolId');

/**
 * Log audit event - helper wrapper
 * Fire-and-forget: Never throws errors, never blocks execution
 * @param {Object} params
 * @param {String} params.action - Action name (e.g. CREATE_STUDENT, DELETE_TEACHER, LOGIN)
 * @param {String} params.entityType - Entity type (STUDENT, TEACHER, NOTICE, TEMPLATE, USER)
 * @param {String} params.entityId - Entity ID (optional)
 * @param {Object} params.req - Express request object (must have req.user)
 * @param {Object} params.metadata - Additional metadata (optional)
 */
async function logAudit({
  action,
  entityType,
  entityId = null,
  req,
  metadata = {}
}) {
  try {
    if (!req || !req.user) {
      return;
    }

    // Extract user information
    const user = {
      id: req.user.id || req.user._id,
      role: req.user.role
    };

    if (!user.id || !user.role) {
      return;
    }

    // Get schoolId
    let schoolId;
    try {
      schoolId = getSchoolIdForOperation(req);
    } catch (error) {
      // If schoolId is not available, skip audit logging
      return;
    }

    // Call the audit log service
    await logAuditEvent({
      action,
      entityType,
      entityId,
      schoolId,
      user,
      req,
      status: 'SUCCESS',
      metadata
    });
  } catch (error) {
    // Never throw - audit logging must not block main flow
    console.error('[AuditHelper] Failed to log audit event:', {
      action,
      entityType,
      error: error.message
    });
  }
}

module.exports = {
  logAudit
};

