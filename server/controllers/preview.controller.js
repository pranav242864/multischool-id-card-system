const Student = require('../models/Student');
const { resolveTemplate } = require('../services/templateAssignment.service');
const { generateCardData } = require('../services/card.service');
const asyncHandler = require('../utils/asyncHandler');

const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const previewStudentCard = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const schoolId = req.schoolId;

  const student = await Student.findOne({
    _id: id,
    schoolId: schoolId
  })
    .populate('classId', 'className')
    .populate('sessionId', 'sessionName')
    .populate('schoolId', 'name');

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

  const cardData = generateCardData(student, template, 'STUDENT');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Student ID Card Preview</title>
</head>
<body>
  <pre>${escapeHtml(JSON.stringify(cardData, null, 2))}</pre>
</body>
</html>
`.trim();

  res.status(200).json({
    success: true,
    html: htmlContent
  });
});

module.exports = {
  previewStudentCard
};


