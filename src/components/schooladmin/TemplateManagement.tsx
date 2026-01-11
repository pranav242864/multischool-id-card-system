import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Edit, Trash2, Eye, Upload, School, FileText, UserCircle, GraduationCap, Loader2 } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { templateAPI, previewAPI, studentAPI, APIError } from '../../utils/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

type TemplateType = 'student' | 'teacher' | 'STUDENT' | 'TEACHER';

interface Template {
  _id?: string;
  id?: string;
  name: string;
  type: TemplateType;
  createdAt?: string;
  updatedAt?: string;
  lastModified?: string;
  isActive?: boolean;
  status?: 'active' | 'draft' | 'ACTIVE' | 'DRAFT';
}

interface TemplateManagementProps {
  userRole?: 'superadmin' | 'schooladmin';
}

export function TemplateManagement({ userRole = 'schooladmin' }: TemplateManagementProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [templateType, setTemplateType] = useState<TemplateType>('student');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        const typeUpper = templateType.toUpperCase() as 'STUDENT' | 'TEACHER';
        const response = await templateAPI.getTemplates(typeUpper);
        if (response.success && response.data) {
          // Map backend data to frontend format
          const mappedTemplates = response.data.map((template: any) => ({
            _id: template._id,
            id: template._id,
            name: template.name || 'Unnamed Template',
            type: template.type?.toLowerCase() as TemplateType,
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
  }, [templateType]);

  // Fetch students when template type is 'student' for preview
  useEffect(() => {
    if (templateType.toLowerCase() === 'student') {
      const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
          const response = await studentAPI.getStudents({ 
            page: 1, 
            limit: 100 
          });
          console.log('Students fetch response:', response);
          
          if (response.success && response.data) {
            // Handle both array and paginated response
            const studentsArray = Array.isArray(response.data) 
              ? response.data 
              : (response.data.students || response.data.data || []);
            
            const mappedStudents = studentsArray.map((student: any) => ({
              _id: student._id,
              id: student._id,
              admissionNo: student.admissionNo || '',
              name: student.name || '',
              classId: student.classId,
            }));
            console.log('Mapped students:', mappedStudents);
            setStudents(mappedStudents);
          } else {
            console.log('No students data in response');
            setStudents([]);
          }
        } catch (err) {
          console.error('Failed to load students for preview:', err);
          setStudents([]);
        } finally {
          setLoadingStudents(false);
        }
      };

      fetchStudents();
    } else {
      // Clear students when switching to teacher templates
      setStudents([]);
    }
  }, [templateType]);

  const filteredTemplates = templates.filter(t => {
    const typeMatch = t.type?.toLowerCase() === templateType.toLowerCase();
    return typeMatch;
  });

  const handlePreview = async (template: Template) => {
    console.log('Preview clicked for template:', template);
    console.log('Current students:', students);
    console.log('Template type:', template.type);
    
    setPreviewTemplate(template);
    setPreviewOpen(true);
    setPreviewHtml('');
    setPreviewLoading(true);
    setError(null);

    try {
      // Check the template's type, not the filter type
      const isStudentTemplate = template.type?.toLowerCase() === 'student';
      
      if (isStudentTemplate) {
        // If students are not loaded, try to fetch them now
        let studentsToUse = students;
        if (studentsToUse.length === 0) {
          console.log('No students in state, fetching now...');
          try {
            const response = await studentAPI.getStudents({ 
              page: 1, 
              limit: 100 
            });
            console.log('Students fetch response:', response);
            
            if (response.success && response.data) {
              // Handle both array and paginated response
              const studentsArray = Array.isArray(response.data) 
                ? response.data 
                : (response.data.students || response.data.data || []);
              
              studentsToUse = studentsArray.map((student: any) => ({
                _id: student._id,
                id: student._id,
                admissionNo: student.admissionNo || '',
                name: student.name || '',
                classId: student.classId,
              }));
              
              // Update state for future use
              setStudents(studentsToUse);
              console.log('Fetched students:', studentsToUse);
            }
          } catch (fetchErr) {
            console.error('Failed to fetch students:', fetchErr);
          }
        }
        
        if (studentsToUse.length === 0) {
          setError('No students available for preview. Please add students first.');
          setPreviewLoading(false);
          return;
        }
        
        const studentId = studentsToUse[0]._id || studentsToUse[0].id;
        console.log('Using student ID for preview:', studentId);
        
        if (studentId) {
          const response = await previewAPI.previewStudentCard(studentId);
          console.log('Preview API response:', response);
          
          if (response.success && response.html) {
            setPreviewHtml(response.html);
            setError(null);
          } else {
            setError(response.message || 'Preview not available');
          }
        } else {
          setError('Invalid student ID');
        }
      } else {
        setError('Teacher card preview is not yet supported. Please use student templates.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to load preview. Please check your connection and try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

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

  const [templateData, setTemplateData] = useState({
    name: '',
    backgroundImage: null as File | null,
    fields: getDefaultFields(templateType),
  });

  const handleTemplateTypeChange = (type: TemplateType) => {
    setTemplateType(type);
    setTemplateData({
      ...templateData,
      fields: getDefaultFields(type),
    });
  };

  const handleSaveTemplate = () => {
    setShowEditor(false);
  };

  const handleCreateNew = () => {
    setTemplateData({
      name: '',
      backgroundImage: null,
      fields: getDefaultFields(templateType),
    });
    setShowEditor(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">ID Card Templates</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">ID Card Templates</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">ID Card Templates</h1>
          <p className="text-gray-600">Manage ID card templates</p>
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

      {/* School Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <School className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">School</h2>
            <p className="text-gray-600 text-sm">
              {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'}
            </p>
          </div>
        </div>
      </div>

      {showEditor ? (
        /* Template Editor */
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-gray-900 mb-2">Template Editor</h2>
            <p className="text-gray-600">Configure your ID card template</p>
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
                  onChange={(e) =>
                    setTemplateData({
                      ...templateData,
                      backgroundImage: e.target.files?.[0] || null,
                    })
                  }
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
                <div className="max-w-sm mx-auto bg-white rounded-lg shadow-lg p-6 aspect-[3.5/2]">
                  <p className="text-gray-500">Template preview will appear here</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={handleSaveTemplate}>
                Save Template
              </Button>
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Template List */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredTemplates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">No templates found</p>
              <Button onClick={handleCreateNew} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
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
                              title={template.type?.toLowerCase() === 'student' && students.length === 0 
                                ? 'No students available for preview' 
                                : 'Preview ID Card'}
                              onClick={() => {
                                console.log('Preview button clicked for template:', template);
                                handlePreview(template);
                              }}
                              disabled={false}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit"
                              onClick={() => {
                                setTemplateType(template.type);
                                setTemplateData({
                                  name: template.name,
                                  backgroundImage: null,
                                  fields: getDefaultFields(template.type),
                                });
                                setShowEditor(true);
                              }}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>ID Card Preview - {previewTemplate?.name || 'Template'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading preview...</span>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-600 font-medium">{error}</p>
                  {students.length === 0 && (
                    <p className="text-red-500 text-sm mt-2">
                      Students: {students.length} loaded
                    </p>
                  )}
                </div>
              </div>
            ) : previewHtml ? (
              <div 
                className="w-full flex justify-center p-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="p-12 text-center text-gray-600">
                <p>Preview not available</p>
                {students.length === 0 && (
                  <p className="text-sm mt-2">No students found. Please add students first.</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
