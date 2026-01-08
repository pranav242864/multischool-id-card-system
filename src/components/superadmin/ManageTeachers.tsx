import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, UserCircle, School, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import { schoolAPI, teacherAPI, APIError } from '../../utils/api';

interface Teacher {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  mobile: string;
  school?: string;
  schoolId?: any;
  assignedClass?: string;
  classId?: any;
  subject?: string;
  status?: 'active' | 'inactive' | 'ACTIVE' | 'DISABLED';
}

export function ManageTeachers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [schools, setSchools] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    const fetchSchools = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await schoolAPI.getSchools();
        if (response.success && response.data) {
          setSchools(response.data);
        }
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.message || 'Failed to load schools');
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchoolId) {
      const fetchTeachers = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await teacherAPI.getTeachers({ schoolId: selectedSchoolId });
          if (response.success && response.data) {
            // Map backend data to frontend format
            const mappedTeachers = response.data.map((teacher: any) => ({
              _id: teacher._id,
              id: teacher._id,
              name: teacher.name,
              email: teacher.email || '',
              mobile: teacher.mobile || '',
              school: teacher.schoolId?.name || 'N/A',
              schoolId: teacher.schoolId,
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
    }
  }, [selectedSchoolId]);

  const filteredTeachers = teachers;

  const handleEdit = (teacher: Teacher) => {
    // TODO: Wire edit API when CRUD is implemented
    setIsModalOpen(true);
  };

  const handleDelete = (teacherId: string) => {
    // TODO: Wire delete API when CRUD is implemented
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
              onClick={() => handleEdit(teacher)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(teacherId)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading && !selectedSchoolId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Teachers</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedSchoolId) {
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
            {schools.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <School className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">No schools found</p>
                <p className="text-gray-500 text-sm">Schools will appear here once they are created.</p>
              </div>
            ) : (
              schools.map((school) => {
                const schoolId = school._id || school.id || '';
                return (
                  <button
                    key={schoolId}
                    onClick={() => {
                      setSelectedSchool(school.name);
                      setSelectedSchoolId(schoolId);
                    }}
                    className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <School className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-gray-900 font-medium text-lg">{school.name}</p>
                          <p className="text-gray-600 text-sm mt-1">
                            {school.city || 'No city specified'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Teachers Table */
        <div className="space-y-4">
          {/* Back Button */}
          <Button
            variant="outline"
            onClick={() => {
              setSelectedSchool('');
              setSelectedSchoolId('');
              setTeachers([]);
            }}
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
                  {loading ? 'Loading...' : `${filteredTeachers.length} ${filteredTeachers.length === 1 ? 'teacher' : 'teachers'}`}
                </p>
              </div>
            </div>
          </div>

          {/* Teachers Table */}
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600">Loading teachers...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-red-600">Error: {error}</p>
            </div>
          ) : filteredTeachers.length > 0 ? (
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
