const express = require('express');
const {
  createTemplate,
  getTemplates,
  getTemplate,
  getActiveTemplate,
  downloadExcelTemplate,
  downloadExcelTemplateByType,
  updateTemplate,
  deleteTemplate
} = require('../controllers/templateController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
const activeSessionMiddleware = require('../middleware/activeSessionMiddleware');
const { resolveTemplate } = require('../services/templateAssignment.service');

const router = express.Router();

// All routes require authentication and school scoping
router.use(authMiddleware);
router.use(schoolScoping);

// GET routes are accessible to TEACHER role as well (read-only access)
// POST/PATCH/DELETE routes require SUPERADMIN or SCHOOLADMIN

// @route   POST /api/v1/templates
// @desc    Create a new template
router.post('/', requireRole('SUPERADMIN', 'SCHOOLADMIN'), activeSessionMiddleware, createTemplate);

// @route   GET /api/v1/templates
// @desc    Get templates (accessible to TEACHER for read-only)
router.get('/', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), getTemplates);

// @route   GET /api/v1/templates/active/:type
// @desc    Get active template by type (accessible to TEACHER for read-only) (must come before /:id)
router.get('/active/:type', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), getActiveTemplate);

// @route   GET /api/v1/templates/download-excel/:type
// @desc    Download Excel template by type (uses most recent template) (accessible to TEACHER) (must come before /:id)
router.get('/download-excel/:type', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), downloadExcelTemplateByType);

// @route   GET /api/v1/templates/:id/download-excel
// @desc    Download Excel template from specific template ID (accessible to TEACHER)
router.get('/:id/download-excel', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), downloadExcelTemplate);

// @route   PATCH /api/v1/templates/:id
// @desc    Update template
router.patch('/:id', requireRole('SUPERADMIN', 'SCHOOLADMIN'), activeSessionMiddleware, updateTemplate);

// @route   DELETE /api/v1/templates/:id
// @desc    Delete template
router.delete('/:id', requireRole('SUPERADMIN', 'SCHOOLADMIN'), activeSessionMiddleware, deleteTemplate);

// @route   GET /api/v1/templates/:id
// @desc    Get template by ID (accessible to TEACHER for read-only) (must be last to avoid conflicts)
router.get('/:id', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), getTemplate);

router.post('/resolve/test', async (req, res, next) => {
  try {
    const template = await resolveTemplate({
      schoolId: req.schoolId,
      sessionId: req.body.sessionId || null,
      classId: req.body.classId || null,
      type: req.body.type
    });

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
