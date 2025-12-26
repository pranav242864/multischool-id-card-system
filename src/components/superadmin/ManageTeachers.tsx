import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, UserCircle, School, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';

interface Teacher {
  id: string;
  name: string;
  email: string;
  mobile: string;
  school: string;
  assignedClass: string;
  subject: string;
  status: 'active' | 'inactive';
}

export function ManageTeachers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>('');

  // List of all registered schools
  const schools = [
    'Greenfield Public School',
    'Riverside High School',
    'Oakwood Academy',
    'Maple Grove School',
  ];

  // All teachers with their school information
  const allTeachers: Teacher[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.j@greenfield.edu',
      mobile: '+1 234 567 8901',
      school: 'Greenfield Public School',
      assignedClass: 'Class 10-A',
      subject: 'Mathematics',
      status: 'active',
    },
    {
      id: '2',
      name: 'Robert Williams',
      email: 'robert.w@greenfield.edu',
      mobile: '+1 234 567 8902',
      school: 'Greenfield Public School',
      assignedClass: 'Class 9-B',
      subject: 'English',
      status: 'active',
    },
    {
      id: '3',
      name: 'Emily Davis',
      email: 'emily.d@greenfield.edu',
      mobile: '+1 234 567 8903',
      school: 'Greenfield Public School',
      assignedClass: 'Class 10-B',
      subject: 'Science',
      status: 'active',
    },
    {
      id: '4',
      name: 'Michael Chen',
      email: 'michael.c@riverside.edu',
      mobile: '+1 234 567 8904',
      school: 'Riverside High School',
      assignedClass: 'Class 11-A',
      subject: 'Physics',
      status: 'active',
    },
    {
      id: '5',
      name: 'Lisa Anderson',
      email: 'lisa.a@riverside.edu',
      mobile: '+1 234 567 8905',
      school: 'Riverside High School',
      assignedClass: 'Class 12-B',
      subject: 'Chemistry',
      status: 'active',
    },
    {
      id: '6',
      name: 'David Brown',
      email: 'david.b@oakwood.edu',
      mobile: '+1 234 567 8906',
      school: 'Oakwood Academy',
      assignedClass: 'Class 9-A',
      subject: 'History',
      status: 'active',
    },
    {
      id: '7',
      name: 'Jennifer Wilson',
      email: 'jennifer.w@maplegrove.edu',
      mobile: '+1 234 567 8907',
      school: 'Maple Grove School',
      assignedClass: 'Class 10-A',
      subject: 'Biology',
      status: 'inactive',
    },
  ];

  // Filter teachers by selected school
  const filteredTeachers = selectedSchool
    ? allTeachers.filter((teacher) => teacher.school === selectedSchool)
    : [];

  // Get teacher count per school
  const getTeacherCount = (schoolName: string) => {
    return allTeachers.filter((teacher) => teacher.school === schoolName).length;
  };

  const handleEdit = (teacher: Teacher) => {
    // Handle edit logic
    setIsModalOpen(true);
  };

  const handleDelete = (teacherId: string) => {
    // Handle delete logic
    console.log('Delete teacher:', teacherId);
  };

  const columns: Column<Teacher>[] = [
    {
      key: 'name',
      header: 'Teacher Name',
      sortable: true,
      render: (teacher) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <UserCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-gray-900">{teacher.name}</p>
            <p className="text-gray-600 text-sm">{teacher.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
      sortable: true,
      render: (teacher) => <span className="text-gray-700">{teacher.mobile}</span>,
    },
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      render: (teacher) => <span className="text-gray-700">{teacher.subject}</span>,
    },
    {
      key: 'assignedClass',
      header: 'Assigned Class',
      sortable: true,
      render: (teacher) => (
        <Badge variant="outline">{teacher.assignedClass}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (teacher) => (
        <Badge variant={teacher.status === 'active' ? 'default' : 'secondary'}>
          {teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (teacher) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(teacher)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(teacher.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Teachers</h1>
          <p className="text-gray-600">
            {selectedSchool
              ? `Viewing teachers for ${selectedSchool}`
              : 'Select a school to view its teachers'}
          </p>
        </div>
        {selectedSchool && (
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Teacher
          </Button>
        )}
      </div>

      {!selectedSchool ? (
        /* Schools List */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-gray-900 font-semibold text-lg">Select a School</h2>
            <p className="text-gray-600 text-sm mt-1">Click on a school to view its teachers</p>
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
                        {getTeacherCount(school)} {getTeacherCount(school) === 1 ? 'teacher' : 'teachers'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Teachers Table */
        <div className="space-y-4">
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
                  {filteredTeachers.length} {filteredTeachers.length === 1 ? 'teacher' : 'teachers'}
                </p>
              </div>
            </div>
          </div>

          {/* Teachers Table */}
          {filteredTeachers.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200">
              <DataTable
                columns={columns}
                data={filteredTeachers}
                searchPlaceholder="Search teachers..."
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">No teachers found for this school</p>
              <Button onClick={() => setIsModalOpen(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Teacher for {selectedSchool}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

