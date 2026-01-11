const School = require('../models/School');

/**
 * Check if school is frozen
 * Throws an error if school is frozen
 * @param {String} schoolId - School ID
 * @param {String} operation - Operation being performed (for error message)
 * @returns {Promise<Object>} - School object if not frozen
 */
const checkSchoolNotFrozen = async (schoolId, operation = 'modify') => {
  if (!schoolId) {
    throw new Error('School ID is required');
  }

  const school = await School.findById(schoolId);
  
  if (!school) {
    throw new Error('School not found');
  }

  if (school.frozen) {
    const operationMessages = {
      create: 'Cannot create record in a frozen school. Frozen schools cannot be modified.',
      update: 'Cannot update record in a frozen school. Frozen schools cannot be modified.',
      delete: 'Cannot delete record from a frozen school. Frozen schools cannot be modified.',
      modify: 'Cannot modify records in a frozen school. Frozen schools cannot be modified.'
    };
    
    const message = operationMessages[operation] || `Cannot ${operation} record in a frozen school. Frozen schools cannot be modified.`;
    throw new Error(message);
  }

  return school;
};

module.exports = {
  checkSchoolNotFrozen
};
