const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const schoolScoping = require('../middleware/schoolScoping');
const requireRole = require('../middleware/requireRole');
const { generateStudentPDF, generateBulkStudentPDF, generateBulkTeacherPDF } = require('../controllers/pdf.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(schoolScoping);

router.get(
  '/students/:studentId',
  requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'),
  generateStudentPDF
);

router.post(
  '/students/bulk',
  requireRole('SUPERADMIN', 'SCHOOLADMIN'),
  generateBulkStudentPDF
);

router.post(
  '/teachers/bulk',
  requireRole('SUPERADMIN', 'SCHOOLADMIN'),
  generateBulkTeacherPDF
);

module.exports = router;

