const express = require('express');
const {
  getTemplates,
  getTemplate,
  getActiveTemplate,
  downloadExcelTemplate,
  downloadExcelTemplateByType
} = require('../controllers/templateController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

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

// @route   GET /api/v1/templates/:id
// @desc    Get template by ID (must be last to avoid conflicts)
router.get('/:id', getTemplate);

module.exports = router;

