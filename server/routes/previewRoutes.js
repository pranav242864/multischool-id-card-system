const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const schoolScoping = require('../middleware/schoolScoping');
const requireRole = require('../middleware/requireRole');
const { previewStudentCard } = require('../controllers/preview.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(schoolScoping);
router.use(requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'));

router.get('/students/:id', previewStudentCard);

module.exports = router;


