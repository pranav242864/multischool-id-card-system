const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
const { getUsers, getUser, createTeacherUser, createSchoolAdminUser, createTeacherUserAdmin, createTeacherUserForSchool, updateUser, deleteUser } = require('../controllers/userController');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);
router.use(schoolScoping);

// GET /api/v1/users - Get users (Superadmin only, supports filtering by schoolId and role)
router.get('/', requireRole('SUPERADMIN'), getUsers);

// GET /api/v1/users/:id - Get single user (Superadmin only)
router.get('/:id', requireRole('SUPERADMIN'), getUser);

// POST /api/v1/users/teacher - Create a TEACHER user (Superadmin only)
router.post('/teacher', requireRole('SUPERADMIN'), createTeacherUser);

// POST /api/v1/users/admin - Create a SCHOOLADMIN user (Superadmin only)
router.post('/admin', requireRole('SUPERADMIN'), createSchoolAdminUser);

// POST /api/v1/users/teacher-admin - Create a TEACHER user (Superadmin only)
router.post('/teacher-admin', requireRole('SUPERADMIN'), createTeacherUserAdmin);

// POST /api/v1/users/teacher-for-school - Create a TEACHER user (School admin only, uses req.user.schoolId)
router.post('/teacher-for-school', requireRole('SCHOOLADMIN'), createTeacherUserForSchool);

// PUT /api/v1/users/:id - Update user (Superadmin only, requires schoolId query param)
router.put('/:id', requireRole('SUPERADMIN'), updateUser);

// DELETE /api/v1/users/:id - Delete user (Superadmin only, requires schoolId query param)
router.delete('/:id', requireRole('SUPERADMIN'), deleteUser);

module.exports = router;


