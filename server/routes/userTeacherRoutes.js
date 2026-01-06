const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { createTeacherUser } = require('../controllers/userController');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// POST /api/v1/users/teacher - Create a TEACHER user (Superadmin only)
router.post('/teacher', requireRole('SUPERADMIN'), createTeacherUser);

module.exports = router;


