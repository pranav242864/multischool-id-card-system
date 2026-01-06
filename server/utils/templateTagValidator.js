/**
 * Template Data Tag Validator
 * Enforces strict tag whitelist per template type
 */

// Whitelist of valid tags for each template type
const TAG_WHITELIST = {
  STUDENT: [
    'studentName',
    'admissionNo',
    'class',
    'className',
    'fatherName',
    'motherName',
    'dob',
    'dateOfBirth',
    'bloodGroup',
    'mobile',
    'phone',
    'address',
    'photo',
    'photoUrl',
    'aadhaar',
    'aadhar'
  ],
  TEACHER: [
    'name',
    'teacherName',
    'email',
    'mobile',
    'phone',
    'classId',
    'className',
    'schoolId',
    'schoolName',
    'photo',
    'photoUrl'
  ],
  SCHOOLADMIN: [
    'name',
    'adminName',
    'email',
    'username',
    'mobile',
    'phone',
    'schoolId',
    'schoolName',
    'photo',
    'photoUrl'
  ]
};

/**
 * Validate data tags for a template
 * @param {Array<String>} dataTags - Array of tag names
 * @param {String} templateType - Template type (STUDENT, TEACHER, SCHOOLADMIN)
 * @returns {Object} - { valid: boolean, invalidTags: Array<String>, message: string }
 */
function validateTemplateTags(dataTags, templateType) {
  if (!Array.isArray(dataTags)) {
    return {
      valid: false,
      invalidTags: [],
      message: 'dataTags must be an array'
    };
  }

  if (dataTags.length === 0) {
    return {
      valid: false,
      invalidTags: [],
      message: 'dataTags cannot be empty'
    };
  }

  const allowedTags = TAG_WHITELIST[templateType];
  if (!allowedTags) {
    return {
      valid: false,
      invalidTags: dataTags,
      message: `Unknown template type: ${templateType}`
    };
  }

  const invalidTags = dataTags.filter(tag => !allowedTags.includes(tag));

  if (invalidTags.length > 0) {
    return {
      valid: false,
      invalidTags,
      message: `Invalid tags for ${templateType} template: ${invalidTags.join(', ')}. Allowed tags: ${allowedTags.join(', ')}`
    };
  }

  return {
    valid: true,
    invalidTags: [],
    message: 'All tags are valid'
  };
}

module.exports = {
  validateTemplateTags,
  TAG_WHITELIST
};

