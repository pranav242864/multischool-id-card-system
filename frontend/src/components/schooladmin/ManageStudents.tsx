import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, Eye, CreditCard, ImageIcon, School, GraduationCap, ChevronRight } from 'lucide-react';
import { AddStudentModal } from '../modals/AddStudentModal';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Student {
  id: string;
  admissionNo: string;
  photo?: string;
  name: string;
  class: string;
  session: string;
  fatherName: string;
  mobile: string;
  dob: string;
}

export function ManageStudents() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');

  // School admin's own school (in real app, this would come from user context)
  const ownSchool = 'Greenfield Public School';

  // All students for this school
  const allStudents: Student[] = [
    {
      id: '1',
      admissionNo: 'GPS1001',
      name: 'Emily Johnson',
      class: 'Class 10-A',
      school: ownSchool,
      session: '2025-26',
      fatherName: 'Robert Johnson',
      mobile: '+1 234 567 8901',
      dob: '2010-05-15',
    },
    {
      id: '2',
      admissionNo: 'GPS1002',
      name: 'Michael Chen',
      class: 'Class 10-A',
      school: ownSchool,
      session: '2025-26',
      fatherName: 'David Chen',
      mobile: '+1 234 567 8902',
      dob: '2010-08-22',
    },
    {
      id: '3',
      admissionNo: 'GPS1003',
      name: 'Sarah Williams',
      class: 'Class 9-B',
      school: ownSchool,
      session: '2025-26',
      fatherName: 'James Williams',
      mobile: '+1 234 567 8903',
      dob: '2011-03-10',
    },
    {
      id: '4',
      admissionNo: 'GPS1004',
      name: 'David Brown',
      class: 'Class 10-B',
      school: ownSchool,
      session: '2025-26',
      fatherName: 'Thomas Brown',
      mobile: '+1 234 567 8904',
      dob: '2010-11-28',
    },
  ];

  // Get unique classes for own school
  const getClassesForSchool = (): string[] => {
    const classes = allStudents
      .filter((student) => student.school === ownSchool)
      .map((student) => student.class);
    return Array.from(new Set(classes)).sort();
  };

  // Get student count for a class
  const getStudentCountForClass = (className: string): number => {
    return allStudents.filter(
      (student) => student.school === ownSchool && student.class === className
    ).length;
  };

  // Get student count for own school
  const getStudentCountForSchool = (): number => {
    return allStudents.filter((student) => student.school === ownSchool).length;
  };

  // Filter students by selected class
  const filteredStudents = selectedClass
    ? allStudents.filter(
        (student) => student.school === ownSchool && student.class === selectedClass
      )
    : [];

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
      key: 'class',
      header: 'Class',
      sortable: true,
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
    {
      key: 'actions',
      header: 'Actions',
      render: (student) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Edit"
            onClick={() => handleEdit(student)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Generate ID Card"
            className="text-blue-600"
          >
            <CreditCard className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Delete"
            onClick={() => handleDelete(student.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleDelete = (studentId: string) => {
    console.log('Delete student:', studentId);
  };

  // Render Classes List
  if (!selectedClass) {
    const classes = getClassesForSchool();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
            <p className="text-gray-600">Select a class to view its students</p>
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
                {getStudentCountForSchool()} {getStudentCountForSchool() === 1 ? 'student' : 'students'} across {classes.length} {classes.length === 1 ? 'class' : 'classes'}
              </p>
            </div>
          </div>
        </div>

        {/* Classes List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-gray-900 font-semibold text-lg">Select a Class</h2>
            <p className="text-gray-600 text-sm mt-1">Click on a class to view its students</p>
          </div>
          <div className="divide-y divide-gray-200">
            {classes.map((className) => (
              <button
                key={className}
                onClick={() => setSelectedClass(className)}
                className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium text-lg">{className}</p>
                      <p className="text-gray-600 text-sm mt-1">
                        {getStudentCountForClass(className)} {getStudentCountForClass(className) === 1 ? 'student' : 'students'}
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

  // Render Students Table
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
          <p className="text-gray-600">
            {ownSchool} - {selectedClass}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Student
        </Button>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedClass('')}
          className="text-gray-600 hover:text-gray-900"
        >
          Classes
        </Button>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">{selectedClass}</span>
      </div>

      {/* School and Class Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">{selectedClass}</h2>
            <p className="text-gray-600 text-sm">
              {ownSchool} • {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
            </p>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {filteredStudents.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <DataTable
            columns={columns}
            data={filteredStudents}
            searchPlaceholder="Search students..."
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">No students found in this class</p>
          <Button onClick={() => setIsModalOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Student to {selectedClass}
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddStudentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
        }}
        student={editingStudent}
      />
    </div>
  );
}
