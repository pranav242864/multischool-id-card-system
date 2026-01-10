/**
 * Card Renderer Service
 * Converts card data to HTML for preview
 */

const User = require('../models/User');
const School = require('../models/School');

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Normalize field tag to avoid duplicates
 */
function normalizeFieldTag(tag) {
  return tag.toLowerCase().replace(/\s+/g, '');
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
  
  // Fallback: capitalize first letter and add spaces
  return tag.charAt(0).toUpperCase() + tag.slice(1).replace(/([A-Z])/g, ' $1');
}

/**
 * Format field value for display
 */
function formatFieldValue(tag, value) {
  if (!value) return '';
  
  const normalizedTag = normalizeFieldTag(tag);
  
  // Format date if it's a date field
  if (normalizedTag === 'dob' || normalizedTag === 'dateofbirth') {
    if (value instanceof Date) {
      return escapeHtml(value.toLocaleDateString('en-GB')); // DD/MM/YYYY format
    }
    if (typeof value === 'string' && value.includes('-')) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return escapeHtml(date.toLocaleDateString('en-GB'));
      }
    }
  }
  
  return escapeHtml(String(value));
}

/**
 * Organize fields into zones based on template layoutConfig
 * Matches the frontend organizeFieldsIntoZones function exactly
 */
function organizeFieldsIntoZones(layoutConfig, dataTags) {
  // Check if zones already exist in layoutConfig
  if (layoutConfig?.zones) {
    return layoutConfig.zones;
  }
  
  // Normalize and deduplicate tags
  const normalizedTags = new Map();
  dataTags.forEach(tag => {
    const normalized = normalizeFieldTag(tag);
    if (!normalizedTags.has(normalized)) {
      normalizedTags.set(normalized, tag);
    }
  });
  
  const uniqueTags = Array.from(normalizedTags.keys());
  
  // Define field categories for proper zone placement
  const headerFields = [];
  const primaryBodyFields = [];
  const secondaryBodyFields = [];
  const footerFields = [];
  let hasPhoto = false;
  
  // Track which categories have been added to avoid duplicates
  const addedFields = new Set();
  
  uniqueTags.forEach(normalizedTag => {
    const originalTag = normalizedTags.get(normalizedTag) || normalizedTag;
    
    if (normalizedTag === 'photo' || normalizedTag === 'photourl') {
      hasPhoto = true;
      return;
    }
    
    // Skip if already added (prevent duplicates)
    if (addedFields.has(normalizedTag)) {
      return;
    }
    
    // Categorize fields based on importance and type (student-specific)
    const tagLower = normalizedTag.toLowerCase();
    
    if (tagLower === 'studentname' || tagLower === 'name') {
      primaryBodyFields.push(originalTag);
      addedFields.add('studentname');
    } else if (tagLower === 'admissionno') {
      primaryBodyFields.push(originalTag);
      addedFields.add('admissionno');
    } else if (tagLower === 'classname' || tagLower === 'class') {
      primaryBodyFields.push(originalTag);
      addedFields.add('classname');
    } else if (tagLower === 'fathername') {
      secondaryBodyFields.push(originalTag);
      addedFields.add('fathername');
    } else if (tagLower === 'mothername') {
      secondaryBodyFields.push(originalTag);
      addedFields.add('mothername');
    } else if (tagLower === 'dob' || tagLower === 'dateofbirth') {
      secondaryBodyFields.push(originalTag);
      addedFields.add('dob');
    } else if (tagLower === 'bloodgroup') {
      secondaryBodyFields.push(originalTag);
      addedFields.add('bloodgroup');
    } else if (tagLower === 'mobile' || tagLower === 'phone') {
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
  });
  
  return {
    header: {
      enabled: headerFields.length > 0,
      height: headerFields.length > 0 ? 15 : 0,
      fields: headerFields
    },
    body: {
      leftColumn: {
        primaryFields: primaryBodyFields,
        secondaryFields: secondaryBodyFields
      },
      rightColumn: {
        photo: hasPhoto ? { enabled: true, size: { width: 1.3, height: 1.7 } } : { enabled: false }
      }
    },
    footer: {
      enabled: footerFields.length > 0,
      height: footerFields.length > 0 ? 20 : 0,
      fields: footerFields
    }
  };
}

/**
 * Render card HTML from card data
 */
async function renderCardHtml(cardData, schoolId) {
  const layoutConfig = cardData.layoutConfig || {};
  const data = cardData.data || {};
  const dataTags = Object.keys(data);
  
  // Get school data
  const school = await School.findById(schoolId).select('name address contactEmail');
  const schoolName = escapeHtml(school?.name || 'SCHOOL NAME');
  const schoolAddress = escapeHtml(school?.address || 'SECTOR-XX, CITY (STATE)');
  const schoolEmail = escapeHtml(school?.contactEmail || 'school@example.com');
  
  // Get school admin phone (first admin user)
  let adminPhone = '';
  try {
    const adminUser = await User.findOne({ 
      schoolId: schoolId, 
      role: 'SCHOOLADMIN',
      status: 'ACTIVE'
    }).select('phone');
    adminPhone = escapeHtml(adminUser?.phone || '');
  } catch (error) {
    // Ignore error, use empty phone
  }
  
  // Organize fields into zones
  const zones = organizeFieldsIntoZones(layoutConfig, dataTags);
  
  const bgImage = layoutConfig?.backgroundImage || '';
  const hasPhoto = zones.body?.rightColumn?.photo?.enabled || dataTags.includes('photo') || dataTags.includes('photoUrl');
  // Don't escape photoUrl as it's used in img src attribute
  const photoUrl = (data.photo || data.photoUrl || '').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  
  // Get session name if available
  const sessionName = escapeHtml(data.session || data.sessionName || '2024-25');
  
  // Build HTML - Matching template preview exactly
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student ID Card Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      background-color: #f3f4f6; 
      padding: 32px; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      min-height: 100vh; 
    }
  </style>
</head>
<body>
  <div class="max-w-sm mx-auto bg-white rounded-lg shadow-lg overflow-hidden aspect-[3.5/2] relative" style="width: 350px; height: 200px; max-width: 350px;">
    ${bgImage ? `
    <div class="absolute inset-0 opacity-20" style="background-image: url('${bgImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;"></div>
    ` : ''}
    
    <div class="absolute inset-0 grid relative z-10 overflow-hidden h-full" style="grid-template-rows: 20% 70% 10%; height: 100%;">
      <!-- HEADER ZONE -->
      <div class="bg-red-600 px-2 py-1 flex items-center justify-center relative overflow-visible" style="grid-row: 1 / 2; height: 100%; max-height: 100%; min-height: 0;">
        <div class="flex flex-col justify-center items-center text-center w-full" style="padding-top: 4px; padding-bottom: 2px; gap: 1px;">
          <div class="font-extrabold uppercase leading-tight tracking-tight" style="color: #000000; font-weight: bold; font-size: 25px; line-height: 1.1; margin-bottom: 0; padding-bottom: 0;">
            ${schoolName.toUpperCase()}
          </div>
          <div class="uppercase tracking-tight font-semibold" style="color: #000000; font-size: 16px; line-height: 1.1; font-weight: 600; margin-top: 0; padding-top: 0;">
            ${schoolAddress}${adminPhone ? ` Ph.: ${adminPhone}` : ''}
          </div>
        </div>
        <div class="absolute bottom-0 left-0 right-0 h-[1px] bg-red-400" style="background-image: repeating-linear-gradient(to right, #fca5a5 0px, #fca5a5 2px, transparent 2px, transparent 4px);"></div>
      </div>
      
      <!-- BODY ZONE -->
      <div class="px-2 py-2 flex gap-2 overflow-hidden min-h-0" style="grid-row: 2 / 3; height: 100%; max-height: 100%; overflow: hidden; background-color: transparent; margin-top: 3px;">
        <!-- LEFT COLUMN -->
        <div class="flex-1 flex flex-col gap-0.5 overflow-hidden min-w-0 max-h-full">
          <div class="flex-1 overflow-hidden min-h-0 max-h-full" style="padding-left: 8px; margin-left: 0; padding-right: 0; padding-top: 0; padding-bottom: 0;">
            <div class="space-y-[2px]" style="width: 100%; padding: 0; margin: 0;">
              ${zones.body?.leftColumn?.primaryFields?.map((tag, idx) => {
                const normalizedTag = normalizeFieldTag(tag);
                const tagLower = normalizedTag.toLowerCase();
                const isName = tagLower === 'studentname';
                let tagLabel = '';
                
                // Generate label based on normalized tag (matching template preview)
                if (tagLower === 'studentname' || tagLower === 'name') tagLabel = 'NAME';
                else if (tagLower === 'admissionno') tagLabel = 'ADM.';
                else if (tagLower === 'classname' || tagLower === 'class') tagLabel = 'CLASS';
                else {
                  // Fallback: capitalize first letter and add spaces before uppercase letters
                  tagLabel = normalizedTag.charAt(0).toUpperCase() + normalizedTag.slice(1).replace(/([A-Z])/g, ' $1');
                }
                
                const value = formatFieldValue(tag, data[tag] || '');
                // Match template preview exactly: use Tailwind classes text-[5px] and text-[4px]
                // These are rendered by Tailwind CDN, so use classes + inline fallback
                const fontSizeClass = isName ? 'text-[5px]' : 'text-[4px]';
                const fontSizeInline = isName ? '11px' : '9px'; // Fallback if Tailwind doesn't render
                const fontWeight = isName ? 'bold' : '600';
                return `
                <div class="text-gray-900 leading-tight block ${fontSizeClass} ${isName ? 'font-bold' : 'font-semibold'}" style="font-size: ${fontSizeInline}; font-weight: ${fontWeight}; text-align: left; padding: 0; margin: 0; width: 100%; display: block; line-height: 1.2;">
                  <span class="font-bold" style="font-weight: bold;">${tagLabel.toUpperCase()} :</span> <span>${value}</span>
                </div>
                `;
              }).join('') || ''}
              
              ${zones.body?.leftColumn?.secondaryFields?.slice(0, 8).map((tag, idx) => {
                const normalizedTag = normalizeFieldTag(tag);
                const tagLower = normalizedTag.toLowerCase();
                let tagLabel = '';
                
                // Format labels to match reference image exactly (matching template preview)
                if (tagLower === 'fathername') tagLabel = 'F. NAME';
                else if (tagLower === 'mothername') tagLabel = 'M. NAME';
                else if (tagLower === 'mobile' || tagLower === 'phone') tagLabel = 'Ph. No.';
                else if (tagLower === 'dob' || tagLower === 'dateofbirth') tagLabel = 'D.O.B.';
                else if (tagLower === 'address') tagLabel = 'ADDRESS';
                else if (tagLower === 'bloodgroup') tagLabel = 'BLOOD GROUP';
                else {
                  // Fallback: capitalize first letter and add spaces
                  tagLabel = normalizedTag.charAt(0).toUpperCase() + normalizedTag.slice(1).replace(/([A-Z])/g, ' $1');
                }
                
                const value = formatFieldValue(tag, data[tag] || '');
                return `
                <div class="text-[4px] text-gray-900 leading-tight font-semibold block" style="font-size: 9px; font-weight: 600; text-align: left; padding: 0; margin: 0; width: 100%; display: block; line-height: 1.2;">
                  <span class="font-bold" style="font-weight: bold;">${tagLabel.toUpperCase()} :</span> <span>${value}</span>
                </div>
                `;
              }).join('') || ''}
            </div>
          </div>
        </div>
        
        <!-- RIGHT COLUMN -->
        ${hasPhoto ? `
        <div class="flex-shrink-0 flex flex-col items-end pt-1 gap-1" style="width: 100px;">
          <div class="w-[100px] h-[110px] border-2 border-blue-700 rounded-sm overflow-hidden shadow-sm bg-gray-200 flex items-center justify-center">
            ${photoUrl ? `
            <img src="${photoUrl}" alt="Student Photo" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjExMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjExMCIgZmlsbD0iI0U1RTdFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5QaG90bzwvdGV4dD48L3N2Zz4='" />
            ` : `
            <div class="w-full h-full flex items-center justify-center text-gray-500 text-xs">Photo</div>
            `}
          </div>
          <div class="bg-yellow-400 rounded-full px-2 py-0.5 inline-block w-fit shadow-sm flex-shrink-0" style="margin-right: 0;">
            <span class="text-[4px] font-bold text-gray-900" style="font-size: 9px; font-weight: bold; color: #111827;">SESSION : ${sessionName}</span>
          </div>
        </div>
        ` : ''}
      </div>
      
      <!-- FOOTER ZONE -->
      <div class="bg-red-600 px-2 py-1 flex items-center justify-center text-[5px] font-semibold overflow-hidden" style="grid-row: 3 / 4; height: 100%; max-height: 100%; align-self: end; font-size: 11px; font-weight: 600;">
        <div class="uppercase leading-tight" style="color: #000000;">
          <span class="font-bold" style="font-weight: bold;">E-mail.:</span> ${schoolEmail}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  return html;
}

module.exports = {
  renderCardHtml,
  organizeFieldsIntoZones,
  normalizeFieldTag,
  formatFieldValue
};
