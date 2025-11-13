import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, UserCircle } from 'lucide-react';
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

  const teachers: Teacher[] = [
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
          <h1 className="text-gray-900 mb-2">Manage Teachers</h1>
          <p className="text-gray-600">Add and manage teacher accounts</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Teacher
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={teachers}
        searchPlaceholder="Search teachers..."
      />
    </div>
  );
}
