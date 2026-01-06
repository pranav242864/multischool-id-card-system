const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
const activeSessionMiddleware = require('../middleware/activeSessionMiddleware');
const { 
  createStudent, 
  getStudents, 
  updateStudent, 
  deleteStudent,
  bulkDeleteStudents
} = require('../controllers/student.controller');

const router = express.Router();

// Apply authentication and school scoping to all routes
router.use(authMiddleware);
router.use(schoolScoping);

// POST /api/students - Create a student
// Teachers can create students ONLY in their assigned class (when class is not frozen)
router.post('/students', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), activeSessionMiddleware, createStudent);

// GET /api/students - List students for current school
// Teachers can read student data (only from their assigned class)
router.get('/students', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), activeSessionMiddleware, getStudents);

// PATCH /api/students/:id - Update student details (BLOCK updates if class is frozen)
// Teachers can update students ONLY in their assigned class (when class is not frozen)
router.patch('/students/:id', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), activeSessionMiddleware, updateStudent);

// DELETE /api/students/:id - Delete a student
// Teachers are blocked from deleting students (defense-in-depth)
router.delete('/students/:id', requireRole('SUPERADMIN', 'SCHOOLADMIN'), activeSessionMiddleware, deleteStudent);

// POST /api/v1/students/bulk-delete - Bulk delete students
// Teachers are blocked from bulk deleting students (defense-in-depth)
router.post('/bulk-delete', requireRole('SUPERADMIN', 'SCHOOLADMIN'), activeSessionMiddleware, bulkDeleteStudents);

module.exports = router;
