import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, UserCircle, School, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { teacherAPI, classAPI, APIError } from '../../utils/api';
import { AddTeacherModal } from '../modals/AddTeacherModal';

interface Teacher {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  mobile: string;
  assignedClass?: string;
  classId?: any;
  userId?: any;
  photoUrl?: string;
  status?: 'ACTIVE' | 'DISABLED';
}

export function ManageTeachers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(true);
  const [deletingTeacherId, setDeletingTeacherId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);

  // School admin can delete teachers

  // Fetch classes on mount to check active session
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await classAPI.getClasses();
        if (response.success && response.data) {
          setClasses(response.data);
          setHasActiveSession(true);
        }
      } catch (err) {
        const apiError = err as APIError;
        if (apiError.message?.includes('No active session found')) {
          setHasActiveSession(false);
          setClasses([]);
        }
      }
    };

    fetchClasses();
  }, []);

  // Fetch teachers on mount and after mutations
  const fetchTeachers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await teacherAPI.getTeachers();
      if (response.success && response.data) {
        const mappedTeachers = response.data.map((teacher: any) => ({
          _id: teacher._id,
          id: teacher._id,
          name: teacher.name,
          email: teacher.email || '',
          mobile: teacher.mobile || '',
          assignedClass: teacher.classId?.className || 'Not Assigned',
          classId: teacher.classId,
          userId: teacher.userId,
          photoUrl: teacher.photoUrl || '',
          status: teacher.status || 'ACTIVE',
        }));
        setTeachers(mappedTeachers);
        setHasActiveSession(true);
      }
    } catch (err) {
      const apiError = err as APIError;
      if (apiError.message?.includes('No active session found')) {
        setHasActiveSession(false);
        setTeachers([]);
        setError(apiError.message || 'No active session found for this school. Please activate a session first.');
      } else {
        setError(apiError.message || 'Failed to load teachers');
        setHasActiveSession(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleDelete = async (teacherId: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) {
      return;
    }

    setDeletingTeacherId(teacherId);
    setError(null);

    try {
      await teacherAPI.deleteTeacher(teacherId);
      // Re-fetch teachers after delete
      await fetchTeachers();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to delete teacher');
    } finally {
      setDeletingTeacherId(null);
    }
  };

  const handleCreateTeacher = async () => {
    setCreating(true);
    setError(null);
    try {
      // Modal handles the creation, we just need to re-fetch
      await fetchTeachers();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to refresh teachers');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTeacher = async () => {
    setUpdating(true);
    setError(null);
    try {
      // Modal handles the update, we just need to re-fetch
      await fetchTeachers();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to refresh teachers');
    } finally {
      setUpdating(false);
    }
  };

  // Check if mutations are allowed
  const mutationsDisabled = !hasActiveSession || creating || updating || loading;

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
      key: 'assignedClass',
      header: 'Assigned Class',
      sortable: true,
      render: (teacher) => (
        <Badge variant="outline">{teacher.assignedClass || 'Not Assigned'}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (teacher) => {
        const status = (teacher.status || 'ACTIVE').toUpperCase();
        return (
          <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
            {status === 'ACTIVE' ? 'Active' : 'Disabled'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (teacher) => {
        const teacherId = teacher._id || teacher.id || '';
        const isDeleting = deletingTeacherId === teacherId;
        const isDisabled = mutationsDisabled || isDeleting;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              title="Edit"
              onClick={() => {
                setEditingTeacher(teacher);
                setIsModalOpen(true);
              }}
              disabled={isDisabled}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Delete"
              onClick={() => handleDelete(teacherId)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={isDisabled}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading && teachers.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Teachers</h1>
          <p className="text-gray-600">Loading...</p>
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
        <Button 
          onClick={() => {
            setEditingTeacher(null);
            setIsModalOpen(true);
          }} 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={mutationsDisabled}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Teacher
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-600 font-medium">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* No Active Session Warning */}
      {!hasActiveSession && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-600 font-medium">No Active Session</p>
              <p className="text-sm text-yellow-600 mt-1">
                No active session found for this school. Teacher management operations are disabled until an active session is available.
              </p>
            </div>
          </div>
        </div>
      )}

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
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">Loading teachers...</p>
        </div>
      ) : teachers.length > 0 ? (
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
          <Button 
            onClick={() => {
              setEditingTeacher(null);
              setIsModalOpen(true);
            }} 
            variant="outline"
            disabled={mutationsDisabled}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Teacher
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddTeacherModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTeacher(null);
          setError(null);
        }}
        teacher={editingTeacher}
        classes={classes}
        onSave={editingTeacher ? handleUpdateTeacher : handleCreateTeacher}
      />
    </div>
  );
}
