import { useState } from 'react';
import { Button } from '../ui/button';
import { Upload, Download, FileSpreadsheet, Image, CheckCircle2, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export function BulkOperations() {
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900 mb-2">Bulk Operations</h1>
        <p className="text-gray-600">Import student data and photos in bulk</p>
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
                  <p className="text-gray-600">Upload student data</p>
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

                <Button className="w-full" disabled={!xlsxFile}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </Button>

                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
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
                      Click "Download Template" to get the Excel file with the correct format
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="text-gray-900">Fill in student data</p>
                    <p className="text-gray-600">
                      Add student information following the template structure
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
                      Upload your completed Excel file to import the data
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-900 mb-2">Required Fields:</p>
                <ul className="text-gray-600 space-y-1">
                  <li>• Admission Number</li>
                  <li>• Student Name</li>
                  <li>• Class</li>
                  <li>• Father's Name</li>
                  <li>• Mobile Number</li>
                  <li>• Date of Birth</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Recent Imports */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Recent Imports</h3>
            <div className="space-y-3">
              {[
                { file: 'students_class10A.xlsx', records: 45, status: 'success', date: '2 hours ago' },
                { file: 'students_class9B.xlsx', records: 38, status: 'success', date: '1 day ago' },
                { file: 'students_class10B.xlsx', records: 0, status: 'error', date: '2 days ago' },
              ].map((item, index) => (
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
              ))}
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
                  <p className="text-gray-600">Upload student photos</p>
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
                      Name each photo with the student's admission number
                    </p>
                    <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">
                      GPS1001.jpg
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
                  <code className="text-gray-700 block">GPS1001.jpg</code>
                  <code className="text-gray-700 block">GPS1002.png</code>
                  <code className="text-gray-700 block">GPS1003.jpg</code>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
