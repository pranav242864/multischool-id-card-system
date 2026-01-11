const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
const {
  createSchool,
  getAllSchools,
  getSchool,
  updateSchool,
  freezeSchool,
  unfreezeSchool,
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

// PUT /api/v1/schools/:id - Update a school (Superadmin only)
router.put('/schools/:id', requireRole('SUPERADMIN'), updateSchool);

// PATCH /api/v1/schools/:id/freeze - Freeze a school (Superadmin only)
router.patch('/schools/:id/freeze', requireRole('SUPERADMIN'), freezeSchool);

// PATCH /api/v1/schools/:id/unfreeze - Unfreeze a school (Superadmin only)
router.patch('/schools/:id/unfreeze', requireRole('SUPERADMIN'), unfreezeSchool);

// DELETE /api/v1/schools/:id - Hard delete a school (permanently removes from database) (Superadmin only)
router.delete('/schools/:id', requireRole('SUPERADMIN'), deleteSchool);

module.exports = router;
