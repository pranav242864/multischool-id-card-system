const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
const {
  createSchool,
  getAllSchools,
  getSchool,
  deleteSchool
} = require('../controllers/school.controller');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);
router.use(schoolScoping);

// POST /api/v1/schools - Create a new school (Superadmin only)
router.post('/schools', requireRole('SUPERADMIN'), createSchool);

// GET /api/v1/schools - Get all schools (Superadmin only)
router.get('/schools', requireRole('SUPERADMIN'), getAllSchools);

// GET /api/v1/schools/:id - Get single school by ID (Superadmin only)
router.get('/schools/:id', requireRole('SUPERADMIN'), getSchool);

// DELETE /api/v1/schools/:id - Soft delete a school and its related data (Superadmin only)
router.delete('/schools/:id', requireRole('SUPERADMIN'), deleteSchool);

module.exports = router;
