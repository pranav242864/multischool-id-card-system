const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { 
  createTeacher, 
  getTeachers, 
  updateTeacher, 
  deleteTeacher 
} = require('../controllers/teacher.controller');

const router = express.Router();

// POST /api/teachers - Create a teacher
router.post('/teachers', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), createTeacher);

// GET /api/teachers - List teachers for current school
router.get('/teachers', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'), getTeachers);

// PATCH /api/teachers/:id - Update teacher details
router.patch('/teachers/:id', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'), updateTeacher);

// DELETE /api/teachers/:id - Delete a teacher
router.delete('/teachers/:id', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), deleteTeacher);

module.exports = router;