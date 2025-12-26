const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { 
  createStudent, 
  getStudents, 
  updateStudent, 
  deleteStudent 
} = require('../controllers/student.controller');

const router = express.Router();

// POST /api/students - Create a student
router.post('/students', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), createStudent);

// GET /api/students - List students for current school
router.get('/students', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'), getStudents);

// PATCH /api/students/:id - Update student details (BLOCK updates if class is frozen)
router.patch('/students/:id', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), updateStudent);

// DELETE /api/students/:id - Delete a student
router.delete('/students/:id', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), deleteStudent);

module.exports = router;