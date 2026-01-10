import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Edit, Trash2, Eye, Upload, School, FileText, ChevronRight, UserCircle, GraduationCap, Loader2 } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { schoolAPI, templateAPI, adminAPI, APIError } from '../../utils/api';

type TemplateType = 'student' | 'teacher' | 'STUDENT' | 'TEACHER';

interface Template {
  _id?: string;
  id?: string;
  name: string;
  type: TemplateType;
  school?: string;
  schoolId?: any;
  createdAt?: string;
  updatedAt?: string;
  lastModified?: string;
  isActive?: boolean;
  status?: 'active' | 'draft' | 'ACTIVE' | 'DRAFT';
  layoutConfig?: any;
  dataTags?: string[];
}

export function TemplateManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [templateType, setTemplateType] = useState<TemplateType>('student');
  const [schools, setSchools] = useState<any[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [schoolAdmin, setSchoolAdmin] = useState<any>(null);

  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await schoolAPI.getSchools();
        if (response.success && response.data) {
          // Map backend data to frontend format
          const mappedSchools = response.data.map((school: any) => ({
            _id: school._id,
            id: school._id,
            name: school.name || '',
            address: school.address || '',
            contactEmail: school.contactEmail || '',
            phone: school.phone || school.mobile || school.contactEmail || '',
            city: school.city || '',
          }));
          setSchools(mappedSchools);
        }
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.message || 'Failed to load schools');
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchoolId) {
      const fetchTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
          const typeUpper = templateType.toUpperCase() as 'STUDENT' | 'TEACHER';
          const response = await templateAPI.getTemplates(typeUpper, selectedSchoolId);
          if (response.success && response.data) {
            // Map backend data to frontend format
            const mappedTemplates = response.data.map((template: any) => ({
              _id: template._id,
              id: template._id,
              name: template.name || 'Unnamed Template',
              type: template.type?.toLowerCase() as TemplateType,
              school: template.schoolId?.name || 'N/A',
              schoolId: template.schoolId,
              createdAt: template.createdAt,
              updatedAt: template.updatedAt,
              lastModified: template.updatedAt || template.createdAt,
              isActive: template.isActive,
              status: template.isActive ? 'active' : 'draft',
            }));
            setTemplates(mappedTemplates);
          }
        } catch (err) {
          const apiError = err as APIError;
          setError(apiError.message || 'Failed to load templates');
        } finally {
          setLoading(false);
        }
      };

      fetchTemplates();
    }
  }, [selectedSchoolId, templateType]);

  const filteredTemplates = templates;

  // Get default fields based on template type
  const getDefaultFields = (type: TemplateType) => {
    switch (type.toLowerCase()) {
      case 'teacher':
        return {
          name: true,
          email: true,
          mobile: true,
          classId: false,
          schoolId: true,
          photo: true,
        };
      default: // student
        return {
          studentName: true,
          admissionNo: true,
          class: true,
          fatherName: false,
          motherName: false,
          dob: true,
          bloodGroup: false,
          mobile: true,
          address: false,
          photo: true,
        };
    }
  };

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState({
    name: '',
    backgroundImage: null as File | null,
    backgroundImageUrl: null as string | null,
    fields: getDefaultFields(templateType),
  });

  const handleTemplateTypeChange = (type: TemplateType) => {
    setTemplateType(type);
    setTemplateData({
      ...templateData,
      fields: getDefaultFields(type),
    });
  };

  // Helper function to normalize field tags to avoid duplicates
  // Maps variations of the same field to a canonical lowercase name for consistent comparison
  const normalizeFieldTag = (tag: string): string => {
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
    // No need to check duplicates for single values - they're already normalized
    
    // Return lowercase version of original tag for consistent comparison
    return normalizedTag;
  };

  // Helper function to organize fields into zones based on field type
  // This categorizes fields into header, body (left/right columns), and footer zones
  const organizeFieldsIntoZones = (dataTags: string[], templateType: TemplateType) => {
    // First, normalize and deduplicate tags
    // Remove duplicates from input array first
    const uniqueInputTags = Array.from(new Set(dataTags));
    
    const normalizedTags = new Map<string, string>();
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
    const headerFields: string[] = []; // Reserved for school name/logo (future use)
    
    // Primary body fields (left column) - main identification
    const primaryBodyFields: string[] = [];
    // Secondary body fields (left column) - metadata
    const secondaryBodyFields: string[] = [];
    
    // Footer fields - additional info
    const footerFields: string[] = [];
    
    // Photo is handled separately in right column
    let hasPhoto = false;
    
    // Track which categories have been added to avoid duplicates
    const addedFields = new Set<string>();

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
      
      if (templateType === 'student' || templateType === 'STUDENT') {
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
        if (tagLower === 'name') {
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
            photo: hasPhoto ? { enabled: true, size: { width: 1.3, height: 1.7 } } : { enabled: false } // Passport size in inches (35mm x 45mm ≈ 1.38" x 1.77")
          }
        },
        footer: {
          enabled: footerFields.length > 0,
          height: footerFields.length > 0 ? 20 : 0, // Percentage of card height
          fields: footerFields
        }
      }
    };
  };

  // Helper function to get sample data for a field tag
  // Returns only values without labels to avoid duplication with field labels
  const getSampleDataForTag = (tag: string, templateType: TemplateType, selectedSchool?: string): string => {
    const normalizedTag = tag.toLowerCase();
    
    if (templateType === 'student' || templateType === 'STUDENT') {
      switch (normalizedTag) {
        case 'studentname':
          return 'Rajesh Kumar';
        case 'admissionno':
          return '2024-001'; // Removed "Adm:" prefix
        case 'class':
        case 'classname':
          return '10-A'; // Removed "Class:" prefix
        case 'fathername':
          return 'Suresh Kumar'; // Removed "Father:" prefix
        case 'mothername':
          return 'Priya Kumar'; // Removed "Mother:" prefix
        case 'dob':
        case 'dateofbirth':
          return '15/05/2010'; // Removed "DOB:" prefix
        case 'bloodgroup':
          return 'O+'; // Removed "Blood:" prefix
        case 'mobile':
        case 'phone':
          return '+91 98765 43210'; // Removed "Mobile:" prefix
        case 'address':
          return '123 Main St, City';
        default:
          return tag;
      }
    } else {
      switch (normalizedTag) {
        case 'name':
          return 'Dr. Priya Sharma';
        case 'email':
          return 'priya.sharma@school.com';
        case 'mobile':
        case 'phone':
          return '+91 98765 43210'; // Removed "Mobile:" prefix
        case 'schoolid':
          return selectedSchool || 'School Name';
        case 'classid':
          return '10-A'; // Removed "Class:" prefix
        default:
          return tag;
      }
    }
  };

  // Helper function to render ID card preview with zoned layout
  const renderCardPreview = (
    layoutConfig: any,
    dataTags: string[],
    templateType: TemplateType,
    backgroundImageUrl?: string | null
  ) => {
    // Backward compatibility: Check if old flat fields structure exists
    const hasZones = layoutConfig?.zones;
    const hasOldFields = layoutConfig?.fields && Array.isArray(layoutConfig.fields);
    
    // Extract zones from layoutConfig or create from dataTags for backward compatibility
    let zones;
    if (hasZones) {
      zones = layoutConfig.zones;
    } else if (hasOldFields) {
      // Convert old structure to new zoned structure for backward compatibility
      const oldTags = layoutConfig.fields.map((f: any) => f.tag || f);
      const organized = organizeFieldsIntoZones(oldTags, templateType);
      zones = organized.zones;
    } else {
      // Fallback: organize current dataTags
      const organized = organizeFieldsIntoZones(dataTags, templateType);
      zones = organized.zones;
    }

    const bgImage = backgroundImageUrl || layoutConfig?.backgroundImage;
    const hasPhoto = zones.body?.rightColumn?.photo?.enabled || dataTags.includes('photo') || dataTags.includes('photoUrl');
    
    // Get selected school data for header
    const selectedSchoolData = schools.find((school: any) => (school._id || school.id) === selectedSchoolId);
    const schoolName = selectedSchoolData?.name || selectedSchool || 'SCHOOL NAME';
    const schoolAddress = selectedSchoolData?.address || 'SECTOR-XX, CITY (STATE)';
    // Use school admin's phone number instead of school's phone
    const adminPhone = schoolAdmin?.phone || '';

    return (
      <div 
        className="max-w-sm mx-auto bg-white rounded-lg shadow-lg overflow-hidden aspect-[3.5/2] relative"
      >
        {/* Background image layer (if provided) - optional overlay */}
        {bgImage && (
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          ></div>
        )}

        {/* Card Content with Reference Image Layout (DAV School ID Card Style) - Using Grid for fixed layout */}
        {/* Grid: Header 20%, Body 70%, Footer 10% - Total 100% - Footer always stays at bottom */}
        <div className="absolute inset-0 grid relative z-10 overflow-hidden h-full" style={{ 
          gridTemplateRows: '20% 70% 10%',
          height: '100%'
        }}>
          {/* HEADER ZONE: Red background with school name and address - Fixed at top */}
          <div className="bg-red-600 px-2 py-1 flex items-center justify-center relative overflow-visible" style={{ gridRow: '1 / 2', height: '100%', maxHeight: '100%', minHeight: '0' }}>
            {/* School Name and Address - Centered */}
            <div className="flex flex-col justify-center items-center text-center w-full" style={{ paddingTop: '4px', paddingBottom: '2px', gap: '1px' }}>
              <div className="font-extrabold uppercase leading-tight tracking-tight" style={{ color: '#000000', fontWeight: 'bold', fontSize: '25px', lineHeight: '1.1', marginBottom: '0', paddingBottom: '0' }}>
                {schoolName.toUpperCase()}
              </div>
              <div className="uppercase tracking-tight font-semibold" style={{ color: '#000000', fontSize: '16px', lineHeight: '1.1', fontWeight: '600', marginTop: '0', paddingTop: '0' }}>
                {schoolAddress}{adminPhone ? ` Ph.: ${adminPhone}` : ''}
              </div>
            </div>
            
            {/* Dotted red separator line at bottom of header - Fixed at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-red-400" style={{
              backgroundImage: 'repeating-linear-gradient(to right, #fca5a5 0px, #fca5a5 2px, transparent 2px, transparent 4px)'
            }}></div>
          </div>

          {/* BODY ZONE: Transparent background with student details (left) and photo (right) - Scrollable if needed, fixed between header and footer */}
          <div className="px-2 py-2 flex gap-2 overflow-hidden min-h-0" style={{ gridRow: '2 / 3', height: '100%', maxHeight: '100%', overflow: 'hidden', backgroundColor: 'transparent', marginTop: '3px' }}>
            {/* LEFT COLUMN: Student Details - All fields aligned in straight vertical line */}
            <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-w-0 max-h-full">
              {/* Student Information Fields - Format: "LABEL : value" - All fields in straight vertical line, perfectly left-aligned */}
              <div className="flex-1 overflow-hidden min-h-0 max-h-full" style={{ paddingLeft: '8px', marginLeft: '0', paddingRight: '0', paddingTop: '0', paddingBottom: '0' }}>
                <div className="space-y-[2px]" style={{ width: '100%', padding: '0', margin: '0' }}>
                  {/* Primary fields (NAME, CLASS, ADMISSION) */}
                  {zones.body?.leftColumn?.primaryFields && zones.body.leftColumn.primaryFields.length > 0 && (
                    <>
                      {zones.body.leftColumn.primaryFields.map((tag: string, idx: number) => {
                        const normalizedTag = normalizeFieldTag(tag);
                        const tagLower = normalizedTag.toLowerCase();
                        const isName = tagLower === 'studentname';
                        let tagLabel = '';
                        
                        // Generate label based on normalized tag
                        if (tagLower === 'studentname') tagLabel = 'NAME';
                        else if (tagLower === 'admissionno') tagLabel = 'ADM.';
                        else if (tagLower === 'classname') tagLabel = 'CLASS';
                        else {
                          // Fallback: capitalize first letter and add spaces before uppercase letters
                          tagLabel = normalizedTag.charAt(0).toUpperCase() + normalizedTag.slice(1).replace(/([A-Z])/g, ' $1');
                        }
                        
                        return (
                          <div
                            key={`primary-${normalizedTag}-${idx}`}
                            className={`text-gray-900 leading-tight block ${
                              isName ? 'text-[5px] font-bold' : 'text-[4px] font-semibold'
                            }`}
                            style={{ textAlign: 'left', padding: '0', margin: '0', width: '100%', display: 'block', lineHeight: '1.2' }}
                          >
                            <span className="font-bold">{tagLabel.toUpperCase()} :</span> <span>{getSampleDataForTag(normalizedTag, templateType, selectedSchool)}</span>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Secondary fields (F. NAME, M. NAME, Ph. No., D.O.B., ADDRESS) */}
                  {zones.body?.leftColumn?.secondaryFields && zones.body.leftColumn.secondaryFields.length > 0 && (
                    <>
                      {zones.body.leftColumn.secondaryFields.slice(0, 8).map((tag: string, idx: number) => {
                        const normalizedTag = normalizeFieldTag(tag);
                        const tagLower = normalizedTag.toLowerCase();
                        let tagLabel = '';
                        
                        // Format labels to match reference image exactly
                        if (tagLower === 'fathername') tagLabel = 'F. NAME';
                        else if (tagLower === 'mothername') tagLabel = 'M. NAME';
                        else if (tagLower === 'mobile') tagLabel = 'Ph. No.';
                        else if (tagLower === 'dob') tagLabel = 'D.O.B.';
                        else if (tagLower === 'address') tagLabel = 'ADDRESS';
                        else if (tagLower === 'bloodgroup') tagLabel = 'BLOOD GROUP';
                        else {
                          // Fallback: capitalize first letter and add spaces
                          tagLabel = normalizedTag.charAt(0).toUpperCase() + normalizedTag.slice(1).replace(/([A-Z])/g, ' $1');
                        }
                        
                        return (
                          <div
                            key={`secondary-${normalizedTag}-${idx}`}
                            className="text-[4px] text-gray-900 leading-tight font-semibold block"
                            style={{ textAlign: 'left', padding: '0', margin: '0', width: '100%', display: 'block', lineHeight: '1.2' }}
                          >
                            <span className="font-bold">{tagLabel.toUpperCase()} :</span> <span>{getSampleDataForTag(normalizedTag, templateType, selectedSchool)}</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Passport Photo with dark blue border (matches reference) */}
            {hasPhoto && (
              <div className="flex-shrink-0 flex flex-col items-end pt-1 gap-1" style={{ width: '100px' }}>
                <div className="w-[100px] h-[110px] border-2 border-blue-700 rounded-sm overflow-hidden shadow-sm bg-gray-200 flex items-center justify-center">
                  <img 
                    src="https://via.placeholder.com/100x110/4F46E5/FFFFFF?text=Photo" 
                    alt="Student Photo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjExMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjExMCIgZmlsbD0iI0U1RTdFQiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5QaG90bzwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                </div>
                {/* Session highlighted in yellow oval/ellipse - Positioned below photo */}
                <div className="bg-yellow-400 rounded-full px-2 py-0.5 inline-block w-fit shadow-sm flex-shrink-0" style={{ marginRight: '0' }}>
                  <span className="text-[4px] font-bold text-gray-900">SESSION : 2024-25</span>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER ZONE: Red background with school email - Fixed at bottom row, never moves */}
          <div className="bg-red-600 px-2 py-1 flex items-center justify-center text-[5px] font-semibold overflow-hidden" style={{ gridRow: '3 / 4', height: '100%', maxHeight: '100%', alignSelf: 'end' }}>
            <div className="uppercase leading-tight" style={{ color: '#000000' }}>
              <span className="font-bold">E-mail.:</span> {selectedSchoolData?.contactEmail || 'school@example.com'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSaveTemplate = async () => {
    // Validate required fields
    if (!templateData.name.trim()) {
      setError('Template name is required');
      return;
    }

    if (!selectedSchoolId) {
      setError('School must be selected');
      return;
    }

    // Convert fields object to dataTags array (only include checked fields)
    // Map frontend field names to backend tag names
    const fieldToTagMap: Record<string, string> = {
      studentName: 'studentName',
      admissionNo: 'admissionNo',
      class: 'className',
      fatherName: 'fatherName',
      motherName: 'motherName',
      dob: 'dob',
      bloodGroup: 'bloodGroup',
      mobile: 'mobile',
      address: 'address',
      photo: 'photo',
      name: 'name',
      email: 'email',
      classId: 'classId',
      schoolId: 'schoolId',
    };

    const dataTags = Object.entries(templateData.fields)
      .filter(([_, checked]) => checked === true)
      .map(([field, _]) => fieldToTagMap[field] || field);

    // Validate minimum and maximum fields
    if (dataTags.length < 2) {
      setError('At least 2 fields must be selected');
      return;
    }
    
    if (dataTags.length > 8) {
      setError('Maximum 8 fields allowed. Please select fewer fields.');
      return;
    }

    // Convert background image to base64 if provided
    let backgroundImageBase64 = null;
    if (templateData.backgroundImage) {
      try {
        backgroundImageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(templateData.backgroundImage!);
        });
      } catch (err) {
        setError('Failed to process background image');
        return;
      }
    }

    // Create structured layoutConfig with zones
    // This replaces the old flat fields array with a zoned layout structure
    const zones = organizeFieldsIntoZones(dataTags, templateType);
    
    const layoutConfig = {
      backgroundImage: backgroundImageBase64 || (editingTemplateId && templateData.backgroundImageUrl ? templateData.backgroundImageUrl : null),
      width: 3.5, // inches
      height: 2.0, // inches
      // New zoned structure
      zones: zones.zones,
      // Backward compatibility: Keep fields array for old templates
      fields: dataTags.map(tag => ({
        tag,
        position: { x: 0, y: 0 },
        fontSize: 12,
        fontFamily: 'Arial',
      })),
    };

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const typeUpper = templateType.toUpperCase() as 'STUDENT' | 'TEACHER';
      
      let response;
      if (editingTemplateId) {
        // Update existing template
        // Note: schoolId is not required for Superadmin - controller validates from template itself
        // Extract dataTags from layoutConfig.zones or use current dataTags
        const updatedDataTags = dataTags; // Use the dataTags we already have
        response = await templateAPI.updateTemplate(editingTemplateId, {
          name: templateData.name.trim(),
          layoutConfig,
          dataTags: updatedDataTags, // Include dataTags in the update
        });
        
        if (response.success) {
          setSuccessMessage(`Template "${templateData.name}" updated successfully!`);
        }
      } else {
        // Create new template
        response = await templateAPI.createTemplate({
          name: templateData.name.trim(),
          type: typeUpper,
          layoutConfig,
          dataTags,
          schoolId: selectedSchoolId,
          isActive: true,
        });
        
        if (response.success) {
          setSuccessMessage(`Template "${templateData.name}" created successfully!`);
        }
      }

      if (response.success) {
        setSuccessMessage(editingTemplateId 
          ? `Template "${templateData.name}" updated successfully!`
          : `Template "${templateData.name}" created successfully!`);
        
        // Close editor and reset form
    setShowEditor(false);
        setEditingTemplateId(null);
        // Clean up image URL
        if (templateData.backgroundImageUrl) {
          URL.revokeObjectURL(templateData.backgroundImageUrl);
        }
        setTemplateData({
          name: '',
          backgroundImage: null,
          backgroundImageUrl: null,
          fields: getDefaultFields(templateType),
        });

        // Small delay to ensure backend has persisted the data
        await new Promise(resolve => setTimeout(resolve, 300));

        // Refresh templates list
        const templatesResponse = await templateAPI.getTemplates(typeUpper, selectedSchoolId);
        if (templatesResponse.success && templatesResponse.data) {
          const mappedTemplates = templatesResponse.data.map((template: any) => ({
            _id: template._id,
            id: template._id,
            name: template.name || 'Unnamed Template',
            type: template.type?.toLowerCase() as TemplateType,
            school: template.schoolId?.name || 'N/A',
            schoolId: template.schoolId,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            lastModified: template.updatedAt || template.createdAt,
            isActive: template.isActive,
            status: template.isActive ? 'active' : 'draft',
          }));
          // Force state update by creating new array reference
          setTemplates(() => [...mappedTemplates]);
        }

        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        setError(response.message || (editingTemplateId ? 'Failed to update template' : 'Failed to create template'));
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || (editingTemplateId ? 'Failed to update template' : 'Failed to create template'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNew = () => {
    // Clean up previous image URL if exists
    if (templateData.backgroundImageUrl) {
      URL.revokeObjectURL(templateData.backgroundImageUrl);
    }
    setEditingTemplateId(null);
    setTemplateData({
      name: '',
      backgroundImage: null,
      backgroundImageUrl: null,
      fields: getDefaultFields(templateType),
    });
    setShowEditor(true);
  };

  const handleEditTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch the full template data
      const response = await templateAPI.getTemplateById(templateId);
      
      if (response.success && response.data) {
        const template = response.data;
        
        // Convert dataTags array back to fields object
        const tagToFieldMap: Record<string, string> = {
          studentName: 'studentName',
          admissionNo: 'admissionNo',
          className: 'class',
          class: 'class',
          fatherName: 'fatherName',
          motherName: 'motherName',
          dob: 'dob',
          dateOfBirth: 'dob',
          bloodGroup: 'bloodGroup',
          mobile: 'mobile',
          phone: 'mobile',
          address: 'address',
          photo: 'photo',
          photoUrl: 'photo',
          name: 'name',
          email: 'email',
          classId: 'classId',
          schoolId: 'schoolId',
        };
        
        // Initialize fields with defaults
        const fields = getDefaultFields(template.type?.toLowerCase() as TemplateType || templateType);
        
        // Mark fields as checked if they exist in dataTags
        if (template.dataTags && Array.isArray(template.dataTags)) {
          template.dataTags.forEach((tag: string) => {
            const fieldName = tagToFieldMap[tag] || tag;
            if (fields.hasOwnProperty(fieldName)) {
              fields[fieldName] = true;
            }
          });
        }
        
        // Extract background image from layoutConfig if available
        let backgroundImageUrl = null;
        if (template.layoutConfig?.backgroundImage) {
          backgroundImageUrl = template.layoutConfig.backgroundImage;
        }
        
        setTemplateType(template.type?.toLowerCase() as TemplateType || templateType);
        setEditingTemplateId(templateId);
        setTemplateData({
          name: template.name || '',
          backgroundImage: null, // Don't set file object, just URL
          backgroundImageUrl: backgroundImageUrl,
          fields: fields,
        });
        setShowEditor(true);
      } else {
        setError('Failed to load template data');
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewTemplate = async (templateId: string) => {
    try {
      setPreviewLoading(true);
      setError(null);
      
      // Fetch the full template data
      const response = await templateAPI.getTemplateById(templateId);
      
      if (response.success && response.data) {
        setPreviewTemplate(response.data);
        setPreviewOpen(true);
      } else {
        setError('Failed to load template data for preview');
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to load template for preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading && !selectedSchoolId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">ID Card Templates</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedSchoolId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">ID Card Templates</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  // Render Schools List
  if (!selectedSchool) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2 text-2xl font-bold">ID Card Templates</h1>
            <p className="text-gray-600">Select a school to view and manage its templates</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-gray-900 font-semibold text-lg">Select a School</h2>
            <p className="text-gray-600 text-sm mt-1">Click on a school to view its templates</p>
          </div>
          <div className="divide-y divide-gray-200">
            {schools.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <School className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">No schools found</p>
                <p className="text-gray-500 text-sm">Schools will appear here once they are created.</p>
              </div>
            ) : (
              schools.map((school) => {
                const schoolId = school._id || school.id || '';
                return (
                  <button
                    key={schoolId}
                    onClick={() => {
                      setSelectedSchool(school.name);
                      setSelectedSchoolId(schoolId);
                    }}
                    className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <School className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-gray-900 font-medium text-lg">{school.name}</p>
                          <p className="text-gray-600 text-sm mt-1">
                            {school.city || 'No city specified'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Templates View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">ID Card Templates</h1>
          <p className="text-gray-600">{selectedSchool}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="template-type" className="text-gray-700">Template Type:</Label>
            <Select value={templateType} onValueChange={(value) => handleTemplateTypeChange(value as TemplateType)}>
              <SelectTrigger id="template-type" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create New Template
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => {
          setSelectedSchool('');
          setSelectedSchoolId('');
          setTemplates([]);
          setError(null);
          setSuccessMessage(null);
        }}
        className="mb-4"
      >
        ← Back to Schools
      </Button>

      {/* School Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <School className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">{selectedSchool}</h2>
            <p className="text-gray-600 text-sm">
              {loading ? 'Loading...' : `${filteredTemplates.length} ${filteredTemplates.length === 1 ? 'template' : 'templates'}`}
            </p>
          </div>
        </div>
      </div>

      {showEditor ? (
        /* Template Editor */
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-gray-900 mb-2">Template Editor</h2>
            <p className="text-gray-600">Configure your ID card template for {selectedSchool}</p>
          </div>

          <div className="space-y-6">
            {/* Template Name */}
            <div>
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                value={templateData.name}
                onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                placeholder={
                  templateType === 'teacher'
                    ? 'e.g., Teacher ID Card 2025'
                    : 'e.g., Student Card 2025'
                }
              />
            </div>

            {/* Background Image */}
            <div>
              <Label>Background Image *</Label>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900 mb-2">
                  {templateData.backgroundImage
                    ? templateData.backgroundImage.name
                    : 'Upload template background'}
                </p>
                <p className="text-gray-600 mb-4">
                  PNG or JPG, recommended size: 3.5" x 2" (300 DPI)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="bg-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      const url = URL.createObjectURL(file);
                    setTemplateData({
                      ...templateData,
                        backgroundImage: file,
                        backgroundImageUrl: url,
                      });
                    } else {
                      if (templateData.backgroundImageUrl) {
                        URL.revokeObjectURL(templateData.backgroundImageUrl);
                      }
                      setTemplateData({
                        ...templateData,
                        backgroundImage: null,
                        backgroundImageUrl: null,
                      });
                    }
                  }}
                />
                <label htmlFor="bg-upload">
                  <Button type="button" variant="outline" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Data Fields */}
            <div>
              <Label>Select Fields to Display (Minimum: 2, Maximum: 8)</Label>
              {(() => {
                const selectedCount = Object.values(templateData.fields).filter(Boolean).length;
                return (
                  <div className="mt-2 mb-4">
                    <p className="text-sm text-gray-600">
                      Selected: <span className={`font-semibold ${selectedCount < 2 || selectedCount > 8 ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedCount} / 8
                      </span>
                      {selectedCount < 2 && <span className="text-red-600 ml-2">(Minimum 2 fields required)</span>}
                      {selectedCount > 8 && <span className="text-red-600 ml-2">(Maximum 8 fields allowed)</span>}
                    </p>
                  </div>
                );
              })()}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(templateData.fields).map(([field, checked]) => {
                  const selectedCount = Object.values(templateData.fields).filter(Boolean).length;
                  // Disable checkbox if: trying to check when already at max (8), or trying to uncheck when at minimum (2)
                  const isDisabled = (!checked && selectedCount >= 8) || (checked && selectedCount <= 2);
                  
                  return (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={field}
                      checked={checked}
                        disabled={isDisabled}
                        onCheckedChange={(value) => {
                          const currentCount = Object.values(templateData.fields).filter(Boolean).length;
                          const newValue = value as boolean;
                          
                          // Calculate what the count would be after this change
                          const newCount = newValue ? currentCount + 1 : currentCount - 1;
                          
                          // Validate minimum (2 fields)
                          if (!newValue && newCount < 2) {
                            setError('At least 2 fields must be selected. You cannot uncheck this field.');
                            setTimeout(() => setError(null), 3000);
                            return;
                          }
                          
                          // Validate maximum (8 fields)
                          if (newValue && currentCount >= 8) {
                            setError('Maximum 8 fields allowed. Please uncheck another field first.');
                            setTimeout(() => setError(null), 3000);
                            return;
                          }
                          
                          setError(null); // Clear any previous errors
                        setTemplateData({
                          ...templateData,
                            fields: { ...templateData.fields, [field]: newValue },
                          });
                        }}
                    />
                    <label
                      htmlFor={field}
                        onClick={(e) => {
                          if (isDisabled) {
                            e.preventDefault();
                          }
                        }}
                        className={`select-none ${isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}
                    >
                      {field
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (str) => str.toUpperCase())}
                    </label>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Preview</Label>
              <div className="mt-2 bg-gray-100 rounded-lg p-8 text-center">
                {/* Render card preview using zoned layout */}
                {renderCardPreview(
                  {
                    backgroundImage: templateData.backgroundImageUrl,
                    zones: organizeFieldsIntoZones(
                      Object.entries(templateData.fields)
                        .filter(([_, checked]) => checked)
                        .map(([field]) => {
                          const fieldToTagMap: Record<string, string> = {
                            studentName: 'studentName',
                            admissionNo: 'admissionNo',
                            class: 'className',
                            fatherName: 'fatherName',
                            motherName: 'motherName',
                            dob: 'dob',
                            bloodGroup: 'bloodGroup',
                            mobile: 'mobile',
                            address: 'address',
                            photo: 'photo',
                            name: 'name',
                            email: 'email',
                            classId: 'classId',
                            schoolId: 'schoolId',
                          };
                          return fieldToTagMap[field] || field;
                        }),
                      templateType
                    ).zones,
                  },
                  Object.entries(templateData.fields)
                    .filter(([_, checked]) => checked)
                    .map(([field]) => {
                      const fieldToTagMap: Record<string, string> = {
                        studentName: 'studentName',
                        admissionNo: 'admissionNo',
                        class: 'className',
                        fatherName: 'fatherName',
                        motherName: 'motherName',
                        dob: 'dob',
                        bloodGroup: 'bloodGroup',
                        mobile: 'mobile',
                        address: 'address',
                        photo: 'photo',
                        name: 'name',
                        email: 'email',
                        classId: 'classId',
                        schoolId: 'schoolId',
                      };
                      return fieldToTagMap[field] || field;
                    }),
                  templateType,
                  templateData.backgroundImageUrl
                )}
                <p className="text-xs text-gray-500 mt-4">ID Card Preview (3.5" x 2") - Zoned Layout</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSaveTemplate} disabled={saving}>
                {saving ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Save Template'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEditor(false);
                  setError(null);
                  setEditingTemplateId(null);
                  // Clean up image URL
                  if (templateData.backgroundImageUrl) {
                    URL.revokeObjectURL(templateData.backgroundImageUrl);
                  }
                  setTemplateData({
                    name: '',
                    backgroundImage: null,
                    backgroundImageUrl: null,
                    fields: getDefaultFields(templateType),
                  });
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Template List */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">Loading templates...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-600">Error: {error}</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">No templates found for this school</p>
              <Button onClick={handleCreateNew} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create Template for {selectedSchool}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-gray-700">Template Name</th>
                    <th className="px-6 py-3 text-left text-gray-700">Type</th>
                    <th className="px-6 py-3 text-left text-gray-700">Created</th>
                    <th className="px-6 py-3 text-left text-gray-700">Last Modified</th>
                    <th className="px-6 py-3 text-left text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTemplates.map((template) => {
                    const templateId = template._id || template.id || '';
                    return (
                      <tr key={templateId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {template.type?.toLowerCase() === 'teacher' ? (
                              <UserCircle className="w-5 h-5 text-purple-600" />
                            ) : (
                              <GraduationCap className="w-5 h-5 text-green-600" />
                            )}
                            <p className="text-gray-900">{template.name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={template.type?.toLowerCase() === 'teacher' ? 'default' : 'secondary'}>
                            {template.type?.charAt(0).toUpperCase() + template.type?.slice(1).toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {template.lastModified || template.updatedAt
                            ? new Date(template.lastModified || template.updatedAt || '').toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs ${
                              (template.status === 'active' || template.isActive)
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {(template.status === 'active' || template.isActive) ? 'active' : 'draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Preview"
                              onClick={() => handlePreviewTemplate(template._id || template.id || '')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit"
                              onClick={() => handleEditTemplate(template._id || template.id || '')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Template Preview: {previewTemplate?.name || 'Loading...'}
            </DialogTitle>
          </DialogHeader>
          
          {previewLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <p className="ml-3 text-gray-600">Loading template preview...</p>
            </div>
          ) : previewTemplate ? (
            <div className="space-y-6">
              {/* Template Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {previewTemplate.type?.charAt(0).toUpperCase() + previewTemplate.type?.slice(1).toLowerCase() || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 font-medium ${
                      previewTemplate.isActive ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {previewTemplate.isActive ? 'Active' : 'Draft'}
                    </span>
                  </div>
                  {previewTemplate.createdAt && (
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {new Date(previewTemplate.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {previewTemplate.updatedAt && (
                    <div>
                      <span className="text-gray-600">Last Modified:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {new Date(previewTemplate.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Card Preview */}
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <Label className="text-lg font-semibold mb-4 block">ID Card Preview</Label>
                {/* Render card preview using zoned layout */}
                {renderCardPreview(
                  previewTemplate.layoutConfig || {},
                  previewTemplate.dataTags || [],
                  previewTemplate.type?.toLowerCase() as TemplateType || templateType,
                  previewTemplate.layoutConfig?.backgroundImage
                )}
                <p className="text-xs text-gray-500 mt-4">ID Card Preview (3.5" x 2") - Zoned Layout</p>
              </div>

              {/* Fields List */}
              {previewTemplate.dataTags && previewTemplate.dataTags.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-2 block">Included Fields:</Label>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.dataTags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-600">
              Preview not available
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
