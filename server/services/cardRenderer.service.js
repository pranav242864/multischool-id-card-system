const School = require('../models/School');
const User = require('../models/User');

/**
 * Normalize field tags to avoid duplicates
 * Maps variations of the same field to a canonical lowercase name for consistent comparison
 * @param {String} tag - Field tag to normalize
 * @returns {String} - Normalized tag
 */
function normalizeFieldTag(tag) {
  const normalizedTag = tag.toLowerCase().trim();
  
  // Map variations to canonical lowercase names for consistent comparison
  if (normalizedTag === 'class' || normalizedTag === 'classname') {
    return 'classname';
  }
  if (normalizedTag === 'dob' || normalizedTag === 'dateofbirth') {
    return 'dob';
  }
  if (normalizedTag === 'mobile' || normalizedTag === 'phone') {
    return 'mobile';
  }
  if (normalizedTag === 'photo' || normalizedTag === 'photourl') {
    return 'photo';
  }
  if (normalizedTag === 'studentname' || normalizedTag === 'name') {
    return 'studentname';
  }
  if (normalizedTag === 'fathername' || normalizedTag === 'father') {
    return 'fathername';
  }
  if (normalizedTag === 'mothername' || normalizedTag === 'mother') {
    return 'mothername';
  }
  
  // Return lowercase version of original tag for consistent comparison
  return normalizedTag;
}

/**
 * Format field value for display
 * @param {String} tag - Field tag
 * @param {Any} value - Field value
 * @returns {String} - Formatted value
 */
function formatFieldValue(tag, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const normalizedTag = normalizeFieldTag(tag);
  
  // Format dates
  if (normalizedTag === 'dob' || normalizedTag === 'dateofbirth') {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    if (typeof value === 'string') {
      // Try to parse and format
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      return value; // Return as-is if not a valid date
    }
  }
  
  // Format mobile numbers
  if (normalizedTag === 'mobile' || normalizedTag === 'phone') {
    return String(value);
  }
  
  // Return as string for all other types
  return String(value);
}

/**
 * Organize fields into zones based on field type
 * This categorizes fields into header, body (left/right columns), and footer zones
 * @param {Array<String>} dataTags - Array of field tags
 * @param {String} templateType - 'STUDENT' or 'TEACHER'
 * @returns {Object} - Zones structure
 */
function organizeFieldsIntoZones(dataTags, templateType) {
  // First, normalize and deduplicate tags
  // Remove duplicates from input array first
  const uniqueInputTags = Array.from(new Set(dataTags));
  
  const normalizedTags = new Map();
  uniqueInputTags.forEach(tag => {
    const normalized = normalizeFieldTag(tag);
    // Keep the first occurrence, but prefer longer/more specific names
    if (!normalizedTags.has(normalized) || tag.length > (normalizedTags.get(normalized)?.length || 0)) {
      normalizedTags.set(normalized, tag);
    }
  });
  
  // Convert map keys to array of unique normalized tags (these are already unique)
  const uniqueTags = Array.from(normalizedTags.keys());
  
  // Define field categories for proper zone placement
  const headerFields = []; // Reserved for school name/logo (future use)
  
  // Primary body fields (left column) - main identification
  const primaryBodyFields = [];
  // Secondary body fields (left column) - metadata
  const secondaryBodyFields = [];
  
  // Footer fields - additional info
  const footerFields = [];
  
  // Photo is handled separately in right column
  let hasPhoto = false;
  
  // Track which categories have been added to avoid duplicates
  const addedFields = new Set();

  uniqueTags.forEach(normalizedTag => {
    const originalTag = normalizedTags.get(normalizedTag) || normalizedTag;
    
    if (normalizedTag === 'photo') {
      hasPhoto = true;
      return;
    }

    // Skip if already added (prevent duplicates)
    if (addedFields.has(normalizedTag)) {
      return;
    }

    // Categorize fields based on importance and type
    const tagLower = normalizedTag.toLowerCase();
    
    if (templateType === 'STUDENT' || templateType === 'student') {
      // Student-specific field categorization
      if (tagLower === 'studentname') {
        primaryBodyFields.push(originalTag);
        addedFields.add('studentname');
      } else if (tagLower === 'admissionno') {
        primaryBodyFields.push(originalTag);
        addedFields.add('admissionno');
      } else if (tagLower === 'classname') {
        primaryBodyFields.push(originalTag);
        addedFields.add('classname');
      } else if (tagLower === 'fathername') {
        secondaryBodyFields.push(originalTag);
        addedFields.add('fathername');
      } else if (tagLower === 'mothername') {
        secondaryBodyFields.push(originalTag);
        addedFields.add('mothername');
      } else if (tagLower === 'dob') {
        secondaryBodyFields.push(originalTag);
        addedFields.add('dob');
      } else if (tagLower === 'bloodgroup') {
        secondaryBodyFields.push(originalTag);
        addedFields.add('bloodgroup');
      } else if (tagLower === 'mobile') {
        secondaryBodyFields.push(originalTag);
        addedFields.add('mobile');
      } else if (tagLower === 'address') {
        secondaryBodyFields.push(originalTag);
        addedFields.add('address');
      } else {
        // Default to secondary body for unknown fields (only if not already added)
        if (!addedFields.has(tagLower)) {
          secondaryBodyFields.push(originalTag);
          addedFields.add(tagLower);
        }
      }
    } else {
      // Teacher-specific field categorization
      if (tagLower === 'name' || tagLower === 'teachername') {
        primaryBodyFields.push(originalTag);
        addedFields.add('name');
      } else if (tagLower === 'email') {
        primaryBodyFields.push(originalTag);
        addedFields.add('email');
      } else if (tagLower === 'classid') {
        primaryBodyFields.push(originalTag);
        addedFields.add('classid');
      } else if (tagLower === 'schoolid') {
        primaryBodyFields.push(originalTag);
        addedFields.add('schoolid');
      } else if (tagLower === 'mobile') {
        secondaryBodyFields.push(originalTag);
        addedFields.add('mobile');
      } else {
        // Default to secondary body for unknown fields (only if not already added)
        if (!addedFields.has(tagLower)) {
          secondaryBodyFields.push(originalTag);
          addedFields.add(tagLower);
        }
      }
    }
  });

  return {
    zones: {
      header: {
        enabled: headerFields.length > 0,
        height: headerFields.length > 0 ? 15 : 0, // Percentage of card height
        fields: headerFields
      },
      body: {
        leftColumn: {
          primaryFields: primaryBodyFields,
          secondaryFields: secondaryBodyFields
        },
        rightColumn: {
          photo: hasPhoto ? { enabled: true, size: { width: 1.3, height: 1.7 } } : { enabled: false } // Passport size in inches
        }
      },
      footer: {
        enabled: footerFields.length > 0,
        height: footerFields.length > 0 ? 20 : 0, // Percentage of card height
        fields: footerFields
      }
    }
  };
}

/**
 * Render card HTML for preview
 * @param {Object} cardData - Card data from generateCardData
 * @param {String} schoolId - School ID
 * @returns {Promise<String>} - HTML string
 */
async function renderCardHtml(cardData, schoolId) {
  // Fetch school data for header/footer
  const school = await School.findById(schoolId).lean();
  const schoolAdmin = school ? await User.findOne({ 
    schoolId: schoolId, 
    role: 'SCHOOLADMIN' 
  }).lean() : null;

  const schoolName = school?.name || 'SCHOOL NAME';
  const schoolAddress = school?.address || 'SECTOR-XX, CITY (STATE)';
  const adminPhone = schoolAdmin?.phone || '';
  const schoolEmail = school?.contactEmail || 'school@example.com';

  // Get layout config and data
  const { layoutConfig = {}, data = {} } = cardData;
  
  // Extract zones from layoutConfig or create from dataTags for backward compatibility
  let zones;
  if (layoutConfig.zones) {
    zones = layoutConfig.zones;
  } else {
    // Fallback: organize fields from cardData.data keys
    const dataTags = Object.keys(data).filter(key => data[key] !== null && data[key] !== undefined && data[key] !== '');
    const organized = organizeFieldsIntoZones(dataTags, cardData.templateType || 'STUDENT');
    zones = organized.zones;
  }

  const bgImage = layoutConfig.backgroundImage || null;
  const hasPhoto = zones.body?.rightColumn?.photo?.enabled || data.photo || data.photoUrl;

  // Build HTML
  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>';
  html += 'body { margin: 0; padding: 0; font-family: Arial, sans-serif; }';
  html += '.card-container { width: 350px; height: 200px; margin: 0 auto; background: white; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }';
  html += '.card-grid { display: grid; grid-template-rows: 20% 70% 10%; height: 100%; position: relative; }';
  html += '.header-zone { background: #dc2626; padding: 4px 8px; display: flex; align-items: center; justify-content: center; }';
  html += '.header-content { text-align: center; color: #000; }';
  html += '.header-title { font-weight: bold; font-size: 14px; line-height: 1.1; margin-bottom: 2px; }';
  html += '.header-subtitle { font-size: 9px; line-height: 1.1; }';
  html += '.body-zone { padding: 6px 8px; display: flex; gap: 8px; overflow: hidden; }';
  html += '.left-column { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 9px; }';
  html += '.field-row { display: block; line-height: 1.2; }';
  html += '.field-label { font-weight: bold; }';
  html += '.right-column { flex-shrink: 0; width: 100px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }';
  html += '.photo-placeholder { width: 100px; height: 110px; border: 2px solid #1d4ed8; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #9ca3af; }';
  html += '.session-badge { background: #fbbf24; border-radius: 999px; padding: 2px 8px; font-size: 8px; font-weight: bold; }';
  html += '.footer-zone { background: #dc2626; padding: 4px 8px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #000; }';
  html += '</style></head><body>';
  html += '<div class="card-container">';
  
  // Background image layer (if provided)
  if (bgImage) {
    html += `<div style="position: absolute; inset: 0; opacity: 0.2; background-image: url('${bgImage}'); background-size: cover; background-position: center;"></div>`;
  }
  
  html += '<div class="card-grid">';
  
  // HEADER ZONE
  html += '<div class="header-zone">';
  html += '<div class="header-content">';
  html += `<div class="header-title">${schoolName.toUpperCase()}</div>`;
  html += `<div class="header-subtitle">${schoolAddress.toUpperCase()}${adminPhone ? ` Ph.: ${adminPhone}` : ''}</div>`;
  html += '</div></div>';
  
  // BODY ZONE
  html += '<div class="body-zone">';
  
  // Left column - Fields
  html += '<div class="left-column">';
  
  // Primary fields
  if (zones.body?.leftColumn?.primaryFields) {
    zones.body.leftColumn.primaryFields.forEach(tag => {
      const normalizedTag = normalizeFieldTag(tag);
      const value = formatFieldValue(tag, data[tag] || '');
      if (value) {
        let label = '';
        if (normalizedTag === 'studentname') label = 'NAME';
        else if (normalizedTag === 'admissionno') label = 'ADM.';
        else if (normalizedTag === 'classname') label = 'CLASS';
        else label = tag.charAt(0).toUpperCase() + tag.slice(1).replace(/([A-Z])/g, ' $1');
        
        const isName = normalizedTag === 'studentname';
        const fontSize = isName ? '11px' : '9px';
        html += `<div class="field-row" style="font-size: ${fontSize}; font-weight: ${isName ? 'bold' : 'normal'};">`;
        html += `<span class="field-label">${label}:</span> ${value}`;
        html += '</div>';
      }
    });
  }
  
  // Secondary fields
  if (zones.body?.leftColumn?.secondaryFields) {
    zones.body.leftColumn.secondaryFields.slice(0, 8).forEach(tag => {
      const normalizedTag = normalizeFieldTag(tag);
      const value = formatFieldValue(tag, data[tag] || '');
      if (value) {
        let label = '';
        if (normalizedTag === 'fathername') label = 'F. NAME';
        else if (normalizedTag === 'mothername') label = 'M. NAME';
        else if (normalizedTag === 'mobile') label = 'Ph. No.';
        else if (normalizedTag === 'dob') label = 'D.O.B.';
        else if (normalizedTag === 'address') label = 'ADDRESS';
        else if (normalizedTag === 'bloodgroup') label = 'BLOOD GROUP';
        else label = tag.charAt(0).toUpperCase() + tag.slice(1).replace(/([A-Z])/g, ' $1');
        
        html += '<div class="field-row">';
        html += `<span class="field-label">${label}:</span> ${value}`;
        html += '</div>';
      }
    });
  }
  
  html += '</div>'; // End left-column
  
  // Right column - Photo
  if (hasPhoto) {
    html += '<div class="right-column">';
    html += '<div class="photo-placeholder">';
    const photoUrl = data.photo || data.photoUrl || '';
    if (photoUrl) {
      html += `<img src="${photoUrl}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'[Photo]\';" />`;
    } else {
      html += '[Photo]';
    }
    html += '</div>';
    
    // Session badge
    if (data.session || data.sessionName) {
      const sessionText = `SESSION : ${data.session || data.sessionName || '2024-25'}`;
      html += `<div class="session-badge">${sessionText}</div>`;
    }
    
    html += '</div>'; // End right-column
  }
  
  html += '</div>'; // End body-zone
  
  // FOOTER ZONE
  html += '<div class="footer-zone">';
  html += `<span style="font-weight: bold;">E-mail.:</span> ${schoolEmail}`;
  html += '</div>';
  
  html += '</div>'; // End card-grid
  html += '</div>'; // End card-container
  html += '</body></html>';
  
  return html;
}

module.exports = {
  organizeFieldsIntoZones,
  normalizeFieldTag,
  formatFieldValue,
  renderCardHtml
};
