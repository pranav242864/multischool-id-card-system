const Template = require('../models/Template');
const { generateExcelTemplate } = require('../utils/excelGenerator');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get templates by type
// @route   GET /api/v1/templates
// @access  Private
exports.getTemplates = asyncHandler(async (req, res) => {
  const { type, schoolId } = req.query;

  const query = {};
  if (type) {
    query.type = type;
  }
  if (schoolId) {
    query.schoolId = schoolId;
  }

  const templates = await Template.find(query)
    .populate('schoolId', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: templates.length,
    data: templates
  });
});

// @desc    Get template by ID
// @route   GET /api/v1/templates/:id
// @access  Private
exports.getTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findById(req.params.id)
    .populate('schoolId', 'name');

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  res.status(200).json({
    success: true,
    data: template
  });
});

// @desc    Get active template by type
// @route   GET /api/v1/templates/active/:type
// @access  Private
exports.getActiveTemplate = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { schoolId } = req.query;

  const query = { type };
  if (schoolId) {
    query.schoolId = schoolId;
  }

  // Get the most recent active template
  const template = await Template.findOne(query)
    .populate('schoolId', 'name')
    .sort({ createdAt: -1 });

  if (!template) {
    return res.status(404).json({
      success: false,
      message: `No template found for type: ${type}`
    });
  }

  res.status(200).json({
    success: true,
    data: template
  });
});

// @desc    Download Excel template based on ID Card Template
// @route   GET /api/v1/templates/:id/download-excel
// @access  Private
exports.downloadExcelTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findById(req.params.id);

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  // Check if template has dataTags
  if (!template.dataTags || template.dataTags.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Template does not have any data fields defined'
    });
  }

  // Generate Excel file
  const excelBuffer = await generateExcelTemplate(
    template.dataTags,
    template.type
  );

  // Set response headers for file download
  const filename = `${template.type}_template_${Date.now()}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  res.send(excelBuffer);
});

// @desc    Download Excel template by type (uses active template)
// @route   GET /api/v1/templates/download-excel/:type
// @access  Private
exports.downloadExcelTemplateByType = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { schoolId } = req.query;

  const query = { type };
  if (schoolId) {
    query.schoolId = schoolId;
  }

  // Get the most recent template of this type
  const template = await Template.findOne(query)
    .sort({ createdAt: -1 });

  if (!template) {
    return res.status(404).json({
      success: false,
      message: `No template found for type: ${type}`
    });
  }

  // Check if template has dataTags
  if (!template.dataTags || template.dataTags.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Template does not have any data fields defined'
    });
  }

  // Generate Excel file
  const excelBuffer = await generateExcelTemplate(
    template.dataTags,
    template.type
  );

  // Set response headers for file download
  const filename = `${type}_template_${Date.now()}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  res.send(excelBuffer);
});

