const Template = require('../models/Template');
const mongoose = require('mongoose');

/**
 * Get active template for a school, session, and type
 * Only one active template can exist per (schoolId + sessionId + type)
 * @param {String} schoolId - School ID
 * @param {String} sessionId - Session ID
 * @param {String} type - Template type (STUDENT, TEACHER, SCHOOLADMIN)
 * @returns {Promise<Object>} - Active template or null
 */
async function getActiveTemplate(schoolId, sessionId, type) {
  const template = await Template.findOne({
    schoolId,
    sessionId,
    type,
    active: true
  });

  return template;
}

/**
 * Create a new template and set it as active
 * If another template is active, deactivate it
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} - Created template
 */
async function createTemplate(templateData) {
  try {
    // If creating with active=true, deactivate other active templates first
    if (templateData.active !== false) {
      await Template.updateMany(
        {
          schoolId: templateData.schoolId,
          sessionId: templateData.sessionId,
          type: templateData.type,
          active: true
        },
        {
          $set: { active: false }
        }
      );
    }

    // Set active flag (default to true if not specified)
    if (templateData.active === undefined) {
      templateData.active = true;
    }

    // Create the new template
    const createdTemplate = new Template(templateData);
    await createdTemplate.save();
    
    return createdTemplate;
  } catch (error) {
    console.error('Error in createTemplate service:', {
      message: error.message,
      name: error.name,
      code: error.code,
      templateData: {
        schoolId: templateData.schoolId,
        sessionId: templateData.sessionId,
        type: templateData.type,
        active: templateData.active
      }
    });
    throw error;
  }
}

/**
 * Get all templates for a school and session (including inactive versions)
 * @param {String} schoolId - School ID
 * @param {String} sessionId - Session ID
 * @param {String} type - Optional template type filter
 * @returns {Promise<Array>} - Array of templates
 */
async function getTemplates(schoolId, sessionId, type = null) {
  const query = {
    schoolId,
    sessionId
  };

  if (type) {
    query.type = type;
  }

  const templates = await Template.find(query)
    .sort({ createdAt: -1 });

  return templates;
}

module.exports = {
  getActiveTemplate,
  createTemplate,
  getTemplates
};

