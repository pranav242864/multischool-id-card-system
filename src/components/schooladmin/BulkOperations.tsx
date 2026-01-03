import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Upload, Download, FileSpreadsheet, Image, CheckCircle2, XCircle, Loader2, School } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { templateAPI, bulkImportAPI } from '../../utils/api';
import ExcelJS from 'exceljs';

type EntityType = 'teacher' | 'student';

interface BulkOperationsProps {
  userRole: 'schooladmin';
}

interface Template {
  _id: string;
  name?: string;
  type: string;
  dataTags: string[];
  schoolId?: string;
}

export function BulkOperations({ userRole }: BulkOperationsProps) {
  const [entityType, setEntityType] = useState<EntityType>('student');
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; message: string } | null>(null);
  const [recentImports, setRecentImports] = useState<Array<{ file: string; records: number; status: 'success' | 'error'; date: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  // School admin's own school (in real app, this would come from user context)
  const ownSchool = 'Greenfield Public School';

  // Fetch templates when entity type changes
  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      setError(null);
      try {
        const response = await templateAPI.getTemplates(entityType);
        if (response.success && response.data) {
          // Filter templates by own school (assuming schoolId matches school name for now)
          const schoolTemplates = response.data.filter((t: Template) => 
            t.schoolId === ownSchool || !t.schoolId
          );
          setTemplates(schoolTemplates);
          // Auto-select the first template if available
          if (schoolTemplates.length > 0 && !selectedTemplateId) {
            setSelectedTemplateId(schoolTemplates[0]._id);
          } else {
            setSelectedTemplateId(null);
          }
        }
      } catch (err) {
        console.log('Templates not available, will use default fields');
        setTemplates([]);
        setSelectedTemplateId(null);
        setError(null);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [entityType]);

  // Update selected template when templates change
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0]._id);
    }
  }, [templates, selectedTemplateId]);

  // Get entity-specific content
  const getEntityConfig = () => {
    switch (entityType) {
      case 'teacher':
        return {
          title: 'Teacher',
          plural: 'Teachers',
          description: 'Import teacher data and photos in bulk',
          excelDescription: 'Upload teacher data',
          photoDescription: 'Upload teacher photos',
          fillDataText: 'Fill in teacher data',
          uploadDataText: 'Upload teacher data',
          photoNamingText: "Name each photo with the teacher's email or mobile number",
          photoExample: 'teacher@school.edu.jpg',
          requiredFields: [
            'Name',
            'Email',
            'Mobile Number',
            'School',
          ],
        };
      default: // student
        return {
          title: 'Student',
          plural: 'Students',
          description: 'Import student data and photos in bulk',
          excelDescription: 'Upload student data',
          photoDescription: 'Upload student photos',
          fillDataText: 'Fill in student data',
          uploadDataText: 'Upload student data',
          photoNamingText: "Name each photo with the student's admission number",
          photoExample: 'GPS1001.jpg',
          requiredFields: [
            'Admission Number',
            'Student Name',
            'Class',
            "Father's Name",
            'Mobile Number',
            'Date of Birth',
          ],
        };
    }
  };

  const entityConfig = getEntityConfig();

  // Map field names to human-readable column headers
  const getFieldHeader = (fieldName: string): string => {
    const fieldMapping: Record<string, string> = {
      // Student fields
      studentName: 'Student Name',
      admissionNo: 'Admission Number',
      class: 'Class',
      fatherName: "Father's Name",
      motherName: "Mother's Name",
      dob: 'Date of Birth',
      bloodGroup: 'Blood Group',
      mobile: 'Mobile Number',
      address: 'Address',
      photo: 'Photo URL',
      photoUrl: 'Photo URL',
      aadhaar: 'Aadhaar Number',
      
      // Teacher/Admin common fields
      name: 'Name',
      email: 'Email',
      classId: 'Class ID',
      
      // Admin fields
      username: 'Username',
      password: 'Password',
      phone: 'Phone Number',
      schoolId: 'School ID',
    };

    // Use mapping if available, otherwise format the field name
    if (fieldMapping[fieldName]) {
      return fieldMapping[fieldName];
    }

    // Convert camelCase to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Get default fields based on entity type (fallback when no template exists)
  const getDefaultFields = (): string[] => {
    switch (entityType) {
      case 'teacher':
        return ['name', 'email', 'mobile', 'classId', 'schoolId'];
      default: // student
        return ['admissionNo', 'studentName', 'class', 'fatherName', 'mobile', 'dob'];
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    setError(null);
    
    try {
      let template: Template | null = null;
      let dataTags: string[] = [];
      
      if (selectedTemplateId) {
        try {
          const response = await templateAPI.getTemplateById(selectedTemplateId);
          if (response.success && response.data) {
            template = response.data;
          }
        } catch (err) {
          const cachedTemplate = templates.find(t => t._id === selectedTemplateId);
          if (cachedTemplate) {
            template = cachedTemplate;
          }
        }
      }
      
      if (!template && templates.length > 0) {
        template = templates[0];
      }
      
      if (!template) {
        try {
          const response = await templateAPI.getActiveTemplate(entityType);
          if (response.success && response.data) {
            template = response.data;
          }
        } catch (err) {
          console.log('No active template found for type:', entityType);
        }
      }

      // Extract dataTags from template - use template's fields as Excel columns
      if (template && template.dataTags && Array.isArray(template.dataTags) && template.dataTags.length > 0) {
        dataTags = template.dataTags;
        console.log(`Using template "${template.name || template._id}" with ${dataTags.length} fields:`, dataTags);
      } else {
        dataTags = getDefaultFields();
        console.log(`No template found, using default fields for ${entityType}:`, dataTags);
      }

      if (!dataTags || dataTags.length === 0) {
        throw new Error('No fields available for template generation.');
      }

      // Generate Excel file using ID Card Template fields as columns
      const headers = dataTags.map(tag => getFieldHeader(tag));
      
      console.log(`Generating Excel template with ${headers.length} columns from ID template:`, headers);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template');
      
      // Add header row
      worksheet.addRow(headers);
      
      // Add empty example row
      worksheet.addRow(headers.map(() => ''));
      
      // Set column widths
      worksheet.columns = headers.map(header => ({
        width: Math.max(header.length + 5, 15)
      }));
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      const timestamp = new Date().toISOString().split('T')[0];
      const templateName = template?.name 
        ? template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        : `${entityType}_template`;
      const filename = `${ownSchool.replace(/[^a-z0-9]/gi, '_')}_${templateName}_${timestamp}.xlsx`;
      
      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      console.log(`Excel template "${filename}" generated with fields from ID Card Template`);
      
    } catch (err) {
      console.error('Error generating template:', err);
      // Only show non-route errors
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate template';
      if (!errorMessage.includes('Route') && !errorMessage.includes('not found')) {
        setError(errorMessage);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleImportData = async () => {
    if (!xlsxFile) {
      setError('Please select an Excel file first');
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const response = await bulkImportAPI.importExcel(xlsxFile, entityType);
      
      if (response.success) {
        const result = {
          success: response.results.success,
          failed: response.results.failed,
          message: response.message
        };
        setImportResult(result);
        
        // Add to recent imports list
        const newImport = {
          file: xlsxFile.name,
          records: response.results.success,
          status: response.results.failed === 0 ? 'success' as const : 'success' as const, // Still success even if some failed
          date: 'Just now'
        };
        setRecentImports(prev => [newImport, ...prev].slice(0, 5)); // Keep only last 5
        
        // Clear the file input after successful import
        setXlsxFile(null);
        
        // Reset file input element
        const fileInput = document.getElementById('xlsx-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        setError(response.message || 'Import failed');
      }
    } catch (err) {
      console.error('Error importing data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to import data';
      setError(errorMessage);
      setImportResult(null);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Bulk Operations</h1>
          <p className="text-gray-600">{ownSchool}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="entity-type" className="text-gray-700">Import Type:</Label>
            <Select value={entityType} onValueChange={(value) => setEntityType(value as EntityType)}>
              <SelectTrigger id="entity-type" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* School Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <School className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">{ownSchool}</h2>
            <p className="text-gray-600 text-sm">
              {entityConfig.description}
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="excel" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="excel">Excel Import</TabsTrigger>
          <TabsTrigger value="photos">Photo Upload</TabsTrigger>
        </TabsList>

        {/* Excel Import Tab */}
        <TabsContent value="excel" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-gray-900">Import from Excel</h2>
                  <p className="text-gray-600">{entityConfig.excelDescription}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-900 mb-2">
                    {xlsxFile ? xlsxFile.name : 'Drop your Excel file here'}
                  </p>
                  <p className="text-gray-600 mb-4">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    id="xlsx-upload"
                    onChange={(e) => setXlsxFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="xlsx-upload">
                    <Button type="button" variant="outline" asChild>
                      <span>Choose File</span>
                    </Button>
                  </label>
                </div>

                <Button 
                  className="w-full" 
                  disabled={!xlsxFile || isImporting}
                  onClick={handleImportData}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Data
                    </>
                  )}
                </Button>
                {importResult && (
                  <div className={`p-3 rounded-lg mt-2 ${
                    importResult.failed === 0 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-yellow-50 text-yellow-800'
                  }`}>
                    <p className="text-sm font-medium">{importResult.message}</p>
                    {importResult.failed > 0 && (
                      <p className="text-xs mt-1">
                        {importResult.success} successful, {importResult.failed} failed
                      </p>
                    )}
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleDownloadTemplate}
                  disabled={isDownloading || isLoadingTemplates}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </>
                  )}
                </Button>
                {error && !error.includes('Route') && !error.includes('not found') && (
                  <p className="text-sm text-red-600 mt-2">{error}</p>
                )}
                {isLoadingTemplates && (
                  <p className="text-sm text-gray-600 mt-2">Loading templates...</p>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Import Instructions</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="text-gray-900">Download the template</p>
                    <p className="text-gray-600">
                      Click "Download Template" to get the Excel file with columns matching the ID Card Template
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="text-gray-900">{entityConfig.fillDataText}</p>
                    <p className="text-gray-600">
                      Add {entityConfig.title.toLowerCase()} information following the template structure
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600">3</span>
                  </div>
                  <div>
                    <p className="text-gray-900">Upload the file</p>
                    <p className="text-gray-600">
                      Upload your completed Excel file to {entityConfig.uploadDataText.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-900 mb-2">Template Fields (from ID Card Template):</p>
                <ul className="text-gray-600 space-y-1">
                  {templates.length > 0 && selectedTemplateId ? (
                    (() => {
                      const selectedTemplate = templates.find(t => t._id === selectedTemplateId);
                      const templateFields = selectedTemplate?.dataTags || [];
                      return templateFields.length > 0 ? (
                        templateFields.map((field, index) => (
                          <li key={index}>• {getFieldHeader(field)}</li>
                        ))
                      ) : (
                        entityConfig.requiredFields.map((field, index) => (
                          <li key={index}>• {field}</li>
                        ))
                      );
                    })()
                  ) : (
                    entityConfig.requiredFields.map((field, index) => (
                      <li key={index}>• {field}</li>
                    ))
                  )}
                </ul>
                {templates.length > 0 && selectedTemplateId && (
                  <p className="text-xs text-gray-500 mt-2">
                    Fields from ID Card Template: {templates.find(t => t._id === selectedTemplateId)?.name || 'Selected Template'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Imports */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Recent Imports</h3>
            <div className="space-y-3">
              {recentImports.length > 0 ? (
                recentImports.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      {item.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="text-gray-900">{item.file}</p>
                        <p className="text-gray-600">
                          {item.status === 'success'
                            ? `${item.records} records imported`
                            : 'Import failed'}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-500">{item.date}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-center py-4">No recent imports</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Photo Upload Tab */}
        <TabsContent value="photos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Image className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-gray-900">Bulk Photo Upload</h2>
                  <p className="text-gray-600">{entityConfig.photoDescription}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-900 mb-2">
                    {photoFiles ? `${photoFiles.length} files selected` : 'Drop photos here'}
                  </p>
                  <p className="text-gray-600 mb-4">
                    or click to browse
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="photo-upload"
                    onChange={(e) => setPhotoFiles(e.target.files)}
                  />
                  <label htmlFor="photo-upload">
                    <Button type="button" variant="outline" asChild>
                      <span>Choose Files</span>
                    </Button>
                  </label>
                </div>

                <Button className="w-full" disabled={!photoFiles}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photos
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Photo Upload Instructions</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600">1</span>
                  </div>
                  <div>
                    <p className="text-gray-900">Name files correctly</p>
                    <p className="text-gray-600">
                      {entityConfig.photoNamingText}
                    </p>
                    <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">
                      {entityConfig.photoExample}
                    </code>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600">2</span>
                  </div>
                  <div>
                    <p className="text-gray-900">Use correct format</p>
                    <p className="text-gray-600">
                      Supported formats: JPG, PNG (Max 2MB per photo)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600">3</span>
                  </div>
                  <div>
                    <p className="text-gray-900">Upload in bulk</p>
                    <p className="text-gray-600">
                      Select all photos at once and upload
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <p className="text-gray-900 mb-2">Example File Names:</p>
                <div className="space-y-1">
                  {entityType === 'student' ? (
                    <>
                      <code className="text-gray-700 block">GPS1001.jpg</code>
                      <code className="text-gray-700 block">GPS1002.png</code>
                      <code className="text-gray-700 block">GPS1003.jpg</code>
                    </>
                  ) : (
                    <>
                      <code className="text-gray-700 block">{entityConfig.photoExample}</code>
                      <code className="text-gray-700 block">{entityConfig.photoExample.replace('.jpg', '2.png')}</code>
                      <code className="text-gray-700 block">{entityConfig.photoExample.replace('.jpg', '3.jpg')}</code>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
