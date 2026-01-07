const mongoose = require('mongoose');
const { 
  createStudent: createStudentService,
  getStudents: getStudentsService,
  updateStudent: updateStudentService,
  deleteStudent: deleteStudentService
} = require('../services/student.service');
const asyncHandler = require('../utils/asyncHandler');
const { getSchoolIdForOperation, getSchoolIdForFilter } = require('../utils/getSchoolId');
const { isSuperadmin, isTeacher } = require('../utils/roleGuards');
const { logAudit } = require('../utils/audit.helper');
const User = require('../models/User');
const Teacher = require('../models/Teacher');

// Create a new student
const createStudent = asyncHandler(async (req, res, next) => {
  const { 
    admissionNo, name, dob, fatherName, motherName,
    mobile, address, aadhaar, photoUrl, classId 
  } = req.body;
  
  const userId = req.user.id;

  // SECURITY: Reject any attempt to set schoolId in request body
  // schoolId must come from req.user only (enforced by middleware, but double-check here)
  if (req.body.schoolId !== undefined) {
    return res.status(403).json({
      success: false,
      message: 'Cannot set schoolId in request body. School ID is determined from your authentication token.'
    });
  }

  // Validate required fields
  if (!admissionNo || !name || !dob || !fatherName || !motherName || !mobile || !address || !classId) {
    return res.status(400).json({
      success: false,
      message: 'Admission number, name, date of birth, father name, mother name, mobile, address, and class ID are required'
    });
  }

  // Validate ObjectId format for classId
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid class ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  // Non-Superadmin: schoolId comes from JWT token only
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
    // Verify the class exists and belongs to the user's school
    const Class = require('../models/Class');
    const classObj = await Class.findById(classId);
    if (!classObj) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Verify the class belongs to the user's school
    if (!isSuperadmin(req.user) && classObj.schoolId.toString() !== schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Class does not belong to your school'
      });
    }

    // For Teacher role: Verify teacher is assigned to this class
    if (isTeacher(req.user)) {
      // Get user's email to find Teacher record
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Find teacher record by email
      const teacher = await Teacher.findOne({
        email: user.email,
        schoolId: schoolId
      });

      if (!teacher) {
        return res.status(403).json({
          success: false,
          message: 'Teacher record not found'
        });
      }

      // Verify teacher is assigned to the class
      if (!teacher.classId || teacher.classId.toString() !== classId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only create students in your assigned class'
        });
      }

      // Verify teacher is active
      if (teacher.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Your teacher account is inactive'
        });
      }

      // ENFORCE: Frozen classes cannot have students added
      // Check if class is frozen - teachers cannot create students in frozen classes
      if (classObj.frozen) {
        return res.status(403).json({
          success: false,
          message: 'Cannot create student in a frozen class. Frozen classes cannot be modified.'
        });
      }
    }

    // For all roles (including Schooladmin): Check if class is frozen before creating
    // Service layer also validates, but this provides early feedback
    // ENFORCE: Frozen classes cannot have students added
    if (classObj.frozen) {
      return res.status(403).json({
        success: false,
        message: 'Cannot create student in a frozen class. Frozen classes cannot be modified.'
      });
    }

    // sessionId will be automatically set by the service to the active session
    const studentData = {
      admissionNo,
      name,
      dob: new Date(dob),
      fatherName,
      motherName,
      mobile,
      address,
      aadhaar,
      photoUrl,
      classId,
      schoolId: classObj.schoolId // Get school ID from the class
    };

    const newStudent = await createStudentService(studentData);

    // Audit log: student created
    await logAudit({
      action: 'CREATE_STUDENT',
      entityType: 'STUDENT',
      entityId: newStudent._id,
      req,
      metadata: {}
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: newStudent
    });
  } catch (error) {
    // Handle specific service errors
    if (error.message.includes('Class not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Session not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot create student in an inactive session')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // ENFORCE: Frozen classes cannot have students added
    if (error.message.includes('Cannot create student in a frozen class')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Admission number already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    // Handle MongoDB duplicate key error (database-level enforcement)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      return res.status(409).json({
        success: false,
        message: 'Admission number already exists for this school in the active session'
      });
    }

    next(error);
  }
});

// Get all students for a school
const getStudents = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { classId, page = 1, limit = 10 } = req.query;

  // Validate ObjectId format for classId if provided
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
    // For Teacher role: Restrict to their assigned class
    if (isTeacher(req.user)) {
      // Get user's email to find Teacher record
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Find teacher record by email
      const teacher = await Teacher.findOne({
        email: user.email,
        schoolId: schoolId
      });

      if (!teacher || !teacher.classId) {
        // Teacher not assigned to any class, return empty result
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }

      // Override classId query parameter to force teacher's assigned class
      classId = teacher.classId.toString();
    }

    const result = await getStudentsService(schoolId, classId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.students,
      pagination: result.pagination
    });
  } catch (error) {
    if (error.message.includes('Class does not belong to your school')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
});

// Update a student
const updateStudent = asyncHandler(async (req, res, next) => {
  const { id: studentId } = req.params;
  const updateData = req.body;
  const userId = req.user.id;

  // SECURITY: Reject any attempt to change schoolId in update
  // schoolId cannot be changed - it's determined from authentication
  if (updateData.schoolId !== undefined) {
    return res.status(403).json({
      success: false,
      message: 'Cannot change schoolId. School ID is determined from your authentication token and cannot be modified.'
    });
  }

  // SECURITY: Reject any attempt to change sessionId in update
  // sessionId cannot be changed - students belong to exactly one session
  // Promotion creates new records instead of modifying existing ones
  if (updateData.sessionId !== undefined) {
    return res.status(403).json({
      success: false,
      message: 'Cannot change sessionId. Students belong to exactly one session. Use promotion service to move students between sessions.'
    });
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  // Non-Superadmin: schoolId comes from JWT token only
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
    // For Teacher role: Verify teacher is assigned to the student's class
    if (isTeacher(req.user)) {
      // Get user's email to find Teacher record
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Find teacher record by email
      const teacher = await Teacher.findOne({
        email: user.email,
        schoolId: schoolId
      });

      if (!teacher) {
        return res.status(403).json({
          success: false,
          message: 'Teacher record not found'
        });
      }

      // Verify teacher is active
      if (teacher.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Your teacher account is inactive'
        });
      }

      // Get the student to check their current class
      const Student = require('../models/Student');
      // SECURITY: Filter by schoolId and sessionId for strict scoping
      // Get active session to ensure we're only accessing active session students
      const { getActiveSession } = require('../utils/sessionUtils');
      const activeSession = await getActiveSession(schoolId);
      
      const student = await Student.findOne({
        _id: studentId,
        schoolId: schoolId, // STRICT: Filter by schoolId
        sessionId: activeSession._id // STRICT: Filter by active session
      });
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Verify teacher is assigned to the student's current class
      if (!teacher.classId || teacher.classId.toString() !== student.classId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update students in your assigned class'
        });
      }

      // ENFORCE: Frozen classes cannot have students updated
      // Check if student's current class is frozen - teachers cannot update students in frozen classes
      const Class = require('../models/Class');
      const studentClass = await Class.findById(student.classId);
      if (studentClass && studentClass.frozen) {
        return res.status(403).json({
          success: false,
          message: 'Cannot update student in a frozen class. Frozen classes cannot be modified.'
        });
      }

      // If classId is being updated, verify teacher is assigned to the new class
      if (updateData.classId && updateData.classId.toString() !== student.classId.toString()) {
        if (!teacher.classId || teacher.classId.toString() !== updateData.classId.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only assign students to your assigned class'
          });
        }

        // ENFORCE: Cannot assign student to frozen class
        // Check if new class is frozen
        const newClass = await Class.findById(updateData.classId);
        if (newClass && newClass.frozen) {
          return res.status(403).json({
            success: false,
            message: 'Cannot assign student to a frozen class. Frozen classes cannot be modified.'
          });
        }
      }
    } else {
      // ENFORCE: Frozen classes cannot have students updated
      // For Schooladmin and Superadmin: Check if class is frozen before updating
      // Service layer also validates, but this provides early feedback
      // First, get the student to find their classId
      const Student = require('../models/Student');
      const student = await Student.findOne({
        _id: studentId,
        schoolId: schoolId
      });
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
      
      const Class = require('../models/Class');
      const studentClass = await Class.findById(student.classId);
      if (studentClass && studentClass.frozen) {
        return res.status(403).json({
          success: false,
          message: 'Cannot update student in a frozen class. Frozen classes cannot be modified.'
        });
      }

      // ENFORCE: Cannot assign student to frozen class
      // If classId is being updated, check if new class is frozen
      if (updateData.classId && updateData.classId.toString() !== student.classId.toString()) {
        const newClass = await Class.findById(updateData.classId);
        if (newClass && newClass.frozen) {
          return res.status(403).json({
            success: false,
            message: 'Cannot assign student to a frozen class. Frozen classes cannot be modified.'
          });
        }
      }
    }

    const updatedStudent = await updateStudentService(studentId, updateData, schoolId, req.user.role);

    // Audit log: student updated
    await logAudit({
      action: 'UPDATE_STUDENT',
      entityType: 'STUDENT',
      entityId: studentId,
      req,
      metadata: {}
    });

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    if (error.message.includes('Student not found')) {
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
    
    if (error.message.includes('No active session found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot modify student from an inactive session')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // ENFORCE: Frozen classes cannot have students updated
    if (error.message.includes('Cannot update student in a frozen class')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Admission number already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    // Handle MongoDB duplicate key error (database-level enforcement)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      return res.status(409).json({
        success: false,
        message: 'Admission number already exists for this school in the active session'
      });
    }

    next(error);
  }
});

// Delete a student
const deleteStudent = asyncHandler(async (req, res, next) => {
  const { id: studentId } = req.params;
  const userId = req.user.id;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID format'
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
    const result = await deleteStudentService(studentId, schoolId);

    // Audit log: student deleted
    await logAudit({
      action: 'DELETE_STUDENT',
      entityType: 'STUDENT',
      entityId: studentId,
      req,
      metadata: {}
    });

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    if (error.message.includes('Student not found')) {
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
    
    // ENFORCE: Frozen classes cannot have students removed
    if (error.message.includes('Cannot delete student from a frozen class')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Bulk delete students
const bulkDeleteStudents = asyncHandler(async (req, res, next) => {
  const { ids } = req.body;

  // Validate ids is a non-empty array
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'ids must be a non-empty array'
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

  const results = {
    total: ids.length,
    success: 0,
    failed: 0,
    errors: []
  };

  // Process each deletion
  for (let i = 0; i < ids.length; i++) {
    const studentId = ids[i];
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      results.failed++;
      results.errors.push({
        id: studentId,
        error: 'Invalid student ID format'
      });
      continue;
    }

    try {
      await deleteStudentService(studentId, schoolId);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        id: studentId,
        error: error.message || 'Failed to delete student'
      });
    }
  }

  // Audit log: bulk delete students
  await logAudit({
    action: 'BULK_DELETE_STUDENTS',
    entityType: 'STUDENT',
    entityId: null,
    req,
    metadata: { count: ids.length }
  });

  // Return response matching bulk import format
  res.status(200).json({
    success: true,
    message: `Bulk delete completed: ${results.success} successful, ${results.failed} failed`,
    results: results
  });
});

module.exports = {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents
};