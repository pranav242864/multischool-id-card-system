const PDFDocument = require('pdfkit');
const { organizeFieldsIntoZones, normalizeFieldTag, formatFieldValue } = require('./cardRenderer.service');

/**
 * Convert zones structure to elements array for PDF generation
 */
function convertZonesToElements(layoutConfig, data, unit = 'mm') {
  const elements = [];
  
  // Check if zones exist
  if (!layoutConfig.zones) {
    return layoutConfig.elements || [];
  }
  
  const zones = layoutConfig.zones;
  let width = layoutConfig.width || 3.5; // Default: inches
  let height = layoutConfig.height || 2.0; // Default: inches
  
  // If unit is 'mm', assume width/height are already in mm
  // Otherwise, assume inches and convert to mm
  if (unit !== 'mm' && width < 100) {
    // Likely in inches (3.5" x 2.0"), convert to mm
    width = width * 25.4;
    height = height * 25.4;
  }
  
  const widthMm = width;
  const heightMm = height;
  
  // Grid layout: Header 20%, Body 70%, Footer 10%
  const headerHeight = heightMm * 0.20;
  const bodyHeight = heightMm * 0.70;
  const footerHeight = heightMm * 0.10;
  
  // Header zone
  if (zones.header?.enabled !== false) {
    // Header background (red)
    elements.push({
      type: 'rectangle',
      x: 0,
      y: 0,
      width: widthMm,
      height: headerHeight,
      color: '#dc2626',
      unit: 'mm'
    });
    
    // School name
    if (data.schoolName) {
      elements.push({
        type: 'text',
        x: widthMm / 2,
        y: headerHeight * 0.3,
        fontSize: 7,
        fontFamily: 'Helvetica-Bold',
        color: '#000000',
        content: String(data.schoolName).toUpperCase(),
        align: 'center',
        unit: 'mm'
      });
    }
    
    // School address and phone
    if (data.schoolAddress || data.adminPhone) {
      const addressText = `${data.schoolAddress || ''}${data.adminPhone ? ` Ph.: ${data.adminPhone}` : ''}`.trim();
      if (addressText) {
        elements.push({
          type: 'text',
          x: widthMm / 2,
          y: headerHeight * 0.65,
          fontSize: 4.5,
          fontFamily: 'Helvetica',
          color: '#000000',
          content: addressText.toUpperCase(),
          align: 'center',
          unit: 'mm'
        });
      }
    }
  }
  
  // Body zone
  if (zones.body) {
    const bodyY = headerHeight;
    const leftColumnWidth = zones.body.rightColumn?.photo?.enabled ? widthMm * 0.65 : widthMm * 0.95;
    const rightColumnWidth = widthMm * 0.30;
    const rightColumnX = widthMm * 0.70;
    
    let currentY = bodyY + 3; // 3mm top margin
    
    // Left column fields
    if (zones.body.leftColumn) {
      const primaryFields = zones.body.leftColumn.primaryFields || [];
      const secondaryFields = zones.body.leftColumn.secondaryFields || [];
      
      // Primary fields
      primaryFields.forEach((tag, idx) => {
        const normalizedTag = normalizeFieldTag(tag);
        const tagLower = normalizedTag.toLowerCase();
        const isName = tagLower === 'studentname';
        const label = getFieldLabel(tag);
        const value = formatFieldValue(tag, data[tag] || '');
        const fontSize = isName ? 4.5 : 3.5;
        
        if (value) {
          elements.push({
            type: 'text',
            x: 3, // 3mm left padding
            y: currentY,
            fontSize: fontSize,
            fontFamily: isName ? 'Helvetica-Bold' : 'Helvetica',
            color: '#000000',
            content: `${label}: ${value}`,
            align: 'left',
            unit: 'mm'
          });
          currentY += fontSize + 1.5;
        }
      });
      
      // Secondary fields
      secondaryFields.slice(0, 8).forEach((tag) => {
        const label = getFieldLabel(tag);
        const value = formatFieldValue(tag, data[tag] || '');
        
        if (value) {
          elements.push({
            type: 'text',
            x: 3,
            y: currentY,
            fontSize: 3.5,
            fontFamily: 'Helvetica',
            color: '#000000',
            content: `${label}: ${value}`,
            align: 'left',
            unit: 'mm'
          });
          currentY += 3.5 + 0.8;
        }
      });
    }
    
    // Right column - Photo
    if (zones.body.rightColumn?.photo?.enabled) {
      const photoWidth = 25; // ~100px equivalent
      const photoHeight = 27.5; // ~110px equivalent
      const photoX = rightColumnX;
      const photoY = bodyY + 1;
      
      // Photo placeholder rectangle (background)
      elements.push({
        type: 'rectangle',
        x: photoX,
        y: photoY,
        width: photoWidth,
        height: photoHeight,
        color: '#e5e7eb',
        unit: 'mm'
      });
      
      // Photo placeholder (image type for border)
      elements.push({
        type: 'image',
        x: photoX,
        y: photoY,
        width: photoWidth,
        height: photoHeight,
        content: data.photo || data.photoUrl || '',
        unit: 'mm'
      });
      
      // Session badge below photo
      if (data.session || data.sessionName) {
        const sessionText = `SESSION : ${data.session || data.sessionName || '2024-25'}`;
        elements.push({
          type: 'text',
          x: photoX + photoWidth / 2,
          y: photoY + photoHeight + 2,
          fontSize: 3.5,
          fontFamily: 'Helvetica-Bold',
          color: '#000000',
          content: sessionText,
          align: 'center',
          unit: 'mm'
        });
      }
    }
  }
  
  // Footer zone
  if (zones.footer?.enabled !== false) {
    const footerY = headerHeight + bodyHeight;
    
    // Footer background (red)
    elements.push({
      type: 'rectangle',
      x: 0,
      y: footerY,
      width: widthMm,
      height: footerHeight,
      color: '#dc2626',
      unit: 'mm'
    });
    
    // Footer text (email)
    if (data.schoolEmail) {
      elements.push({
        type: 'text',
        x: widthMm / 2,
        y: footerY + footerHeight / 2,
        fontSize: 3.5,
        fontFamily: 'Helvetica',
        color: '#000000',
        content: `E-mail.: ${data.schoolEmail}`,
        align: 'center',
        unit: 'mm'
      });
    }
  }
  
  return elements;
}

/**
 * Get field label for display
 */
function getFieldLabel(tag) {
  const normalizedTag = normalizeFieldTag(tag);
  
  if (normalizedTag === 'studentname' || normalizedTag === 'name') return 'NAME';
  if (normalizedTag === 'admissionno') return 'ADM.';
  if (normalizedTag === 'classname' || normalizedTag === 'class') return 'CLASS';
  if (normalizedTag === 'fathername') return 'F. NAME';
  if (normalizedTag === 'mothername') return 'M. NAME';
  if (normalizedTag === 'mobile' || normalizedTag === 'phone') return 'Ph. No.';
  if (normalizedTag === 'dob' || normalizedTag === 'dateofbirth') return 'D.O.B.';
  if (normalizedTag === 'address') return 'ADDRESS';
  if (normalizedTag === 'bloodgroup') return 'BLOOD GROUP';
  
  return tag.charAt(0).toUpperCase() + tag.slice(1).replace(/([A-Z])/g, ' $1');
}

/**
 * generatePdf
 * Render-ready JSON → PDF buffer (no disk writes, no validation, no auth, no business logic)
 * @param {Object} renderData - { layoutConfig: { width, height, unit, elements or zones }, data: { ... } }
 * @returns {Promise<Buffer>}
 */
async function generatePdf(renderDataInput) {
  return new Promise((resolve, reject) => {
    try {
      const renderList = Array.isArray(renderDataInput) ? renderDataInput : [renderDataInput];

      const chunks = [];
      let doc;

      renderList.forEach((renderData, index) => {
        try {
          const { layoutConfig = {}, data = {} } = renderData || {};
          let {
            width = 85.6,
            height = 53.98,
            unit = 'mm'
          } = layoutConfig;
          
          // Convert zones to elements if zones structure exists
          let elements = layoutConfig.elements || [];
          if (layoutConfig.zones && !layoutConfig.elements) {
            try {
              elements = convertZonesToElements(layoutConfig, data, unit);
              // After conversion, ensure width/height are in mm for PDF generation
              if (unit !== 'mm' && width < 100) {
                width = width * 25.4; // Convert inches to mm
                height = height * 25.4;
              }
              unit = 'mm'; // Force mm for PDF generation
            } catch (convertError) {
              console.error('[PDF] Error converting zones to elements:', convertError);
              // Fall back to empty elements if conversion fails
              elements = [];
            }
          }

        const mmToPoints = (mm) => mm * 2.83465;
        const pageWidth = unit === 'mm' ? mmToPoints(width) : width;
        const pageHeight = unit === 'mm' ? mmToPoints(height) : height;

        if (!doc) {
          doc = new PDFDocument({
            size: [pageWidth, pageHeight],
            margin: 0,
            autoFirstPage: true
          });
          doc.on('data', (chunk) => chunks.push(chunk));
          doc.on('end', () => resolve(Buffer.concat(chunks)));
          doc.on('error', reject);
        } else {
          doc.addPage({ size: [pageWidth, pageHeight], margin: 0 });
        }

        elements.forEach((element) => {
          const {
            type,
            x = 0,
            y = 0,
            width: elemWidth,
            height: elemHeight,
            fontSize = 12,
            fontFamily = 'Helvetica',
            color = 'black',
            content = '',
            align
          } = element;

          const elemX = unit === 'mm' ? mmToPoints(x) : x;
          const elemY = unit === 'mm' ? mmToPoints(y) : y;
          const elemW = elemWidth ? (unit === 'mm' ? mmToPoints(elemWidth) : elemWidth) : undefined;
          const elemH = elemHeight ? (unit === 'mm' ? mmToPoints(elemHeight) : elemHeight) : undefined;

          doc.font(fontFamily).fontSize(fontSize).fillColor(color);

          switch (type) {
            case 'text': {
              let textContent = content || '';
              textContent = textContent.replace(/\{\{(\w+)\}\}/g, (_, tag) =>
                data[tag] !== undefined && data[tag] !== null ? String(data[tag]) : ''
              );

              if (textContent.trim()) {
                const options = {};
                if (align) options.align = align;
                if (elemW) options.width = elemW;
                doc.text(textContent, elemX, elemY, options);
              }
              break;
            }
            case 'image': {
              const imageUrl = content || data.photo || data.photoUrl;
              if (elemW && elemH) {
                // Draw blue border (matching template design)
                doc.rect(elemX, elemY, elemW, elemH)
                  .lineWidth(0.5)
                  .strokeColor('#1d4ed8')
                  .stroke();
                
                // Placeholder text if no image
                if (!imageUrl) {
                  doc.fontSize(6).fillColor('#9ca3af').text('[Photo]', elemX + elemW / 2 - 12, elemY + elemH / 2 - 3);
                }
                // Note: Actual image loading would require additional libraries
              }
              break;
            }
            case 'rectangle': {
              if (elemW && elemH) {
                doc.rect(elemX, elemY, elemW, elemH).fill(color);
              }
              break;
            }
            case 'line': {
              if (elemW) {
                doc.moveTo(elemX, elemY).lineTo(elemX + elemW, elemY).stroke();
              }
              break;
            }
            default:
              break;
          }
        });
        } catch (renderError) {
          console.error(`[PDF] Error rendering page ${index}:`, renderError);
          // Continue with next page or reject if first page fails
          if (index === 0) {
            reject(renderError);
            return;
          }
        }
      });

      if (doc) {
        doc.end();
      } else {
        resolve(Buffer.alloc(0));
      }
    } catch (error) {
      console.error('[PDF] Error in generatePdf:', error);
      reject(error);
    }
  });
}

module.exports = {
  generatePdf
};

