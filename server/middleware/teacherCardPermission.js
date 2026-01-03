const AllowedLogin = require('../models/AllowedLogin');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { isTeacher } = require('../utils/roleGuards');
const { getSchoolIdForOperation } = require('../utils/getSchoolId');

/**
 * Middleware to check if teacher has permission to generate ID cards
 * Teachers can only generate cards if:
 * 1. allowTeacherCardGeneration is enabled for their school
 * 2. They are assigned to a class
 * 3. They are active
 * 
 * Note: Teachers always have schoolId from JWT token (never null)
 */
const checkTeacherCardPermission = async (req, res, next) => {
  // Only apply to Teacher role
  if (!isTeacher(req.user)) {
    return next();
  }

  try {
    // Get schoolId using standardized utility
    // For teachers, this will always return req.user.schoolId (never null)
    let schoolId;
    try {
      schoolId = getSchoolIdForOperation(req);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Check if card generation is allowed for teachers in this school
    const allowedLogin = await AllowedLogin.findOne({ schoolId });
    
    if (!allowedLogin || !allowedLogin.allowTeacherCardGeneration) {
      return res.status(403).json({
        success: false,
        message: 'ID card generation is not permitted for teachers in your school'
      });
    }

    // Get user's email to find Teacher record
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find teacher record
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

    // Verify teacher is assigned to a class
    if (!teacher.classId) {
      return res.status(403).json({
        success: false,
        message: 'You must be assigned to a class to generate ID cards'
      });
    }

    // Attach teacher info to request for use in controllers
    req.teacher = {
      id: teacher._id,
      classId: teacher.classId,
      schoolId: teacher.schoolId
    };

    next();
  } catch (error) {
    console.error('Teacher card permission check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking card generation permissions'
    });
  }
};

module.exports = {
  checkTeacherCardPermission
};

