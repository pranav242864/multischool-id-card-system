const mongoose = require('mongoose');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Template = require('../models/Template');
const { getActiveSession } = require('../utils/sessionUtils');
const { checkClassNotFrozen } = require('../services/class.service');
const asyncHandler = require('../utils/asyncHandler');
const { getSchoolIdForOperation } = require('../utils/getSchoolId');
const { isSuperadmin, isTeacher } = require('../utils/roleGuards');
const User = require('../models/User');

/**
 * Generate ID card for a single student
 * Teachers can only generate cards for students in their assigned class
 */
const generateStudentCard = asyncHandler(async (req, res, next) => {
  const { studentId } = req.params;
  const { templateId } = req.body;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  let effectiveSchoolId;
  try {
    effectiveSchoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  try {
    // Find student - MUST filter by schoolId for security
    // Note: Card generation allows historical sessions (read-only operation)
    const student = await Student.findOne({
      _id: studentId,
      schoolId: effectiveSchoolId // STRICT: Filter by schoolId
    })
      .populate('classId', 'className frozen sessionId')
      .populate('sessionId', 'sessionName activeStatus archived');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Verify student belongs to the school
    if (student.schoolId.toString() !== effectiveSchoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Student does not belong to your school'
      });
    }

    // Allow ID card generation for students from any session (active or historical)
    // This enables generating cards for historical records
    // Validate that the session belongs to the school
    // Use getSessionById service function instead of direct Session query
    const { getSessionById } = require('../services/session.service');
    const studentSession = await getSessionById(student.sessionId._id, effectiveSchoolId);
    
    // For historical sessions, we still allow card generation (read-only operation)
    // Archived sessions are read-only but card generation is allowed

    // For Teacher role: Verify student is in teacher's assigned class
    if (isTeacher(req.user)) {
      if (!req.teacher || !req.teacher.classId) {
        return res.status(403).json({
          success: false,
          message: 'You must be assigned to a class to generate ID cards'
        });
      }

      if (student.classId._id.toString() !== req.teacher.classId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only generate ID cards for students in your assigned class'
        });
      }

      // Verify class is not frozen (teachers cannot generate cards for frozen classes in active sessions)
      // Allow frozen classes for historical sessions (read-only)
      if (student.classId.frozen && studentSession.activeStatus) {
        return res.status(400).json({
          success: false,
          message: 'Cannot generate ID card for student in a frozen class in active session'
        });
      }
    }

    // Verify class belongs to the student's session
      if (student.classId.sessionId.toString() !== student.sessionId._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Student class does not belong to the student\'s session'
        });
      }

    // Get template (use provided templateId or active template)
    let template;
    if (templateId) {
      template = await Template.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }
      // Verify template belongs to school (for non-superadmin)
      if (!isSuperadmin(req.user) && template.schoolId.toString() !== effectiveSchoolId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Template does not belong to your school'
        });
      }
    } else {
      // Get active template for student type
      template = await Template.findOne({
        type: 'student',
        schoolId: effectiveSchoolId
      }).sort({ createdAt: -1 });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'No active template found for student ID cards'
        });
      }
    }

    // TODO: Implement actual PDF generation using pdf-lib or Puppeteer
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'ID card generation initiated',
      data: {
        studentId: student._id,
        studentName: student.name,
        classId: student.classId._id,
        className: student.classId.className,
        templateId: template._id,
        templateName: template.name || 'Default Template',
        // In production, this would return the PDF buffer or URL
        cardUrl: null // Placeholder for generated card URL
      }
    });
  } catch (error) {
    if (error.message.includes('No active session found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * Generate ID cards for multiple students (bulk)
 * Teachers can only generate cards for students in their assigned class
 */
const generateBulkStudentCards = asyncHandler(async (req, res, next) => {
  const { studentIds, classId, templateId } = req.body;

  // Validate input
  if (!studentIds && !classId) {
    return res.status(400).json({
      success: false,
      message: 'Either studentIds array or classId is required'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  let effectiveSchoolId;
  try {
    effectiveSchoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  try {
    // Always use active session for bulk generation
    // Historical session access is only available via single student card generation
    const activeSession = await getActiveSession(effectiveSchoolId);

    // Build query - strictly use active session for bulk operations
    const query = {
      schoolId: effectiveSchoolId,
      sessionId: activeSession._id // Always use active session for bulk operations
    };

    // For Teacher role: Restrict to assigned class
    if (isTeacher(req.user)) {
      if (!req.teacher || !req.teacher.classId) {
        return res.status(403).json({
          success: false,
          message: 'You must be assigned to a class to generate ID cards'
        });
      }
      query.classId = req.teacher.classId;
    } else if (classId) {
      // For Superadmin/Schooladmin: Validate class belongs to school and target session
      const classObj = await Class.findById(classId);
      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }
      if (classObj.schoolId.toString() !== effectiveSchoolId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Class does not belong to your school'
        });
      }
      // Verify class belongs to active session
      if (classObj.sessionId.toString() !== activeSession._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Class does not belong to the active session'
        });
      }
      // Check if class is frozen (for active sessions)
      if (classObj.frozen) {
        return res.status(400).json({
          success: false,
          message: 'Cannot generate ID cards for students in a frozen class'
        });
      }
      query.classId = classId;
    } else if (studentIds && Array.isArray(studentIds)) {
      // If specific student IDs provided, validate they belong to active session
      // SECURITY: Always filter by active session for session scoping
      query._id = { $in: studentIds };
      // sessionId is already set above for bulk operations (activeSession._id)
    }

    // SECURITY: Ensure query always includes sessionId filter for active session
    // All student queries must filter by sessionId to enforce session scoping
    // This ensures no student appears in multiple sessions in query results
    if (!query.sessionId) {
      query.sessionId = activeSession._id;
    }

    // Find students - MUST filter by active session
    const students = await Student.find(query)
      .populate('classId', 'className frozen sessionId')
      .populate('sessionId', 'sessionName activeStatus');

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found matching the criteria'
      });
    }

    // For Teacher role: Additional validation for each student
    if (isTeacher(req.user)) {
      for (const student of students) {
        if (student.classId._id.toString() !== req.teacher.classId.toString()) {
          return res.status(403).json({
            success: false,
            message: `Student ${student.name} does not belong to your assigned class`
          });
        }
        if (student.classId.frozen) {
          return res.status(400).json({
            success: false,
            message: `Cannot generate ID card for student in a frozen class: ${student.classId.className}`
          });
        }
      }
    }

    // Get template
    let template;
    if (templateId) {
      template = await Template.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }
      if (!isSuperadmin(req.user) && template.schoolId.toString() !== effectiveSchoolId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Template does not belong to your school'
        });
      }
    } else {
      template = await Template.findOne({
        type: 'student',
        schoolId: effectiveSchoolId
      }).sort({ createdAt: -1 });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'No active template found for student ID cards'
        });
      }
    }

    // TODO: Implement actual bulk PDF generation
    res.status(200).json({
      success: true,
      message: `Bulk ID card generation initiated for ${students.length} student(s)`,
      data: {
        count: students.length,
        studentIds: students.map(s => s._id),
        classId: classId || (students[0]?.classId?._id),
        templateId: template._id,
        templateName: template.name || 'Default Template'
      }
    });
  } catch (error) {
    if (error.message.includes('No active session found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * Generate ID card for a teacher
 * Teachers can generate their own card if permitted
 */
const generateTeacherCard = asyncHandler(async (req, res, next) => {
  const { teacherId } = req.params;
  const { templateId } = req.body;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid teacher ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  let effectiveSchoolId;
  try {
    effectiveSchoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  try {
    // Find teacher
    const teacher = await Teacher.findById(teacherId)
      .populate('classId', 'className frozen sessionId')
      .populate('schoolId', 'name');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Verify teacher belongs to the school
    if (teacher.schoolId._id.toString() !== effectiveSchoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Teacher does not belong to your school'
      });
    }

    // For Teacher role: Can only generate their own card
    if (isTeacher(req.user)) {
      const user = await User.findById(req.user.id);
      if (!user || user.email !== teacher.email) {
        return res.status(403).json({
          success: false,
          message: 'You can only generate your own ID card'
        });
      }
    }

    // Get template
    let template;
    if (templateId) {
      template = await Template.findById(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }
      if (!isSuperadmin(req.user) && template.schoolId.toString() !== effectiveSchoolId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Template does not belong to your school'
        });
      }
    } else {
      template = await Template.findOne({
        type: 'teacher',
        schoolId: effectiveSchoolId
      }).sort({ createdAt: -1 });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'No active template found for teacher ID cards'
        });
      }
    }

    // TODO: Implement actual PDF generation
    res.status(200).json({
      success: true,
      message: 'Teacher ID card generation initiated',
      data: {
        teacherId: teacher._id,
        teacherName: teacher.name,
        templateId: template._id,
        templateName: template.name || 'Default Template',
        cardUrl: null // Placeholder
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  generateStudentCard,
  generateBulkStudentCards,
  generateTeacherCard
};

