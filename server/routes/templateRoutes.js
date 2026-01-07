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

// All routes require authentication, school scoping, role check, and active session
router.use(authMiddleware);
router.use(schoolScoping);
router.use(requireRole('SUPERADMIN', 'SCHOOLADMIN'));
router.use(activeSessionMiddleware);

// @route   POST /api/v1/templates
// @desc    Create a new template
router.post('/', createTemplate);

// @route   GET /api/v1/templates
// @desc    Get templates
router.get('/', getTemplates);

// @route   GET /api/v1/templates/active/:type
// @desc    Get active template by type (must come before /:id)
router.get('/active/:type', getActiveTemplate);

// @route   GET /api/v1/templates/download-excel/:type
// @desc    Download Excel template by type (uses most recent template) (must come before /:id)
router.get('/download-excel/:type', downloadExcelTemplateByType);

// @route   GET /api/v1/templates/:id/download-excel
// @desc    Download Excel template from specific template ID
router.get('/:id/download-excel', downloadExcelTemplate);

// @route   PATCH /api/v1/templates/:id
// @desc    Update template
router.patch('/:id', updateTemplate);

// @route   DELETE /api/v1/templates/:id
// @desc    Delete template
router.delete('/:id', deleteTemplate);

// @route   GET /api/v1/templates/:id
// @desc    Get template by ID (must be last to avoid conflicts)
router.get('/:id', getTemplate);

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
