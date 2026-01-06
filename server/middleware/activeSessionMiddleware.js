const Session = require('../models/Session');
const { getSchoolIdForFilter } = require('../utils/getSchoolId');

const requireActiveSession = async (req, res, next) => {
  // Require req.user to exist
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Resolve schoolId
  let schoolId;
  try {
    schoolId = getSchoolIdForFilter(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // SUPERADMIN bypass - no active session required if schoolId is null
  if (!schoolId) {
    return next();
  }

  // Fetch active session for the school
  const activeSession = await Session.findOne({
    schoolId: schoolId,
    activeStatus: true
  });

  // Reject if no active session exists
  if (!activeSession) {
    return res.status(403).json({
      success: false,
      message: 'No active session found for this school'
    });
  }

  // Reject if active session is archived
  if (activeSession.archived) {
    return res.status(403).json({
      success: false,
      message: 'The active session is archived and cannot be used for data operations'
    });
  }

  // Attach req.activeSession
  req.activeSession = activeSession;

  next();
};

module.exports = requireActiveSession;
