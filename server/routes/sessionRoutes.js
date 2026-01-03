const express = require('express');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { 
  createSession, 
  getSessions, 
  activateSession, 
  deactivateSession,
  archiveSession,
  unarchiveSession
} = require('../controllers/session.controller');
const {
  promoteStudentsToSession,
  getSessionStudents
} = require('../controllers/promotion.controller');

const router = express.Router();

// POST /api/sessions - Create a new academic session
router.post('/sessions', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), createSession);

// GET /api/sessions - Fetch all sessions for the user's school
router.get('/sessions', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'), getSessions);

// GET /api/sessions/:sessionId/students - Get students from a specific session (historical viewing)
router.get('/sessions/:sessionId/students', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin', 'Teacher'), getSessionStudents);

// PATCH /api/sessions/:id/activate - Mark the selected session as active
router.patch('/sessions/:id/activate', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), activateSession);

// PATCH /api/sessions/:id/deactivate - Deactivate a session
router.patch('/sessions/:id/deactivate', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), deactivateSession);

// PATCH /api/sessions/:id/archive - Archive a session (mark as read-only)
router.patch('/sessions/:id/archive', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), archiveSession);

// PATCH /api/sessions/:id/unarchive - Unarchive a session
router.patch('/sessions/:id/unarchive', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), unarchiveSession);

// POST /api/sessions/promote - Promote students from one session to another
router.post('/sessions/promote', authMiddleware, roleMiddleware('Superadmin', 'Schooladmin'), promoteStudentsToSession);

module.exports = router;