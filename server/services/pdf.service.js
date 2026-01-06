const PDFDocument = require('pdfkit');

/**
 * generatePdf
 * Render-ready JSON → PDF buffer (no disk writes, no validation, no auth, no business logic)
 * @param {Object} renderData - { layoutConfig: { width, height, unit, elements }, data: { ... } }
 * @returns {Promise<Buffer>}
 */
async function generatePdf(renderDataInput) {
  return new Promise((resolve, reject) => {
    try {
      const renderList = Array.isArray(renderDataInput) ? renderDataInput : [renderDataInput];

      const chunks = [];
      let doc;

      renderList.forEach((renderData, index) => {
        const { layoutConfig = {}, data = {} } = renderData || {};
        const {
          width = 85.6,
          height = 53.98,
          unit = 'mm',
          elements = []
        } = layoutConfig;

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
              if (imageUrl && elemW && elemH) {
                // Placeholder rectangle; actual image loading intentionally omitted
                doc.rect(elemX, elemY, elemW, elemH).stroke();
                doc.fontSize(8).fillColor('gray').text('[Photo]', elemX + elemW / 2 - 15, elemY + elemH / 2 - 4);
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
      });

      if (doc) {
        doc.end();
      } else {
        resolve(Buffer.alloc(0));
      }
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generatePdf
};

