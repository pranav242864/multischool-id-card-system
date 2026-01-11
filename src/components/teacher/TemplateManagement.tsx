import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Eye, FileText, GraduationCap, UserCircle, Download, Loader2, FileDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { templateAPI, previewAPI, pdfAPI, studentAPI, APIError } from '../../utils/api';

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

interface Student {
  _id?: string;
  id?: string;
  admissionNo: string;
  name: string;
  classId?: any;
}

export function TemplateManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templateType, setTemplateType] = useState<TemplateType>('student');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [generatingBulkPdf, setGeneratingBulkPdf] = useState(false);

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

  useEffect(() => {
    // Fetch students when template type is 'student'
    if (templateType.toLowerCase() === 'student') {
      const fetchStudents = async () => {
        setLoadingStudents(true);
        setError(null);
        try {
          const response = await studentAPI.getStudents();
          if (response.success && response.data) {
            const mappedStudents = response.data.map((student: any) => ({
              _id: student._id,
              id: student._id,
              admissionNo: student.admissionNo || '',
              name: student.name || '',
              classId: student.classId,
            }));
            setStudents(mappedStudents);
          }
        } catch (err) {
          const apiError = err as APIError;
          // Don't show error if students fetch fails, just log it
          console.error('Failed to load students:', apiError.message);
        } finally {
          setLoadingStudents(false);
        }
      };

      fetchStudents();
    }
  }, [templateType]);

  const filteredTemplates = templates.filter(t => {
    const typeMatch = t.type?.toLowerCase() === templateType.toLowerCase();
    // Only show active templates to teachers
    const activeMatch = t.isActive || t.status === 'active' || t.status === 'ACTIVE';
    return typeMatch && activeMatch;
  });

  const handlePreview = async (template: Template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
    setPreviewHtml('');
    setPreviewLoading(true);
    setError(null);

    try {
      // For preview, we need a sample student. Use first student if available
      if (templateType.toLowerCase() === 'student' && students.length > 0) {
        const studentId = students[0]._id || students[0].id;
        if (studentId) {
          const response = await previewAPI.previewStudentCard(studentId);
          if (response.success && response.html) {
            setPreviewHtml(response.html);
          } else {
            setError('Preview not available');
          }
        } else {
          setError('No students available for preview');
        }
      } else {
        setError('Preview requires at least one student');
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGeneratePDF = async (student: Student) => {
    const studentId = student._id || student.id || '';
    if (!studentId) return;

    setGeneratingPdfId(studentId);
    setError(null);

    try {
      const blob = await pdfAPI.generateStudentPDF(studentId);
      const filename = `student-${student.admissionNo}.pdf`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to generate PDF');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleGenerateBulkPDF = async () => {
    if (students.length === 0) {
      setError('No students available to generate ID cards');
      return;
    }

    setGeneratingBulkPdf(true);
    setError(null);

    try {
      // Get all student IDs
      const studentIds = students.map(s => s._id || s.id).filter(Boolean) as string[];
      
      if (studentIds.length === 0) {
        setError('No valid student IDs found');
        return;
      }

      const blob = await pdfAPI.generateBulkStudentPDF(studentIds);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `students-id-cards-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to generate bulk PDF');
    } finally {
      setGeneratingBulkPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">ID Card Templates</h1>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error && !templates.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">ID Card Templates</h1>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
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
          <p className="text-gray-600">View templates and generate ID cards for students</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="template-type" className="text-gray-700">Template Type:</Label>
          <Select value={templateType} onValueChange={(value) => setTemplateType(value as TemplateType)}>
            <SelectTrigger id="template-type" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredTemplates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-2">No active templates found</p>
            <p className="text-gray-500 text-sm">Templates will appear here once created by your school admin</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700">Template Name</th>
                  <th className="px-6 py-3 text-left text-gray-700">Type</th>
                  <th className="px-6 py-3 text-left text-gray-700">Created</th>
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
                          <p className="text-gray-900 font-medium">{template.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={template.type?.toLowerCase() === 'teacher' ? 'default' : 'secondary'}>
                          {template.type?.charAt(0).toUpperCase() + template.type?.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs bg-green-100 text-green-700">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Preview Template"
                          onClick={() => handlePreview(template)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student ID Card Generation Section */}
      {templateType.toLowerCase() === 'student' && filteredTemplates.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 text-lg font-semibold">Generate Student ID Cards</h2>
            {students.length > 0 && (
              <Button
                onClick={handleGenerateBulkPDF}
                disabled={generatingBulkPdf || loadingStudents}
                className="bg-blue-600 hover:bg-blue-700"
                title="Generate ID cards for all students"
              >
                {generatingBulkPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-2" />
                    Generate All ID Cards
                  </>
                )}
              </Button>
            )}
          </div>
          
          {loadingStudents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading students...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center">
              <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No students found in your assigned class</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-600 text-sm mb-4">
                Select a student to generate their ID card PDF
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {students.map((student) => {
                  const studentId = student._id || student.id || '';
                  const isGenerating = generatingPdfId === studentId;
                  
                  return (
                    <div
                      key={studentId}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-medium truncate">{student.name}</p>
                          <p className="text-gray-500 text-sm">Admission: {student.admissionNo}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratePDF(student)}
                          disabled={isGenerating}
                          title="Generate ID Card PDF"
                        >
                          {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Dialog */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Preview: {previewTemplate?.name}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
            <div className="p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  <span className="ml-3 text-gray-600">Loading preview...</span>
                </div>
              ) : previewHtml ? (
                <div 
                  className="bg-white rounded-lg border border-gray-200 p-4"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">Preview not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
