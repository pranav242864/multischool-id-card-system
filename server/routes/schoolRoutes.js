const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { enforceSchoolScoping } = require('../middleware/schoolScoping');
const {
  getAllSchools,
  getSchool,
  deleteSchool
} = require('../controllers/school.controller');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);
router.use(enforceSchoolScoping); // Apply school scoping middleware

// GET /api/v1/schools - Get all schools (Superadmin) or own school (Schooladmin)
router.get('/schools', roleMiddleware('Superadmin', 'Schooladmin'), getAllSchools);

// GET /api/v1/schools/:id - Get single school by ID
router.get('/schools/:id', roleMiddleware('Superadmin', 'Schooladmin'), getSchool);

// DELETE /api/v1/schools/:id - Soft delete a school and its related data
router.delete('/schools/:id', roleMiddleware('Superadmin'), deleteSchool);

module.exports = router;


