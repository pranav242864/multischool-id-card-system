const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const schoolScoping = require('../middleware/schoolScoping');
const requireRole = require('../middleware/requireRole');
const { generateStudentPDF, generateBulkStudentPDF } = require('../controllers/pdf.controller');

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

module.exports = router;

