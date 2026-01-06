const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
const { 
  createTeacher, 
  getTeachers, 
  updateTeacher, 
  deleteTeacher 
} = require('../controllers/teacher.controller');

const router = express.Router();

// Apply authentication and school scoping to all routes
router.use(authMiddleware);
router.use(schoolScoping);

// POST /api/v1/teachers - Create a teacher
router.post('/', requireRole('SUPERADMIN', 'SCHOOLADMIN'), createTeacher);

// GET /api/v1/teachers - List teachers for current school
router.get('/', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), getTeachers);

// PATCH /api/v1/teachers/:id - Update teacher details
router.patch('/:id', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), updateTeacher);

// DELETE /api/v1/teachers/:id - Delete a teacher
// Only SUPERADMIN can delete teachers
router.delete('/:id', requireRole('SUPERADMIN'), deleteTeacher);

module.exports = router;
