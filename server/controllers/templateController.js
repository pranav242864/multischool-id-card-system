const Template = require('../models/Template');
const mongoose = require('mongoose');
const { generateExcelTemplate } = require('../utils/excelGenerator');
const { validateTemplateTags } = require('../utils/templateTagValidator');
const { createTemplate, getActiveTemplate: getActiveTemplateService, getTemplates: getTemplatesService } = require('../services/template.service');
const { getSchoolIdForOperation } = require('../utils/getSchoolId');
const asyncHandler = require('../utils/asyncHandler');
const { isSuperadmin } = require('../utils/roleGuards');
const { logAudit } = require('../utils/audit.helper');

// @desc    Create a new template
// @route   POST /api/v1/templates
// @access  Private - SUPERADMIN, SCHOOLADMIN
exports.createTemplate = asyncHandler(async (req, res) => {
  const { name, type, layoutConfig, dataTags, version, isActive, sessionId: bodySessionId, classId: bodyClassId } = req.body;

  // Validate required fields
  if (!type) {
    return res.status(400).json({
      success: false,
      message: 'Template type is required'
    });
  }

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Template name is required'
    });
  }

  if (!layoutConfig) {
    return res.status(400).json({
      success: false,
      message: 'Layout configuration is required'
    });
  }

  if (!dataTags || !Array.isArray(dataTags) || dataTags.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Data tags are required and must be a non-empty array'
    });
  }

  // Validate template type
  const validTypes = ['STUDENT', 'TEACHER', 'SCHOOLADMIN'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Template type must be one of: ${validTypes.join(', ')}`
    });
  }

  // Validate data tags against whitelist
  const tagValidation = validateTemplateTags(dataTags, type);
  if (!tagValidation.valid) {
    return res.status(400).json({
      success: false,
      message: tagValidation.message
    });
  }

  // Get schoolId from req.user context
  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
    if (typeof schoolId === 'string') {
      schoolId = new mongoose.Types.ObjectId(schoolId);
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  let sessionId;
  if (bodySessionId) {
    sessionId = bodySessionId;
  } else {
    if (!req.activeSession) {
      return res.status(400).json({
        success: false,
        message: 'Active session is required to create templates'
      });
    }
    sessionId = req.activeSession._id;
  }

  let classId = bodyClassId || null;

  // Determine version number
  let templateVersion = version;
  if (!templateVersion) {
    const latestTemplate = await Template.findOne({
      schoolId,
      sessionId,
      type,
      classId: classId
    }).sort({ version: -1 });

    templateVersion = latestTemplate ? latestTemplate.version + 1 : 1;
  }

  const templateData = {
    schoolId,
    sessionId,
    type,
    name,
    classId,
    version: templateVersion,
    layoutConfig,
    dataTags,
    isActive: isActive !== undefined ? isActive : true
  };

  try {
    const newTemplate = await createTemplate(templateData);

    // Audit log: template created
    await logAudit({
      action: 'CREATE_TEMPLATE',
      entityType: 'TEMPLATE',
      entityId: newTemplate._id,
      req,
      metadata: {}
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: newTemplate.toObject ? newTemplate.toObject() : newTemplate
    });
  } catch (error) {
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      return res.status(409).json({
        success: false,
        message: `Template version ${templateVersion} already exists for this school, session, and type`
      });
    }

    throw error;
  }
});

// @desc    Get templates by type
// @route   GET /api/v1/templates
// @access  Private - SUPERADMIN, SCHOOLADMIN
exports.getTemplates = asyncHandler(async (req, res) => {
  const { type } = req.query;

  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  if (!req.activeSession) {
    return res.status(400).json({
      success: false,
      message: 'Active session is required'
    });
  }

  const sessionId = req.activeSession._id;

  if (type) {
    const validTypes = ['STUDENT', 'TEACHER', 'SCHOOLADMIN'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Template type must be one of: ${validTypes.join(', ')}`
      });
    }
  }

  const templates = await getTemplatesService(schoolId, sessionId, type || null);

  res.status(200).json({
    success: true,
    count: templates.length,
    data: templates
  });
});

// @desc    Get template by ID
// @route   GET /api/v1/templates/:id
// @access  Private - SUPERADMIN, SCHOOLADMIN
exports.getTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findById(req.params.id)
    .populate('schoolId', 'name')
    .populate('sessionId', 'sessionName');

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  if (!isSuperadmin(req.user)) {
    const schoolId = req.user.schoolId;
    if (!schoolId || template.schoolId._id.toString() !== schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Template does not belong to your school'
      });
    }
  }

  res.status(200).json({
    success: true,
    data: template
  });
});

// @desc    Update template
// @route   PATCH /api/v1/templates/:id
// @access  Private - SUPERADMIN, SCHOOLADMIN
exports.updateTemplate = asyncHandler(async (req, res) => {
  const { name, layoutConfig, isActive, sessionId, classId } = req.body;

  const template = await Template.findById(req.params.id);

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  if (!isSuperadmin(req.user)) {
    const schoolId = req.user.schoolId;
    if (!schoolId || template.schoolId.toString() !== schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Template does not belong to your school'
      });
    }
  }

  if (name !== undefined) {
    template.name = name;
  }

  if (layoutConfig !== undefined) {
    template.layoutConfig = layoutConfig;
  }

  if (sessionId !== undefined) {
    template.sessionId = sessionId;
  }

  if (classId !== undefined) {
    template.classId = classId;
  }

  if (isActive !== undefined) {
    template.isActive = isActive;
  }

  if (template.isActive === true) {
    await Template.updateMany(
      {
        _id: { $ne: template._id },
        schoolId: template.schoolId,
        sessionId: template.sessionId,
        classId: template.classId,
        type: template.type,
        isActive: true
      },
      {
        $set: { isActive: false }
      }
    );
  }

  await template.save();

  // Audit log: template updated
  await logAudit({
    action: 'UPDATE_TEMPLATE',
    entityType: 'TEMPLATE',
    entityId: id,
    req,
    metadata: {}
  });

  res.status(200).json({
    success: true,
    data: template
  });
});

// @desc    Get active template by type
// @route   GET /api/v1/templates/active/:type
// @access  Private - SUPERADMIN, SCHOOLADMIN
exports.getActiveTemplate = asyncHandler(async (req, res) => {
  const { type } = req.params;

  // Validate template type
  const validTypes = ['STUDENT', 'TEACHER', 'SCHOOLADMIN'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Template type must be one of: ${validTypes.join(', ')}`
    });
  }

  // Get schoolId from req.user context
  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Get active session
  if (!req.activeSession) {
    return res.status(400).json({
      success: false,
      message: 'Active session is required'
    });
  }

  const sessionId = req.activeSession._id;

  // Get active template
  const template = await getActiveTemplateService(schoolId, sessionId, type);

  if (!template) {
    return res.status(404).json({
      success: false,
      message: `No active template found for type: ${type}`
    });
  }

  res.status(200).json({
    success: true,
    data: template
  });
});

// @desc    Download Excel template based on ID Card Template
// @route   GET /api/v1/templates/:id/download-excel
// @access  Private - SUPERADMIN, SCHOOLADMIN
exports.downloadExcelTemplate = asyncHandler(async (req, res) => {
  const template = await Template.findById(req.params.id);

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  // Verify template belongs to user's school (unless SUPERADMIN)
  if (!isSuperadmin(req.user)) {
    const schoolId = req.user.schoolId;
    if (!schoolId || template.schoolId.toString() !== schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Template does not belong to your school'
      });
    }
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
// @access  Private - SUPERADMIN, SCHOOLADMIN
exports.downloadExcelTemplateByType = asyncHandler(async (req, res) => {
  const { type } = req.params;

  // Validate template type
  const validTypes = ['STUDENT', 'TEACHER', 'SCHOOLADMIN'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Template type must be one of: ${validTypes.join(', ')}`
    });
  }

  // Get schoolId from req.user context
  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Get active session
  if (!req.activeSession) {
    return res.status(400).json({
      success: false,
      message: 'Active session is required'
    });
  }

  const sessionId = req.activeSession._id;

  // Get active template
  const template = await getActiveTemplateService(schoolId, sessionId, type);

  if (!template) {
    return res.status(404).json({
      success: false,
      message: `No active template found for type: ${type}`
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

// @desc    Delete template
// @route   DELETE /api/v1/templates/:id
// @access  Private - SUPERADMIN, SCHOOLADMIN
exports.deleteTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const schoolId = req.schoolId;

  const template = await Template.findOne({
    _id: id,
    schoolId: schoolId
  });

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found'
    });
  }

  await Template.deleteOne({ _id: template._id, schoolId: schoolId });

  // Audit log: template deleted
  await logAudit({
    action: 'DELETE_TEMPLATE',
    entityType: 'TEMPLATE',
    entityId: id,
    req,
    metadata: {}
  });

  res.status(200).json({
    success: true
  });
});
