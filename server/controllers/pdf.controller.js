const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const School = require('../models/School');
const User = require('../models/User');
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
    .populate('schoolId', 'name address contactEmail');

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
  
  // Fetch school data for header and footer
  const school = await School.findById(schoolId).select('name address contactEmail');
  const schoolName = school?.name || 'SCHOOL NAME';
  const schoolAddress = school?.address || 'SECTOR-XX, CITY (STATE)';
  const schoolEmail = school?.contactEmail || 'school@example.com';
  
  // Get school admin phone
  let adminPhone = '';
  try {
    const adminUser = await User.findOne({ 
      schoolId: schoolId, 
      role: 'SCHOOLADMIN',
      status: 'ACTIVE'
    }).select('phone');
    adminPhone = adminUser?.phone || '';
  } catch (error) {
    // Ignore error
  }
  
  // Add school data to cardData
  cardData.data.schoolName = schoolName;
  cardData.data.schoolAddress = schoolAddress;
  cardData.data.schoolEmail = schoolEmail;
  cardData.data.adminPhone = adminPhone;
  
  // Add session name if available
  if (student.sessionId && student.sessionId.sessionName) {
    cardData.data.session = student.sessionId.sessionName;
    cardData.data.sessionName = student.sessionId.sessionName;
  }

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

  // Fetch school data once for all students
  const school = await School.findById(schoolId).select('name address contactEmail');
  const schoolName = school?.name || 'SCHOOL NAME';
  const schoolAddress = school?.address || 'SECTOR-XX, CITY (STATE)';
  const schoolEmail = school?.contactEmail || 'school@example.com';
  
  // Get school admin phone
  let adminPhone = '';
  try {
    const adminUser = await User.findOne({ 
      schoolId: schoolId, 
      role: 'SCHOOLADMIN',
      status: 'ACTIVE'
    }).select('phone');
    adminPhone = adminUser?.phone || '';
  } catch (error) {
    // Ignore error
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
      
      // Add school data to cardData
      cardData.data.schoolName = schoolName;
      cardData.data.schoolAddress = schoolAddress;
      cardData.data.schoolEmail = schoolEmail;
      cardData.data.adminPhone = adminPhone;
      
      // Add session name if available
      if (student.sessionId && student.sessionId.sessionName) {
        cardData.data.session = student.sessionId.sessionName;
        cardData.data.sessionName = student.sessionId.sessionName;
      }

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

const generateBulkTeacherPDF = asyncHandler(async (req, res) => {
  const schoolId = getSchoolIdForOperation(req);

  let teachers;
  if (req.body.teacherIds && Array.isArray(req.body.teacherIds) && req.body.teacherIds.length > 0) {
    teachers = await Teacher.find({
      _id: { $in: req.body.teacherIds },
      schoolId: schoolId
    })
      .populate('classId', 'className')
      .populate('schoolId', 'name address contactEmail');
  } else {
    teachers = await Teacher.find({
      schoolId: schoolId
    })
      .populate('classId', 'className')
      .populate('schoolId', 'name address contactEmail');
  }

  if (!teachers || teachers.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No teachers found'
    });
  }

  // Fetch school data once for all teachers
  const school = await School.findById(schoolId).select('name address contactEmail');
  const schoolName = school?.name || 'SCHOOL NAME';
  const schoolAddress = school?.address || 'SECTOR-XX, CITY (STATE)';
  const schoolEmail = school?.contactEmail || 'school@example.com';
  
  // Get school admin phone
  let adminPhone = '';
  try {
    const adminUser = await User.findOne({ 
      schoolId: schoolId, 
      role: 'SCHOOLADMIN',
      status: 'ACTIVE'
    }).select('phone');
    adminPhone = adminUser?.phone || '';
  } catch (error) {
    // Ignore error
  }

  const pdfBuffers = [];

  for (const teacher of teachers) {
    try {
      const template = await resolveTemplate({
        schoolId,
        sessionId: null,
        classId: teacher.classId ? teacher.classId._id : null,
        type: 'TEACHER'
      });

      const cardData = generateCardData(teacher, template, 'TEACHER');
      
      // Add school data to cardData
      cardData.data.schoolName = schoolName;
      cardData.data.schoolAddress = schoolAddress;
      cardData.data.schoolEmail = schoolEmail;
      cardData.data.adminPhone = adminPhone;

      const pdfBuffer = await generatePdf({
        layoutConfig: cardData.layoutConfig,
        data: cardData.data
      });

      pdfBuffers.push({
        buffer: pdfBuffer,
        teacherId: teacher._id.toString(),
        teacherName: teacher.name,
        email: teacher.email
      });
    } catch (error) {
      console.warn(`[PDF] Skipped teacher ${teacher._id}:`, error.message);
    }
  }

  if (pdfBuffers.length === 0) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate PDFs for any teachers'
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

    pdfBuffers.forEach(({ buffer, teacherName, email }) => {
      const safeName = (teacherName || 'Teacher').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = email
        ? `${email}_${safeName}.pdf`
        : `${safeName}.pdf`;

      archive.append(buffer, { name: filename });
    });

    archive.finalize();
  });

  const zipBuffer = Buffer.concat(zipChunks);

  // Audit log: bulk PDF generated
  await logAudit({
    action: 'BULK_GENERATE_PDF',
    entityType: 'TEACHER',
    entityId: null,
    req,
    metadata: { count: pdfBuffers.length }
  });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="teachers-id-cards.zip"');
  res.send(zipBuffer);
});

module.exports = {
  generateStudentPDF,
  generateBulkStudentPDF,
  generateBulkTeacherPDF
};

