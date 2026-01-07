const Template = require('../models/Template');

async function resolveTemplate({ schoolId, sessionId = null, classId = null, type }) {
  if (!schoolId) {
    throw new Error('School ID is required to resolve template');
  }

  if (!type) {
    throw new Error('Template type is required to resolve template');
  }

  const baseFilter = {
    schoolId,
    type,
    isActive: true
  };

  if (sessionId) {
    const classLevelTemplate = await Template.findOne({
      ...baseFilter,
      sessionId,
      classId
    }).lean();

    if (classLevelTemplate) {
      return classLevelTemplate;
    }

    const sessionLevelTemplate = await Template.findOne({
      ...baseFilter,
      sessionId,
      classId: null
    }).lean();

    if (sessionLevelTemplate) {
      return sessionLevelTemplate;
    }
  }

  const schoolLevelTemplate = await Template.findOne({
    ...baseFilter,
    sessionId: null,
    classId: null
  }).lean();

  if (schoolLevelTemplate) {
    return schoolLevelTemplate;
  }

  throw new Error('No active template found for this scope');
}

module.exports = {
  resolveTemplate
};


