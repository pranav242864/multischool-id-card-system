const mongoose = require('mongoose');
const { 
  createStudent: createStudentService,
  getStudents: getStudentsService,
  updateStudent: updateStudentService,
  deleteStudent: deleteStudentService
} = require('../services/student.service');
const asyncHandler = require('../utils/asyncHandler');

// Create a new student
const createStudent = asyncHandler(async (req, res, next) => {
  const { 
    admissionNo, name, dob, fatherName, motherName,
    mobile, address, aadhaar, photoUrl, classId 
  } = req.body;
  
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;

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
    // Get the session ID from the class
    const Class = require('../models/Class');
    const classObj = await Class.findById(classId);
    if (!classObj) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Verify the class belongs to the user's school
    if (req.user.role !== 'Superadmin' && classObj.schoolId.toString() !== schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Class does not belong to your school'
      });
    }

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
      sessionId: classObj.sessionId, // Get session ID from the class
      schoolId: classObj.schoolId // Get school ID from the class
    };

    const newStudent = await createStudentService(studentData);

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
    
    if (error.message.includes('Cannot create student in a frozen class')) {
      return res.status(400).json({
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

    next(error);
  }
});

// Get all students for a school
const getStudents = asyncHandler(async (req, res, next) => {
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
  const userSchoolId = req.user.schoolId;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID format'
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
    const updatedStudent = await updateStudentService(studentId, updateData, schoolId);

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
    
    if (error.message.includes('Cannot update student in a frozen class')) {
      return res.status(400).json({
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

    next(error);
  }
});

// Delete a student
const deleteStudent = asyncHandler(async (req, res, next) => {
  const { id: studentId } = req.params;
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid student ID format'
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
    const result = await deleteStudentService(studentId, schoolId);

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
    
    if (error.message.includes('Cannot delete student from a frozen class')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

module.exports = {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent
};