import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, UserCircle, School, ChevronRight, Download, Loader2, Snowflake } from 'lucide-react';
import { Badge } from '../ui/badge';
import { schoolAPI, teacherAPI, bulkImportAPI, downloadBlob, APIError } from '../../utils/api';
import { AddTeacherAdminModal } from '../modals/AddTeacherAdminModal';

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  // Get frozen status of selected school
  const isSchoolFrozen = selectedSchoolId 
    ? (schools.find(s => s._id === selectedSchoolId || s.id === selectedSchoolId)?.frozen || false)
    : false;

  const fetchTeachers = async () => {
    if (!selectedSchoolId) return;
    
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

  useEffect(() => {
    if (selectedSchoolId) {
      fetchTeachers();
    }
  }, [selectedSchoolId]);

  const handleAddTeacher = async () => {
    setSuccessMessage('Teacher created successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
    await fetchTeachers();
  };

  const filteredTeachers = teachers;

  const handleEdit = (teacher: Teacher) => {
    if (isSchoolFrozen) {
      setError('Cannot edit teachers in a frozen school. Please unfreeze the school first.');
      return;
    }
    setIsModalOpen(true);
  };

  const handleDelete = (teacherId: string) => {
    if (isSchoolFrozen) {
      setError('Cannot delete teachers from a frozen school. Please unfreeze the school first.');
      return;
    }
    // Delete functionality to be implemented
  };

  const handleExportExcel = async () => {
    if (!selectedSchoolId) {
      setError('Please select a school first');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const blob = await bulkImportAPI.exportExcel('teacher', selectedSchoolId);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `teachers_export_${timestamp}.xlsx`;
      downloadBlob(blob, filename);
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
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
              disabled={isSchoolFrozen}
              title={isSchoolFrozen ? 'Cannot edit teachers in a frozen school' : ''}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(teacherId)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={isSchoolFrozen}
              title={isSchoolFrozen ? 'Cannot delete teachers from a frozen school' : ''}
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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-gray-600">
              {selectedSchool
                ? `Viewing teachers for ${selectedSchool}`
                : 'Select a school to view its teachers'}
            </p>
            {selectedSchool && isSchoolFrozen && (
              <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                <Snowflake className="w-3 h-3 mr-1 fill-current" />
                School is Frozen
              </Badge>
            )}
          </div>
        </div>
        {selectedSchool && (
          <Button 
            onClick={() => {
              if (isSchoolFrozen) {
                setError('Cannot add teachers to a frozen school. Please unfreeze the school first.');
                return;
              }
              setIsModalOpen(true);
            }} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading || isSchoolFrozen}
            title={isSchoolFrozen ? 'Cannot add teachers to a frozen school' : ''}
          >
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
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900 font-medium text-lg">{school.name}</p>
                            {school.frozen && (
                              <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                                <Snowflake className="w-3 h-3 mr-1 fill-current" />
                                Frozen
                              </Badge>
                            )}
                          </div>
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
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => {
                setSelectedSchool('');
                setSelectedSchoolId('');
                setTeachers([]);
              }}
            >
              ← Back to Schools
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Excel
                </>
              )}
            </Button>
          </div>

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

      {/* Add Teacher Modal */}
      <AddTeacherAdminModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        schoolId={selectedSchoolId}
        onSave={handleAddTeacher}
      />
    </div>
  );
}
