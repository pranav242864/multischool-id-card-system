const mongoose = require('mongoose');
const { 
  createTeacher: createTeacherService,
  getTeachers: getTeachersService,
  updateTeacher: updateTeacherService,
  deleteTeacher: deleteTeacherService
} = require('../services/teacher.service');
const asyncHandler = require('../utils/asyncHandler');

// Create a new teacher
const createTeacher = asyncHandler(async (req, res, next) => {
  const { name, mobile, email, photoUrl, classId } = req.body;
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;

  // Validate required fields
  if (!name || !mobile || !email) {
    return res.status(400).json({
      success: false,
      message: 'Name, mobile, and email are required'
    });
  }

  // Validate ObjectId format for classId if provided
  if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid class ID format'
    });
  }

  // Validate ObjectId format if not superadmin
  if (req.user.role !== 'Superadmin' && !userSchoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required for non-superadmin users'
    });
  }

  // Use the user's schoolId for non-superadmin users, or allow schoolId in body for superadmin
  const schoolId = req.user.role === 'Superadmin' ? req.body.schoolId : userSchoolId;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }

  try {
    const teacherData = {
      name,
      mobile,
      email,
      photoUrl,
      classId: classId || null, // Allow null classId
      schoolId
    };

    const newTeacher = await createTeacherService(teacherData);

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: newTeacher
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
    
    if (error.message.includes('Cannot assign teacher to a class in an inactive session')) {
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
    
    if (error.message.includes('Email already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Get all teachers for a school
const getTeachers = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;
  const { classId, page = 1, limit = 10 } = req.query;

  // Validate ObjectId format for classId if provided
  if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid class ID format'
    });
  }

  // Determine schoolId based on user role
  let schoolId;
  if (req.user.role === 'Superadmin') {
    // For superadmin, allow filtering by schoolId in query
    schoolId = req.query.schoolId || userSchoolId;
  } else {
    schoolId = userSchoolId;
  }

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }

  try {
    // For Teacher role, only return the current user's profile
    if (req.user.role === 'Teacher') {
      // Find the teacher profile that matches the user's school and email
      const teacher = await require('../models/Teacher').findOne({
        schoolId: schoolId,
        email: req.user.email // Assuming user email matches teacher email
      }).populate('classId', 'className frozen sessionId')
        .populate('schoolId', 'name');

      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: [teacher],
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          pages: 1
        }
      });
    } else {
      // For Superadmin and Schooladmin, return all teachers for the school
      const result = await getTeachersService(schoolId, classId, parseInt(page), parseInt(limit));

      res.status(200).json({
        success: true,
        data: result.teachers,
        pagination: result.pagination
      });
    }
  } catch (error) {
    next(error);
  }
});

// Update a teacher
const updateTeacher = asyncHandler(async (req, res, next) => {
  const { id: teacherId } = req.params;
  const updateData = req.body;
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid teacher ID format'
    });
  }

  // Determine schoolId based on user role
  const schoolId = req.user.role === 'Superadmin' ? req.body.schoolId : userSchoolId;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }

  // Check if the user is trying to update their own profile as a Teacher
  if (req.user.role === 'Teacher') {
    // For Teacher role, only allow updating their own profile
    const teacher = await require('../models/Teacher').findById(teacherId);
    if (!teacher || teacher.schoolId.toString() !== schoolId.toString() || teacher.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }
  }

  try {
    const updatedTeacher = await updateTeacherService(teacherId, updateData, schoolId);

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
    
    if (error.message.includes('A teacher is already assigned to this class')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Delete a teacher
const deleteTeacher = asyncHandler(async (req, res, next) => {
  const { id: teacherId } = req.params;
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid teacher ID format'
    });
  }

  // Determine schoolId based on user role
  const schoolId = req.user.role === 'Superadmin' ? req.body.schoolId : userSchoolId;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
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