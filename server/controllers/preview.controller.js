const Student = require('../models/Student');
const { resolveTemplate } = require('../services/templateAssignment.service');
const { generateCardData } = require('../services/card.service');
const { renderCardHtml } = require('../services/cardRenderer.service');
const asyncHandler = require('../utils/asyncHandler');

const previewStudentCard = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const schoolId = req.schoolId;

  const student = await Student.findOne({
    _id: id,
    schoolId: schoolId
  })
    .populate('classId', 'className')
    .populate('sessionId', 'sessionName')
    .populate('schoolId', 'name address contactEmail');

  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  const template = await resolveTemplate({
    schoolId,
    sessionId: student.sessionId ? student.sessionId._id : null,
    classId: student.classId ? student.classId._id : null,
    type: 'STUDENT'
  });

  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'No template found for this student'
    });
  }

  // Generate card data
  const cardData = generateCardData(student, template, 'STUDENT');
  
  // Add session name to card data if available
  if (student.sessionId && student.sessionId.sessionName) {
    cardData.data.session = student.sessionId.sessionName;
    cardData.data.sessionName = student.sessionId.sessionName;
  }

  // Render card HTML
  const htmlContent = await renderCardHtml(cardData, schoolId);

  res.status(200).json({
    success: true,
    html: htmlContent
  });
});

module.exports = {
  previewStudentCard
};


