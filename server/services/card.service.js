const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Template = require('../models/Template');
const { getActiveTemplate } = require('./template.service');

/**
 * Generate card data (render-ready JSON, NO PDF)
 * Enforces school match, session match, and template type match
 * @param {Object} entity - Student or Teacher entity
 * @param {Object} template - Template object
 * @param {String} entityType - 'STUDENT' or 'TEACHER'
 * @returns {Object} - Render-ready JSON data
 */
function generateCardData(entity, template, entityType) {
  // Validate template type matches entity type
  if (entityType === 'STUDENT' && template.type !== 'STUDENT') {
    throw new Error('Template type must be STUDENT for student cards');
  }
  if (entityType === 'TEACHER' && template.type !== 'TEACHER') {
    throw new Error('Template type must be TEACHER for teacher cards');
  }

  // Validate school match
  const entitySchoolId = entity.schoolId ? entity.schoolId.toString() : entity.schoolId._id.toString();
  const templateSchoolId = template.schoolId ? template.schoolId.toString() : template.schoolId._id.toString();
  
  if (entitySchoolId !== templateSchoolId) {
    throw new Error('Entity school does not match template school');
  }

  // Validate session match (for students)
  if (entityType === 'STUDENT') {
    const entitySessionId = entity.sessionId ? entity.sessionId.toString() : entity.sessionId._id.toString();
    const templateSessionId = template.sessionId ? template.sessionId.toString() : template.sessionId._id.toString();
    
    if (entitySessionId !== templateSessionId) {
      throw new Error('Student session does not match template session');
    }
  }

  // Map entity data to template dataTags
  const cardData = {
    templateId: template._id.toString(),
    templateType: template.type,
    layoutConfig: template.layoutConfig,
    data: {}
  };

  // Populate data based on template dataTags
  template.dataTags.forEach(tag => {
    switch (tag) {
      // Student tags
      case 'studentName':
      case 'name':
        cardData.data[tag] = entity.name;
        break;
      case 'admissionNo':
        cardData.data[tag] = entity.admissionNo;
        break;
      case 'class':
      case 'className':
        cardData.data[tag] = entity.classId ? (entity.classId.className || entity.classId) : null;
        break;
      case 'fatherName':
        cardData.data[tag] = entity.fatherName;
        break;
      case 'motherName':
        cardData.data[tag] = entity.motherName;
        break;
      case 'dob':
      case 'dateOfBirth':
        cardData.data[tag] = entity.dob ? entity.dob.toISOString().split('T')[0] : null;
        break;
      case 'bloodGroup':
        cardData.data[tag] = entity.bloodGroup || null;
        break;
      case 'mobile':
      case 'phone':
        cardData.data[tag] = entity.mobile;
        break;
      case 'address':
        cardData.data[tag] = entity.address;
        break;
      case 'photo':
      case 'photoUrl':
        cardData.data[tag] = entity.photoUrl || null;
        break;
      case 'aadhaar':
      case 'aadhar':
        cardData.data[tag] = entity.aadhaar || null;
        break;

      // Teacher tags
      case 'teacherName':
        cardData.data[tag] = entity.name;
        break;
      case 'email':
        cardData.data[tag] = entity.email || null;
        break;
      case 'classId':
        cardData.data[tag] = entity.classId ? entity.classId._id.toString() : null;
        break;
      case 'schoolId':
        cardData.data[tag] = entity.schoolId ? entity.schoolId._id.toString() : entity.schoolId.toString();
        break;
      case 'schoolName':
        cardData.data[tag] = entity.schoolId ? (entity.schoolId.name || null) : null;
        break;

      // SchoolAdmin tags
      case 'adminName':
        cardData.data[tag] = entity.name;
        break;
      case 'username':
        cardData.data[tag] = entity.username || null;
        break;

      default:
        cardData.data[tag] = null;
    }
  });

  return cardData;
}

/**
 * Generate student card data
 * @param {String} studentId - Student ID
 * @param {String} templateId - Optional template ID (uses active template if not provided)
 * @param {String} schoolId - School ID
 * @returns {Promise<Object>} - Render-ready JSON data
 */
async function generateStudentCardData(studentId, templateId, schoolId) {
  // Find student
  const student = await Student.findById(studentId)
    .populate('classId', 'className')
    .populate('sessionId', 'sessionName')
    .populate('schoolId', 'name');

  if (!student) {
    throw new Error('Student not found');
  }

  // Validate school match
  const studentSchoolId = student.schoolId._id.toString();
  if (studentSchoolId !== schoolId.toString()) {
    throw new Error('Student does not belong to the specified school');
  }

  // Get template
  let template;
  if (templateId) {
    template = await Template.findById(templateId)
      .populate('schoolId', 'name')
      .populate('sessionId', 'sessionName');

    if (!template) {
      throw new Error('Template not found');
    }

    // Validate template school and session
    if (template.schoolId._id.toString() !== schoolId.toString()) {
      throw new Error('Template does not belong to the specified school');
    }
    if (template.sessionId._id.toString() !== student.sessionId._id.toString()) {
      throw new Error('Template session does not match student session');
    }
  } else {
    // Get active template
    template = await getActiveTemplate(schoolId, student.sessionId._id, 'STUDENT');
    if (!template) {
      throw new Error('No active template found for STUDENT type');
    }
  }

  // Generate card data
  return generateCardData(student, template, 'STUDENT');
}

/**
 * Generate teacher card data
 * @param {String} teacherId - Teacher ID
 * @param {String} templateId - Optional template ID (uses active template if not provided)
 * @param {String} schoolId - School ID
 * @param {String} sessionId - Session ID (for template lookup)
 * @returns {Promise<Object>} - Render-ready JSON data
 */
async function generateTeacherCardData(teacherId, templateId, schoolId, sessionId) {
  // Find teacher
  const teacher = await Teacher.findById(teacherId)
    .populate('classId', 'className')
    .populate('schoolId', 'name');

  if (!teacher) {
    throw new Error('Teacher not found');
  }

  // Validate school match
  const teacherSchoolId = teacher.schoolId._id.toString();
  if (teacherSchoolId !== schoolId.toString()) {
    throw new Error('Teacher does not belong to the specified school');
  }

  // Get template
  let template;
  if (templateId) {
    template = await Template.findById(templateId)
      .populate('schoolId', 'name')
      .populate('sessionId', 'sessionName');

    if (!template) {
      throw new Error('Template not found');
    }

    // Validate template school
    if (template.schoolId._id.toString() !== schoolId.toString()) {
      throw new Error('Template does not belong to the specified school');
    }
  } else {
    // Get active template
    template = await getActiveTemplate(schoolId, sessionId, 'TEACHER');
    if (!template) {
      throw new Error('No active template found for TEACHER type');
    }
  }

  // Generate card data
  return generateCardData(teacher, template, 'TEACHER');
}

module.exports = {
  generateCardData,
  generateStudentCardData,
  generateTeacherCardData
};

