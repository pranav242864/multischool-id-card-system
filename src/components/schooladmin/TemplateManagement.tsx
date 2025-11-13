import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Edit, Trash2, Eye, Upload } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

interface Template {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  status: 'active' | 'draft';
}

export function TemplateManagement() {
  const [showEditor, setShowEditor] = useState(false);
  const [templateData, setTemplateData] = useState({
    name: '',
    backgroundImage: null as File | null,
    fields: {
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
    },
  });

  const templates: Template[] = [
    {
      id: '1',
      name: 'Student Card 2025',
      createdAt: '2025-01-15',
      lastModified: '2025-01-20',
      status: 'active',
    },
    {
      id: '2',
      name: 'Teacher ID Card',
      createdAt: '2025-02-01',
      lastModified: '2025-02-10',
      status: 'active',
    },
    {
      id: '3',
      name: 'Draft Template',
      createdAt: '2025-03-05',
      lastModified: '2025-03-05',
      status: 'draft',
    },
  ];

  const handleSaveTemplate = () => {
    console.log('Template data:', templateData);
    setShowEditor(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">ID Card Templates</h1>
          <p className="text-gray-600">Create and manage ID card templates</p>
        </div>
        <Button onClick={() => setShowEditor(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Template
        </Button>
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
                placeholder="e.g., Student Card 2025"
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-700">Template Name</th>
                  <th className="px-6 py-3 text-left text-gray-700">Created</th>
                  <th className="px-6 py-3 text-left text-gray-700">Last Modified</th>
                  <th className="px-6 py-3 text-left text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{template.name}</p>
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
                          onClick={() => setShowEditor(true)}
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
        </div>
      )}
    </div>
  );
}
