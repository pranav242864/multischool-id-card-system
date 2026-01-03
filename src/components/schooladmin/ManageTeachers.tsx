import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, UserCircle, School } from 'lucide-react';
import { Badge } from '../ui/badge';

interface Teacher {
  id: string;
  name: string;
  email: string;
  mobile: string;
  assignedClass: string;
  subject: string;
  status: 'active' | 'inactive';
}

export function ManageTeachers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // School admin's own school (in real app, this would come from user context)
  const ownSchool = 'Greenfield Public School';

  // All teachers for this school
  const allTeachers: Teacher[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.j@greenfield.edu',
      mobile: '+1 234 567 8901',
      assignedClass: 'Class 10-A',
      subject: 'Mathematics',
      status: 'active',
    },
    {
      id: '2',
      name: 'Robert Williams',
      email: 'robert.w@greenfield.edu',
      mobile: '+1 234 567 8902',
      assignedClass: 'Class 9-B',
      subject: 'English',
      status: 'active',
    },
    {
      id: '3',
      name: 'Emily Davis',
      email: 'emily.d@greenfield.edu',
      mobile: '+1 234 567 8903',
      assignedClass: 'Class 10-B',
      subject: 'Science',
      status: 'active',
    },
  ];
  
  const teachers = allTeachers;

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
            <p className="text-gray-600">{teacher.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
      sortable: true,
    },
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
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
          {teacher.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: () => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
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
          <p className="text-gray-600">{ownSchool}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add New Teacher
        </Button>
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
              {teachers.length} {teachers.length === 1 ? 'teacher' : 'teachers'}
            </p>
          </div>
        </div>
      </div>

      {/* Teachers Table */}
      {teachers.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <DataTable
            columns={columns}
            data={teachers}
            searchPlaceholder="Search teachers..."
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">No teachers found</p>
          <Button onClick={() => setIsModalOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Teacher
          </Button>
        </div>
      )}
    </div>
  );
}
