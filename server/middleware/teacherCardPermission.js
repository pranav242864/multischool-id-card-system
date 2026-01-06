const Teacher = require('../models/Teacher');
const AllowedLogin = require('../models/AllowedLogin');
const Student = require('../models/Student');

const checkTeacherCardPermission = async (req, res, next) => {
  // Assume requireAuth already ran
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // If not TEACHER, skip this middleware
  if (req.user.role !== 'TEACHER') {
    return next();
  }

  // Reject if schoolId is missing
  if (!req.user.schoolId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: school ID is required'
    });
  }

  // Check allowTeacherCardGeneration permission
  const allowedLogin = await AllowedLogin.findOne({
    schoolId: req.user.schoolId
  });

  if (!allowedLogin || !allowedLogin.allowTeacherCardGeneration) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: teacher card generation is not enabled for your school'
    });
  }

  // Query Teacher using userId
  const teacher = await Teacher.findOne({
    userId: req.user.id
  });

  // Reject if teacher not found
  if (!teacher) {
    return res.status(403).json({
      success: false,
      message: 'Teacher record not found'
    });
  }

  // Reject if teacher status is not ACTIVE
  if (teacher.status !== 'ACTIVE') {
    return res.status(403).json({
      success: false,
      message: 'Your teacher account is inactive'
    });
  }

  // Reject if teacher is not assigned to a class
  if (!teacher.classId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: teacher is not assigned to a class'
    });
  }

  // For student card generation: validate student belongs to teacher's class
  if (req.params.studentId) {
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.classId.toString() !== teacher.classId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: student does not belong to your assigned class'
      });
    }
  }

  // Block bulk generation for teachers
  if (req.path.includes('/bulk') || req.body.studentIds) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: bulk card generation is not allowed for teachers'
    });
  }

  // Attach teacher classId to request
  req.teacherClassId = teacher.classId.toString();
  req.teacher = teacher;

  next();
};

module.exports = checkTeacherCardPermission;
