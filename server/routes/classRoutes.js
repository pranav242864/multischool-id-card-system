const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
const activeSessionMiddleware = require('../middleware/activeSessionMiddleware');
const { 
  createClass, 
  getClasses, 
  freezeClass, 
  unfreezeClass 
} = require('../controllers/class.controller');

const router = express.Router();

// Apply authentication and school scoping to all routes
router.use(authMiddleware);
router.use(schoolScoping);

// POST /api/v1/classes
router.post('/', requireRole('SUPERADMIN', 'SCHOOLADMIN'), activeSessionMiddleware, createClass);

// GET /api/v1/classes
router.get('/', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), activeSessionMiddleware, getClasses);

// PATCH /api/v1/classes/:id/freeze
router.patch('/:id/freeze', requireRole('SUPERADMIN', 'SCHOOLADMIN'), activeSessionMiddleware, freezeClass);

// PATCH /api/v1/classes/:id/unfreeze
router.patch('/:id/unfreeze', requireRole('SUPERADMIN', 'SCHOOLADMIN'), activeSessionMiddleware, unfreezeClass);

module.exports = router;
