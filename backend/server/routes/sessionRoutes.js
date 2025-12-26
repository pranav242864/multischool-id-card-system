const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { 
  createSession, 
  getSessions, 
  activateSession, 
  deactivateSession 
} = require('../controllers/session.controller');

const router = express.Router();

// POST /api/sessions - Create a new academic session
router.post('/sessions', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), createSession);

// GET /api/sessions - Fetch all sessions for the user's school
router.get('/sessions', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'), getSessions);

// PATCH /api/sessions/:id/activate - Mark the selected session as active
router.patch('/sessions/:id/activate', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), activateSession);

// PATCH /api/sessions/:id/deactivate - Archive/deactivate a session
router.patch('/sessions/:id/deactivate', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), deactivateSession);

module.exports = router;