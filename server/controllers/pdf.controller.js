const Student = require('../models/Student');
const { resolveTemplate } = require('../services/templateAssignment.service');
const { generateCardData } = require('../services/card.service');
const { generatePdf } = require('../services/pdf.service');
const { getActiveSession } = require('../utils/sessionUtils');
const { getSchoolIdForOperation } = require('../utils/getSchoolId');
const archiver = require('archiver');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../utils/audit.helper');

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

  // Audit log: PDF generated
  await logAudit({
    action: 'GENERATE_PDF',
    entityType: 'STUDENT',
    entityId: studentId,
    req,
    metadata: { count: 1 }
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="student-id.pdf"');
  res.send(pdfBuffer);
});

const generateBulkStudentPDF = asyncHandler(async (req, res) => {
  const schoolId = getSchoolIdForOperation(req);
  const activeSession = await getActiveSession(schoolId);

  let students;
  if (req.body.studentIds && Array.isArray(req.body.studentIds) && req.body.studentIds.length > 0) {
    students = await Student.find({
      _id: { $in: req.body.studentIds },
      schoolId: schoolId,
      sessionId: activeSession._id
    })
      .populate('classId', 'className')
      .populate('sessionId', 'sessionName')
      .populate('schoolId', 'name');
  } else {
    students = await Student.find({
      schoolId: schoolId,
      sessionId: activeSession._id
    })
      .populate('classId', 'className')
      .populate('sessionId', 'sessionName')
      .populate('schoolId', 'name');
  }

  if (!students || students.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No students found'
    });
  }

  const pdfBuffers = [];

  for (const student of students) {
    try {
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

      pdfBuffers.push({
        buffer: pdfBuffer,
        studentId: student._id.toString(),
        studentName: student.name,
        admissionNo: student.admissionNo
      });
    } catch (error) {
      console.warn(`[PDF] Skipped student ${student._id}:`, error.message);
    }
  }

  if (pdfBuffers.length === 0) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate PDFs for any students'
    });
  }

  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  const zipChunks = [];
  archive.on('data', (chunk) => {
    zipChunks.push(chunk);
  });

  await new Promise((resolve, reject) => {
    archive.on('end', resolve);
    archive.on('error', reject);

    pdfBuffers.forEach(({ buffer, studentName, admissionNo }) => {
      const safeName = (studentName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = admissionNo
        ? `${admissionNo}_${safeName}.pdf`
        : `${safeName}.pdf`;

      archive.append(buffer, { name: filename });
    });

    archive.finalize();
  });

  const zipBuffer = Buffer.concat(zipChunks);

  // Audit log: bulk PDF generated
  await logAudit({
    action: 'BULK_GENERATE_PDF',
    entityType: 'STUDENT',
    entityId: null,
    req,
    metadata: { count: pdfBuffers.length }
  });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="students-id-cards.zip"');
  res.send(zipBuffer);
});

module.exports = {
  generateStudentPDF,
  generateBulkStudentPDF
};

