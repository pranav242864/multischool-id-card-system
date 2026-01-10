import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Edit, Trash2, Eye, Upload, School, FileText, ChevronRight, UserCircle, GraduationCap } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { schoolAPI, templateAPI, APIError } from '../../utils/api';

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

  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await schoolAPI.getSchools();
        if (response.success && response.data) {
          setSchools(response.data);
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

    if (dataTags.length === 0) {
      setError('At least one field must be selected');
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

    // Create a basic layoutConfig
    // This is a simplified layout - can be enhanced later
    // For updates, preserve existing backgroundImage if no new one is provided
    const layoutConfig = {
      backgroundImage: backgroundImageBase64 || (editingTemplateId && templateData.backgroundImageUrl ? templateData.backgroundImageUrl : null),
      width: 3.5, // inches
      height: 2.0, // inches
      fields: dataTags.map(tag => ({
        tag,
        position: { x: 0, y: 0 }, // Default position
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
        // Extract dataTags from layoutConfig.fields for the update
        const updatedDataTags = layoutConfig.fields?.map((field: any) => field.tag) || dataTags;
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
              <Label>Select Fields to Display</Label>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(templateData.fields).map(([field, checked]) => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={field}
                      checked={checked}
                      onCheckedChange={(value) =>
                        setTemplateData({
                          ...templateData,
                          fields: { ...templateData.fields, [field]: value as boolean },
                        })
                      }
                    />
                    <label
                      htmlFor={field}
                      className="text-gray-700 cursor-pointer select-none"
                    >
                      {field
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (str) => str.toUpperCase())}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Preview</Label>
              <div className="mt-2 bg-gray-100 rounded-lg p-8 text-center">
                <div 
                  className="max-w-sm mx-auto bg-white rounded-lg shadow-lg overflow-hidden aspect-[3.5/2] relative"
                  style={{
                    backgroundImage: templateData.backgroundImageUrl ? `url(${templateData.backgroundImageUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  {!templateData.backgroundImageUrl && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                      <p className="text-gray-400 text-sm">No background image</p>
                    </div>
                  )}
                  <div className="absolute inset-0 p-4 flex flex-col justify-between">
                    {/* Sample Photo Placeholder */}
                    {templateData.fields.photo && (
                      <div className="self-end">
                        <div className="w-20 h-24 bg-gray-200 border-2 border-gray-300 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">Photo</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Sample Data Fields */}
                    <div className="space-y-1 text-left">
                      {templateData.fields.studentName && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-sm font-semibold">
                          Student Name
                        </div>
                      )}
                      {templateData.fields.admissionNo && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          Admission No: 12345
                        </div>
                      )}
                      {templateData.fields.class && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          Class: 10-A
                        </div>
                      )}
                      {templateData.fields.fatherName && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          Father: John Doe
                        </div>
                      )}
                      {templateData.fields.motherName && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          Mother: Jane Doe
                        </div>
                      )}
                      {templateData.fields.dob && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          DOB: 01/01/2010
                        </div>
                      )}
                      {templateData.fields.bloodGroup && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          Blood Group: O+
                        </div>
                      )}
                      {templateData.fields.mobile && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          Mobile: +1234567890
                        </div>
                      )}
                      {templateData.fields.address && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          Address: Sample Address
                        </div>
                      )}
                      {templateData.fields.name && templateType === 'teacher' && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-sm font-semibold">
                          Teacher Name
                        </div>
                      )}
                      {templateData.fields.email && templateType === 'teacher' && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          Email: teacher@school.com
                        </div>
                      )}
                      {templateData.fields.mobile && templateType === 'teacher' && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          Mobile: +1234567890
                        </div>
                      )}
                      {templateData.fields.schoolId && templateType === 'teacher' && (
                        <div className="bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                          School: {selectedSchool || 'School Name'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">ID Card Preview (3.5" x 2")</p>
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
                            <Button variant="ghost" size="sm" title="Preview">
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
    </div>
  );
}
