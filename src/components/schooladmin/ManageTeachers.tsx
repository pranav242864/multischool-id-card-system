import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, UserCircle, School } from 'lucide-react';
import { Badge } from '../ui/badge';
import { teacherAPI, APIError } from '../../utils/api';

interface Teacher {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  mobile: string;
  assignedClass?: string;
  classId?: any;
  subject?: string;
  status?: 'active' | 'inactive' | 'ACTIVE' | 'DISABLED';
}

export function ManageTeachers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await teacherAPI.getTeachers();
        if (response.success && response.data) {
          // Map backend data to frontend format
          const mappedTeachers = response.data.map((teacher: any) => ({
            _id: teacher._id,
            id: teacher._id,
            name: teacher.name,
            email: teacher.email || '',
            mobile: teacher.mobile || '',
            assignedClass: teacher.classId?.className || 'N/A',
            classId: teacher.classId,
            subject: 'N/A', // Not available in backend
            status: (teacher.status || 'ACTIVE').toLowerCase() as 'active' | 'inactive',
          }));
          setTeachers(mappedTeachers);
        }
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.message || 'Failed to load teachers');
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, []);

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
    },
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      render: (teacher) => <span className="text-gray-700">{teacher.subject || 'N/A'}</span>,
    },
    {
      key: 'assignedClass',
      header: 'Assigned Class',
      sortable: true,
      render: (teacher) => (
        <Badge variant="outline">{teacher.assignedClass || 'N/A'}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (teacher) => {
        const status = (teacher.status || 'active').toLowerCase();
        return (
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (teacher) => {
        const teacherId = teacher._id || teacher.id || '';
        return (
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
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Teachers</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Teachers</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Teachers</h1>
          <p className="text-gray-600">Manage teachers for your school</p>
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
            <h2 className="text-gray-900 font-semibold text-lg">School</h2>
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
