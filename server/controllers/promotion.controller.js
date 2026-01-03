const mongoose = require('mongoose');
const { promoteStudents, getStudentsBySession } = require('../services/promotion.service');
const asyncHandler = require('../utils/asyncHandler');
const { getSchoolIdForOperation, getSchoolIdForFilter } = require('../utils/getSchoolId');

// Promote students from one session to another
const promoteStudentsToSession = asyncHandler(async (req, res, next) => {
  const { sourceSessionId, targetSessionId, studentIds, targetClassId, preserveAdmissionNumbers } = req.body;

  // Validate required fields
  if (!sourceSessionId || !targetSessionId) {
    return res.status(400).json({
      success: false,
      message: 'Source session ID and target session ID are required'
    });
  }

  // Validate ObjectId formats
  if (!mongoose.Types.ObjectId.isValid(sourceSessionId) || !mongoose.Types.ObjectId.isValid(targetSessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

  if (targetClassId && !mongoose.Types.ObjectId.isValid(targetClassId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid target class ID format'
    });
  }

  // Validate studentIds if provided
  if (studentIds && (!Array.isArray(studentIds) || studentIds.length === 0)) {
    return res.status(400).json({
      success: false,
      message: 'Student IDs must be a non-empty array'
    });
  }

  // Get schoolId from req.user context (standardized)
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

  try {
    const result = await promoteStudents(
      sourceSessionId,
      targetSessionId,
      studentIds,
      schoolId,
      {
        preserveAdmissionNumbers: preserveAdmissionNumbers || false,
        targetClassId: targetClassId || null
      }
    );

    res.status(200).json({
      success: true,
      message: `Successfully promoted ${result.promotedCount} out of ${result.totalCount} student(s)`,
      data: {
        promotedCount: result.promotedCount,
        totalCount: result.totalCount,
        promotedStudents: result.promotedStudents,
        errors: result.errors
      }
    });
  } catch (error) {
    if (error.message.includes('Session not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('does not belong to your school')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot promote students from an active session')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Target session must be active')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot promote students from an archived session')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // ENFORCE: Frozen classes cannot have students modified
    if (error.message.includes('frozen class')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('No students found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Get students from a specific session (for historical viewing)
const getSessionStudents = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;
  const { classId, page = 1, limit = 10 } = req.query;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

  if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid class ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin can use query parameter for filtering, others use req.user.schoolId
  let schoolId;
  try {
    schoolId = getSchoolIdForFilter(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  try {
    const result = await getStudentsBySession(
      sessionId,
      schoolId,
      classId,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: {
        students: result.students,
        session: result.session,
        pagination: result.pagination
      }
    });
  } catch (error) {
    if (error.message.includes('Session not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('does not belong to your school')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('does not belong to the specified session')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

module.exports = {
  promoteStudentsToSession,
  getSessionStudents
};

