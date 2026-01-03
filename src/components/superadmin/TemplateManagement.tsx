import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Edit, Trash2, Eye, Upload, School, FileText, ChevronRight, UserCircle, GraduationCap } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';

type TemplateType = 'student' | 'teacher';

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  school: string;
  createdAt: string;
  lastModified: string;
  status: 'active' | 'draft';
}

export function TemplateManagement() {
  const [showEditor, setShowEditor] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [templateType, setTemplateType] = useState<TemplateType>('student');

  // List of all registered schools
  const schools = [
    'Greenfield Public School',
    'Riverside High School',
    'Oakwood Academy',
    'Maple Grove School',
  ];

  // All templates with school information
  const allTemplates: Template[] = [
    {
      id: '1',
      name: 'Student Card 2025',
      type: 'student',
      school: 'Greenfield Public School',
      createdAt: '2025-01-15',
      lastModified: '2025-01-20',
      status: 'active',
    },
    {
      id: '2',
      name: 'Teacher ID Card',
      type: 'teacher',
      school: 'Greenfield Public School',
      createdAt: '2025-02-01',
      lastModified: '2025-02-10',
      status: 'active',
    },
    {
      id: '3',
      name: 'Student Card 2025',
      type: 'student',
      school: 'Riverside High School',
      createdAt: '2025-01-15',
      lastModified: '2025-01-20',
      status: 'active',
    },
    {
      id: '4',
      name: 'Teacher ID Card',
      type: 'teacher',
      school: 'Riverside High School',
      createdAt: '2025-02-01',
      lastModified: '2025-02-10',
      status: 'active',
    },
    {
      id: '5',
      name: 'Student Card 2025',
      type: 'student',
      school: 'Oakwood Academy',
      createdAt: '2025-01-15',
      lastModified: '2025-01-20',
      status: 'active',
    },
    {
      id: '6',
      name: 'Teacher ID Card',
      type: 'teacher',
      school: 'Oakwood Academy',
      createdAt: '2025-02-01',
      lastModified: '2025-02-10',
      status: 'draft',
    },
    {
      id: '7',
      name: 'Student Card 2025',
      type: 'student',
      school: 'Maple Grove School',
      createdAt: '2025-01-15',
      lastModified: '2025-01-20',
      status: 'active',
    },
    {
      id: '8',
      name: 'Teacher ID Card',
      type: 'teacher',
      school: 'Maple Grove School',
      createdAt: '2025-02-01',
      lastModified: '2025-02-10',
      status: 'active',
    },
  ];

  // Filter templates by selected school
  const filteredTemplates = selectedSchool
    ? allTemplates.filter((template) => template.school === selectedSchool)
    : [];

  // Get template count for a school
  const getTemplateCountForSchool = (schoolName: string): number => {
    return allTemplates.filter((template) => template.school === schoolName).length;
  };

  // Get default fields based on template type
  const getDefaultFields = (type: TemplateType) => {
    switch (type) {
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

  // Update fields when template type changes
  const handleTemplateTypeChange = (type: TemplateType) => {
    setTemplateType(type);
    setTemplateData({
      ...templateData,
      fields: getDefaultFields(type),
    });
  };

  const handleSaveTemplate = () => {
    console.log('Template data:', templateData);
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
            {schools.map((school) => (
              <button
                key={school}
                onClick={() => setSelectedSchool(school)}
                className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <School className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium text-lg">{school}</p>
                      <p className="text-gray-600 text-sm mt-1">
                        {getTemplateCountForSchool(school)} {getTemplateCountForSchool(school) === 1 ? 'template' : 'templates'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
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

      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => setSelectedSchool('')}
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
          {filteredTemplates.length > 0 ? (
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
                  {filteredTemplates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {template.type === 'teacher' ? (
                            <UserCircle className="w-5 h-5 text-purple-600" />
                          ) : (
                            <GraduationCap className="w-5 h-5 text-green-600" />
                          )}
                          <p className="text-gray-900">{template.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={template.type === 'teacher' ? 'default' : 'secondary'}>
                          {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(template.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(template.lastModified).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs ${
                            template.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {template.status}
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
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}

