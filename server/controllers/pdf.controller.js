const Student = require('../models/Student');
const { resolveTemplate } = require('../services/templateAssignment.service');
const { generateCardData } = require('../services/card.service');
const { generatePdf } = require('../services/pdf.service');
const { getActiveSession } = require('../utils/sessionUtils');
const asyncHandler = require('../utils/asyncHandler');

const generateStudentPDF = asyncHandler(async (req, res) => {
  console.log('[PDF] studentId:', req.params.studentId);
  console.log('[PDF] req.user:', req.user);
  console.log('[PDF] schoolId from query:', req.query.schoolId);

  const studentId = req.params.studentId;
  const schoolId = req.query.schoolId || req.user.schoolId;

  const activeSession = await getActiveSession(schoolId);

  const student = await Student.findOne({
    _id: studentId,
    schoolId: schoolId,
    sessionId: activeSession._id
  })
    .populate('classId', 'className')
    .populate('sessionId', 'sessionName')
    .populate('schoolId', 'name');

  if (!student) {
    console.log('[PDF] Student lookup failed with:', {
      studentId,
      schoolId,
      sessionId: activeSession._id
    });
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

  const pdfBuffer = await generatePdf({
    layoutConfig: cardData.layoutConfig,
    data: cardData.data
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="student-id.pdf"');
  res.send(pdfBuffer);
});

module.exports = {
  generateStudentPDF
};

