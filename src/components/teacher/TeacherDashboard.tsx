import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { GraduationCap, Lock, ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Student {
  id: string;
  admissionNo: string;
  photo?: string;
  name: string;
  fatherName: string;
  mobile: string;
  dob: string;
}

export function TeacherDashboard() {
  const [isFrozen] = useState(true); // Class is frozen

  const students: Student[] = [
    {
      id: '1',
      admissionNo: 'GPS1001',
      name: 'Emily Johnson',
      fatherName: 'Robert Johnson',
      mobile: '+1 234 567 8901',
      dob: '2010-05-15',
    },
    {
      id: '2',
      admissionNo: 'GPS1002',
      name: 'Michael Chen',
      fatherName: 'David Chen',
      mobile: '+1 234 567 8902',
      dob: '2010-08-22',
    },
    {
      id: '3',
      admissionNo: 'GPS1005',
      name: 'Jessica Davis',
      fatherName: 'William Davis',
      mobile: '+1 234 567 8903',
      dob: '2010-06-18',
    },
  ];

  const columns: Column<Student>[] = [
    {
      key: 'photo',
      header: 'Photo',
      render: (student) => (
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
          {student.photo ? (
            <ImageWithFallback src={student.photo} alt={student.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>
      ),
    },
    {
      key: 'admissionNo',
      header: 'Admission No',
      sortable: true,
      render: (student) => (
        <span className="text-gray-900">{student.admissionNo}</span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (student) => (
        <div>
          <p className="text-gray-900">{student.name}</p>
          <p className="text-gray-600">DOB: {new Date(student.dob).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'fatherName',
      header: "Father's Name",
      sortable: true,
    },
    {
      key: 'mobile',
      header: 'Mobile',
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-gray-900">My Class</h1>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Class 10-A
          </Badge>
        </div>
        <p className="text-gray-600">View your assigned class students</p>
      </div>

      {/* Frozen Alert */}
      {isFrozen && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <Lock className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <span>This class is frozen.</span> All editing functions are disabled. 
            Contact your school administrator if you need to make changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600">Total Students</p>
              <p className="text-gray-900">{students.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600">Boys</p>
              <p className="text-gray-900">20</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-600">Girls</p>
              <p className="text-gray-900">18</p>
            </div>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div>
        <h2 className="text-gray-900 mb-4">Student List</h2>
        <DataTable
          columns={columns}
          data={students}
          searchPlaceholder="Search students..."
        />
      </div>
    </div>
  );
}
