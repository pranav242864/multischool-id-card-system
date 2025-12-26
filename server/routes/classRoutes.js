const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { 
  createClass, 
  getClasses, 
  freezeClass, 
  unfreezeClass 
} = require('../controllers/class.controller');

const router = express.Router();

// POST /api/classes - Create a new class
router.post('/classes', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), createClass);

// GET /api/classes - List classes for current school
router.get('/classes', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'), getClasses);

// PATCH /api/classes/:id/freeze - Freeze a class
router.patch('/classes/:id/freeze', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), freezeClass);

// PATCH /api/classes/:id/unfreeze - Unfreeze a class
router.patch('/classes/:id/unfreeze', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), unfreezeClass);

module.exports = router;