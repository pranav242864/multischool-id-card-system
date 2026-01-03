const express = require('express');
const { authMiddleware, roleMiddleware, blockTeachersFromDeletes } = require('../middleware/authMiddleware');
const { 
  createStudent, 
  getStudents, 
  updateStudent, 
  deleteStudent 
} = require('../controllers/student.controller');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// POST /api/students - Create a student
// Teachers can create students ONLY in their assigned class (when class is not frozen)
router.post('/students', roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'), createStudent);

// GET /api/students - List students for current school
// Teachers can read student data (only from their assigned class)
router.get('/students', roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'), getStudents);

// PATCH /api/students/:id - Update student details (BLOCK updates if class is frozen)
// Teachers can update students ONLY in their assigned class (when class is not frozen)
router.patch('/students/:id', roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'), updateStudent);

// DELETE /api/students/:id - Delete a student
// Teachers are blocked from deleting students (defense-in-depth)
router.delete('/students/:id', blockTeachersFromDeletes, roleMiddleware('Superadmin', 'Schooladmin'), deleteStudent);

module.exports = router;