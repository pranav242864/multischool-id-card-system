const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { getUsers, createTeacherUser, createSchoolAdminUser, createTeacherUserAdmin } = require('../controllers/userController');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/v1/users - Get users (Superadmin only, supports filtering by schoolId and role)
router.get('/', requireRole('SUPERADMIN'), getUsers);

// POST /api/v1/users/teacher - Create a TEACHER user (Superadmin only)
router.post('/teacher', requireRole('SUPERADMIN'), createTeacherUser);

// POST /api/v1/users/admin - Create a SCHOOLADMIN user (Superadmin only)
router.post('/admin', requireRole('SUPERADMIN'), createSchoolAdminUser);

// POST /api/v1/users/teacher-admin - Create a TEACHER user (Superadmin only)
router.post('/teacher-admin', requireRole('SUPERADMIN'), createTeacherUserAdmin);

module.exports = router;


