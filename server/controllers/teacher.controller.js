const mongoose = require('mongoose');
const { 
  createTeacher: createTeacherService,
  getTeachers: getTeachersService,
  updateTeacher: updateTeacherService,
  deleteTeacher: deleteTeacherService
} = require('../services/teacher.service');
const asyncHandler = require('../utils/asyncHandler');
const { getSchoolIdForOperation, getSchoolIdForFilter } = require('../utils/getSchoolId');
const { isTeacher } = require('../utils/roleGuards');

// Create a new teacher
const createTeacher = asyncHandler(async (req, res, next) => {
  const { name, mobile, email, photoUrl, classId, userId } = req.body;
  const authenticatedUserId = req.user.id;

  // SECURITY: Reject any attempt to set schoolId in request body
  // schoolId must come from req.user only (enforced by middleware, but double-check here)
  if (req.body.schoolId !== undefined) {
    return res.status(403).json({
      success: false,
      message: 'Cannot set schoolId in request body. School ID is determined from your authentication token.'
    });
  }

  // Validate required fields
  if (!name || !mobile || !email) {
    return res.status(400).json({
      success: false,
      message: 'Name, mobile, and email are required'
    });
  }

  // Validate userId (required to link Teacher to existing User)
  if (!userId) {
    console.error('Teacher creation failed: missing userId in request body', {
      email,
      name
    });
    return res.status(400).json({
      success: false,
      message: 'userId is required to create a teacher'
    });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error('Teacher creation failed: invalid userId format', {
      userId
    });
    return res.status(400).json({
      success: false,
      message: 'Invalid userId format'
    });
  }

  // Validate ObjectId format for classId if provided
  if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
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
    const teacherData = {
      name,
      mobile,
      email,
      photoUrl,
      classId: classId || null, // Allow null classId
      schoolId,
      userId
    };

    const newTeacher = await createTeacherService(teacherData);

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: newTeacher
    });
  } catch (error) {
    console.error('Teacher creation error:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
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
    
    if (error.message.includes('No active session found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot assign teacher to a class from an inactive session')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('A teacher is already assigned to this class')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('already assigned to a class in the active session')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Email already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    // Handle MongoDB duplicate key error (database-level enforcement)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      // Check if it's the classId uniqueness constraint
      if (error.keyPattern && error.keyPattern.classId) {
        return res.status(409).json({
          success: false,
          message: 'A teacher is already assigned to this class. Only one teacher per class is allowed.'
        });
      }
      // Could be email uniqueness, but that's handled above
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry detected. Please check your input.'
      });
    }

    next(error);
  }
});

// Get all teachers for a school
const getTeachers = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { classId, page = 1, limit = 10 } = req.query;

  // Validate ObjectId format for classId if provided
  if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid class ID format'
    });
  }

  // Use schoolId from schoolScoping middleware
  const schoolId = req.schoolId;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required for this operation'
    });
  }

  try {
    const filterObject = { schoolId: req.schoolId };

    console.log({
      role: req.user.role,
      finalFilter: filterObject
    });

    // Service layer handles ownership validation for teachers
    // For Teacher role, service will only return their own profile
    const result = await getTeachersService(schoolId, classId, parseInt(page), parseInt(limit), req.user.role, req.user.email);

      res.status(200).json({
        success: true,
        data: result.teachers,
        pagination: result.pagination
      });
  } catch (error) {
    next(error);
  }
});

// Update a teacher
const updateTeacher = asyncHandler(async (req, res, next) => {
  const { id: teacherId } = req.params;
  const updateData = req.body;
  const userId = req.user.id;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid teacher ID format'
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

  // For Teacher role: Add controller-level ownership validation (defense-in-depth)
  if (isTeacher(req.user)) {
    const User = require('../models/User');
    const Teacher = require('../models/Teacher');
    
    // Get user's email to find Teacher record
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find teacher record by email
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Verify teacher is updating their own profile (matched by email)
    if (teacher.email !== user.email) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile. Access to other teachers\' profiles is not permitted.'
      });
    }

    // Teachers cannot change their class assignment
    if (updateData.classId && teacher.classId && updateData.classId.toString() !== teacher.classId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your class assignment. Only administrators can assign teachers to classes.'
      });
    }
  }

  // Ownership validation is also handled in the service layer
  // The controller passes user role and email for strict validation
  try {
    const updatedTeacher = await updateTeacherService(teacherId, updateData, schoolId, req.user.role, req.user.email);

    res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      data: updatedTeacher
    });
  } catch (error) {
    if (error.message.includes('Teacher not found')) {
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
    
    if (error.message.includes('Email already exists')) {
      return res.status(409).json({
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
    
    if (error.message.includes('Cannot assign teacher to a class from an inactive session')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot modify teacher assigned to a class from an inactive session')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('A teacher is already assigned to this class')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('already assigned to a class in the active session')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('You can only access your own profile')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('You cannot change your class assignment')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    // Handle MongoDB duplicate key error (database-level enforcement)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      // Check if it's the classId uniqueness constraint
      if (error.keyPattern && error.keyPattern.classId) {
        return res.status(409).json({
          success: false,
          message: 'A teacher is already assigned to this class. Only one teacher per class is allowed.'
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry detected. Please check your input.'
      });
    }

    next(error);
  }
});

// Delete a teacher
const deleteTeacher = asyncHandler(async (req, res, next) => {
  const { id: teacherId } = req.params;
  const userId = req.user.id;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid teacher ID format'
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
    const result = await deleteTeacherService(teacherId, schoolId);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    if (error.message.includes('Teacher not found')) {
      return res.status(404).json({
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
    
    if (error.message.includes('Cannot deactivate teacher assigned to a class from an inactive session')) {
      return res.status(400).json({
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

    next(error);
  }
});

module.exports = {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher
};