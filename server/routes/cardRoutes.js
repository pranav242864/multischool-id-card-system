const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { checkTeacherCardPermission } = require('../middleware/teacherCardPermission');
const {
  generateStudentCard,
  generateBulkStudentCards,
  generateTeacherCard
} = require('../controllers/cardController');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/cards/student/:studentId - Generate ID card for a single student
// Teachers can only generate cards for students in their assigned class
router.post(
  '/student/:studentId',
  roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'),
  checkTeacherCardPermission,
  generateStudentCard
);

// POST /api/cards/students/bulk - Generate ID cards for multiple students
// Teachers can only generate cards for students in their assigned class
router.post(
  '/students/bulk',
  roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'),
  checkTeacherCardPermission,
  generateBulkStudentCards
);

// POST /api/cards/teacher/:teacherId - Generate ID card for a teacher
// Teachers can generate their own card if permitted
router.post(
  '/teacher/:teacherId',
  roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'),
  checkTeacherCardPermission,
  generateTeacherCard
);

module.exports = router;

