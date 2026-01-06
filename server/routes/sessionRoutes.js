const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
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

// Apply authentication and school scoping to all routes
router.use(authMiddleware);
router.use(schoolScoping);

// POST /api/sessions - Create a new academic session
router.post('/sessions', requireRole('SUPERADMIN', 'SCHOOLADMIN'), createSession);

// GET /api/sessions - Fetch all sessions for the user's school
router.get('/sessions', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), getSessions);

// GET /api/sessions/:sessionId/students - Get students from a specific session (historical viewing)
router.get('/sessions/:sessionId/students', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), getSessionStudents);

// PATCH /api/sessions/:id/activate - Mark the selected session as active
router.patch('/sessions/:id/activate', requireRole('SUPERADMIN', 'SCHOOLADMIN'), activateSession);

// PATCH /api/sessions/:id/deactivate - Deactivate a session
router.patch('/sessions/:id/deactivate', requireRole('SUPERADMIN', 'SCHOOLADMIN'), deactivateSession);

// PATCH /api/sessions/:id/archive - Archive a session (mark as read-only)
// Only SUPERADMIN can archive sessions
router.patch('/sessions/:id/archive', requireRole('SUPERADMIN'), archiveSession);

// PATCH /api/sessions/:id/unarchive - Unarchive a session
// Only SUPERADMIN can unarchive sessions
router.patch('/sessions/:id/unarchive', requireRole('SUPERADMIN'), unarchiveSession);

// POST /api/sessions/promote - Promote students from one session to another
router.post('/sessions/promote', requireRole('SUPERADMIN', 'SCHOOLADMIN'), promoteStudentsToSession);

module.exports = router;
