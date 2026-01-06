const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
const activeSessionMiddleware = require('../middleware/activeSessionMiddleware');
const checkTeacherCardPermission = require('../middleware/teacherCardPermission');
const {
  generateStudentCard,
  generateBulkStudentCards,
  generateTeacherCard,
  generateStudentCardPDF,
  generateTeacherCardPDF,
  generateBulkStudentCardsPDF,
  generateStudentCardPdfById,
  generateTeacherCardPdfById,
  generateBulkStudentCardsCombinedPdf
} = require('../controllers/cardController');

const router = express.Router();

// Apply authentication and school scoping to all routes
router.use(authMiddleware);
router.use(schoolScoping);

// POST /api/cards/student/:studentId - Generate ID card for a single student
// Teachers can only generate cards for students in their assigned class
router.post(
  '/student/:studentId',
  requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'),
  activeSessionMiddleware,
  checkTeacherCardPermission,
  generateStudentCard
);

// POST /api/cards/students/bulk - Generate ID cards for multiple students
// Teachers can only generate cards for students in their assigned class
router.post(
  '/students/bulk',
  requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'),
  activeSessionMiddleware,
  checkTeacherCardPermission,
  generateBulkStudentCards
);

// POST /api/cards/teacher/:teacherId - Generate ID card for a teacher
// Teachers can generate their own card if permitted
router.post(
  '/teacher/:teacherId',
  requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'),
  activeSessionMiddleware,
  checkTeacherCardPermission,
  generateTeacherCard
);

// POST /api/cards/pdf/student/:studentId - Generate PDF for a single student's ID card
// Expects validated render-ready card JSON in the request body
router.post(
  '/pdf/student/:studentId',
  requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'),
  activeSessionMiddleware,
  checkTeacherCardPermission,
  generateStudentCardPDF
);

// POST /api/cards/pdf/teacher/:teacherId - Generate PDF for a single teacher's ID card
// Expects validated render-ready card JSON in the request body
router.post(
  '/pdf/teacher/:teacherId',
  requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'),
  activeSessionMiddleware,
  checkTeacherCardPermission,
  generateTeacherCardPDF
);

// POST /api/cards/pdf/students/bulk - Generate PDFs for multiple students and return as ZIP
// Teachers are blocked from bulk operations
router.post(
  '/pdf/students/bulk',
  requireRole('SUPERADMIN', 'SCHOOLADMIN'), // Teachers explicitly blocked
  activeSessionMiddleware,
  generateBulkStudentCardsPDF
);

// GET /api/cards/student/:studentId/pdf - Generate and return PDF for a single student's ID card
// Only SUPERADMIN and SCHOOLADMIN allowed
router.get(
  '/student/:studentId/pdf',
  requireRole('SUPERADMIN', 'SCHOOLADMIN'),
  activeSessionMiddleware,
  generateStudentCardPdfById
);

// GET /api/cards/teacher/:teacherId/pdf - Generate and return PDF for a single teacher's ID card
// Only SUPERADMIN, SCHOOLADMIN, TEACHER allowed; teacher restrictions enforced by middleware
router.get(
  '/teacher/:teacherId/pdf',
  requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'),
  activeSessionMiddleware,
  checkTeacherCardPermission,
  generateTeacherCardPdfById
);

// POST /api/cards/students/bulk/pdf - Generate combined PDF (one page per student)
// Only SUPERADMIN and SCHOOLADMIN allowed
router.post(
  '/students/bulk/pdf',
  requireRole('SUPERADMIN', 'SCHOOLADMIN'),
  activeSessionMiddleware,
  generateBulkStudentCardsCombinedPdf
);

module.exports = router;
