const ExcelJS = require('exceljs');

/**
 * Generate Excel template from template dataTags
 * @param {Array} dataTags - Array of field names from template
 * @param {String} entityType - Type of entity (student, teacher, admin)
 * @returns {Promise<Buffer>} Excel file buffer
 */
async function generateExcelTemplate(dataTags, entityType) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template');

  // Map dataTags to human-readable column headers
  const fieldMapping = {
    // Student fields
    studentName: 'Student Name',
    admissionNo: 'Admission Number',
    class: 'Class',
    fatherName: "Father's Name",
    motherName: "Mother's Name",
    dob: 'Date of Birth',
    bloodGroup: 'Blood Group',
    mobile: 'Mobile Number',
    address: 'Address',
    photo: 'Photo URL',
    photoUrl: 'Photo URL',
    aadhaar: 'Aadhaar Number',
    
    // Teacher/Admin common fields
    name: 'Name',
    email: 'Email',
    classId: 'Class ID',
    
    // Admin fields
    username: 'Username',
    password: 'Password',
    phone: 'Phone Number',
    schoolId: 'School ID',
  };

  // Get column headers from dataTags
  const headers = dataTags.map(tag => {
    // Handle camelCase conversion
    const formattedTag = tag
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    // Use mapping if available, otherwise use formatted tag
    return fieldMapping[tag] || formattedTag;
  });

  // Add header row with styling
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Set column widths
  headers.forEach((header, index) => {
    worksheet.getColumn(index + 1).width = Math.max(header.length + 5, 15);
  });

  // Add example row with instructions
  const exampleRow = worksheet.addRow(headers.map(() => 'Example data'));
  exampleRow.font = { italic: true, color: { argb: 'FF808080' } };
  
  // Freeze header row
  worksheet.views = [
    { state: 'frozen', ySplit: 1 }
  ];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Generate Excel export from entity data
 * @param {Array} entities - Array of entity objects (students or teachers)
 * @param {Array} dataTags - Array of field names from template (determines columns)
 * @param {String} entityType - Type of entity (student, teacher)
 * @returns {Promise<Buffer>} Excel file buffer
 */
async function generateExcelExport(entities, dataTags, entityType) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Export');

  // Map dataTags to human-readable column headers
  const fieldMapping = {
    // Student fields
    studentName: 'Student Name',
    name: 'Student Name',
    admissionNo: 'Admission Number',
    class: 'Class Name',
    className: 'Class Name',
    classId: 'Class ID',
    fatherName: "Father's Name",
    motherName: "Mother's Name",
    dob: 'Date of Birth',
    dateOfBirth: 'Date of Birth',
    bloodGroup: 'Blood Group',
    mobile: 'Mobile Number',
    phone: 'Phone Number',
    address: 'Address',
    photo: 'Photo URL',
    photoUrl: 'Photo URL',
    aadhaar: 'Aadhaar Number',
    
    // Teacher fields
    email: 'Email',
    schoolId: 'School ID',
  };

  // Get column headers from dataTags
  const headers = dataTags.map(tag => {
    return fieldMapping[tag] || tag
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  });

  // Add header row with styling
  const headerRow = worksheet.addRow(headers);
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Set column widths
  headers.forEach((header, index) => {
    worksheet.getColumn(index + 1).width = Math.max(header.length + 5, 15);
  });

  // Add data rows
  entities.forEach(entity => {
    const row = dataTags.map(tag => {
      let value = '';
      
      // Handle nested properties
      if (tag === 'studentName' || tag === 'name') {
        value = entity.name || '';
      } else if (tag === 'className' || tag === 'class') {
        value = entity.classId?.className || entity.className || '';
      } else if (tag === 'classId') {
        value = entity.classId?._id?.toString() || entity.classId?.toString() || '';
      } else if (tag === 'schoolId') {
        value = entity.schoolId?._id?.toString() || entity.schoolId?.toString() || '';
      } else if (tag === 'dob' || tag === 'dateOfBirth') {
        // Format date
        if (entity.dob) {
          const date = entity.dob instanceof Date ? entity.dob : new Date(entity.dob);
          if (!isNaN(date.getTime())) {
            value = date.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        }
      } else {
        value = entity[tag] || '';
      }
      
      return value;
    });
    
    worksheet.addRow(row);
  });

  // Freeze header row
  worksheet.views = [
    { state: 'frozen', ySplit: 1 }
  ];

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  generateExcelTemplate,
  generateExcelExport
};

