const ExcelJS = require('exceljs');

/**
 * Parse Excel file and extract data rows
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Promise<Array>} Array of objects with row data
 */
async function parseExcelFile(fileBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Excel file is empty or has no worksheets');
  }

  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = cell.value?.toString().trim() || '';
  });

  // Remove empty headers
  const validHeaders = headers.filter(h => h);
  
  if (validHeaders.length === 0) {
    throw new Error('No headers found in Excel file');
  }

  // Extract data rows (skip header row)
  const data = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const rowData = {};
    let hasData = false;

    validHeaders.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const value = cell.value;
      
      // Convert cell value to appropriate type
      if (value !== null && value !== undefined && value !== '') {
        rowData[header] = value.toString().trim();
        hasData = true;
      }
    });

    // Only add row if it has at least one data field
    if (hasData) {
      data.push(rowData);
    }
  }

  return { headers: validHeaders, data };
}

module.exports = {
  parseExcelFile
};

