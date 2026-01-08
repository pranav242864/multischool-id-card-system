import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, Eye, CreditCard, ImageIcon, School, GraduationCap, ChevronRight, AlertCircle, Snowflake } from 'lucide-react';
import { AddStudentModal } from '../modals/AddStudentModal';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { studentAPI, classAPI, APIError } from '../../utils/api';
import { Badge } from '../ui/badge';

interface Student {
  _id?: string;
  id?: string;
  admissionNo: string;
  photo?: string;
  photoUrl?: string;
  name: string;
  class?: string;
  classId?: any;
  session?: string;
  sessionId?: any;
  fatherName: string;
  motherName?: string;
  mobile: string;
  dob: string;
  address?: string;
  aadhaar?: string;
}

interface Class {
  _id: string;
  id?: string;
  className: string;
  classId?: string;
  frozen?: boolean;
}

export function ManageStudents() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(true);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await classAPI.getClasses();
        if (response.success && response.data) {
          const mappedClasses = response.data.map((cls: any) => ({
            _id: cls._id,
            id: cls._id,
            className: cls.className,
            classId: cls._id,
            frozen: cls.frozen || false,
          }));
          setClasses(mappedClasses);
          setHasActiveSession(true);
        }
      } catch (err) {
        const apiError = err as APIError;
        if (apiError.message?.includes('No active session found')) {
          setHasActiveSession(false);
          setClasses([]);
          setError(apiError.message || 'No active session found for this school. Please activate a session first.');
        } else {
          setError(apiError.message || 'Failed to load classes');
          setHasActiveSession(false);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // Fetch students when class is selected
  const fetchStudents = async () => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await studentAPI.getStudents({
        classId: selectedClass._id,
      });
      
      if (response.success && response.data) {
        const mappedStudents = response.data.map((student: any) => ({
          _id: student._id,
          id: student._id,
          admissionNo: student.admissionNo,
          photo: student.photoUrl,
          photoUrl: student.photoUrl,
          name: student.name,
          class: student.classId?.className || 'N/A',
          classId: student.classId,
          session: student.sessionId?.sessionName || 'N/A',
          sessionId: student.sessionId,
          fatherName: student.fatherName || '',
          motherName: student.motherName || '',
          mobile: student.mobile || '',
          dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
          address: student.address || '',
          aadhaar: student.aadhaar || '',
        }));
        setStudents(mappedStudents);
        setHasActiveSession(true);
      }
    } catch (err) {
      const apiError = err as APIError;
      if (apiError.message?.includes('No active session found')) {
        setHasActiveSession(false);
        setStudents([]);
        setError(apiError.message || 'No active session found for this school. Please activate a session first.');
      } else {
        setError(apiError.message || 'Failed to load students');
        setHasActiveSession(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClass?._id]);

  const handleDelete = async (studentId: string) => {
    if (!selectedClass) return;
    
    setDeletingStudentId(studentId);
    setError(null);

    try {
      await studentAPI.deleteStudent(studentId);
      // Re-fetch students after delete
      await fetchStudents();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to delete student');
    } finally {
      setDeletingStudentId(null);
    }
  };

  const handleCreateStudent = async () => {
    setCreating(true);
    setError(null);
    try {
      // Modal handles the creation, we just need to re-fetch
      await fetchStudents();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to refresh students');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStudent = async () => {
    setUpdating(true);
    setError(null);
    try {
      // Modal handles the update, we just need to re-fetch
      await fetchStudents();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to refresh students');
    } finally {
      setUpdating(false);
    }
  };

  // Check if selected class is frozen
  const isClassFrozen = selectedClass?.frozen === true;
  
  // Check if mutations are allowed
  const mutationsDisabled = !hasActiveSession || isClassFrozen || creating || updating || loading;

  const columns: Column<Student>[] = [
    {
      key: 'photo',
      header: 'Photo',
      render: (student) => (
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
          {student.photo || student.photoUrl ? (
            <ImageWithFallback src={student.photo || student.photoUrl || ''} alt={student.name} className="w-full h-full object-cover" />
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
          <p className="text-gray-600 text-sm">DOB: {student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}</p>
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
      render: (student) => {
        const studentId = student._id || student.id || '';
        const isDeleting = deletingStudentId === studentId;
        const isDisabled = mutationsDisabled || isDeleting;

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="View"
              disabled={isDisabled}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Edit"
              onClick={() => handleEdit(student)}
              disabled={isDisabled}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Generate ID Card"
              className="text-blue-600"
              disabled={isDisabled}
            >
              <CreditCard className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Delete"
              onClick={() => handleDelete(studentId)}
              className="text-red-600 hover:text-red-700"
              disabled={isDisabled}
            >
              {isDeleting ? '...' : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        );
      },
    },
  ];

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  if (loading && !selectedClass) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !hasActiveSession && !selectedClass) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-600 font-medium">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Classes List
  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
            <p className="text-gray-600">Select a class to view its students</p>
          </div>
        </div>

        {/* Error Display */}
        {error && hasActiveSession && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* No Active Session Warning */}
        {!hasActiveSession && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">No Active Session</h3>
            <p className="text-gray-600 mb-4">
              No active session found for this school. Please activate a session before managing students.
            </p>
            <p className="text-sm text-gray-500">
              All student operations are disabled until an active session is available.
            </p>
          </div>
        )}

        {/* School Header */}
        {hasActiveSession && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <School className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-gray-900 font-semibold text-lg">School</h2>
                <p className="text-gray-600 text-sm">
                  {classes.length} {classes.length === 1 ? 'class' : 'classes'} available
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Classes List */}
        {!hasActiveSession ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">No active session available</p>
            <p className="text-sm text-gray-500">
              Student management requires an active session. Please activate a session to continue.
            </p>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">No classes found for the active session</p>
            <p className="text-gray-500 text-sm">Classes will appear here once created.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-gray-900 font-semibold text-lg">Select a Class</h2>
              <p className="text-gray-600 text-sm mt-1">Click on a class to view its students</p>
            </div>
            <div className="divide-y divide-gray-200">
              {classes.map((cls) => (
                <button
                  key={cls._id}
                  onClick={() => setSelectedClass(cls)}
                  className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
                  disabled={!hasActiveSession}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${cls.frozen ? 'bg-blue-100' : 'bg-green-100'}`}>
                        <GraduationCap className={`w-6 h-6 ${cls.frozen ? 'text-blue-600' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 font-medium text-lg">{cls.className}</p>
                          {cls.frozen && (
                            <Badge variant="secondary" className="bg-blue-500 text-white">
                              <Snowflake className="w-3 h-3 mr-1" />
                              Frozen
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mt-1">
                          {cls.frozen ? 'Class is frozen - no modifications allowed' : 'Click to view students'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Students Table
  const frozenMessage = isClassFrozen 
    ? 'This class is frozen. Student modifications (create, update, delete) are not allowed.'
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
          <p className="text-gray-600">
            {selectedClass.className}
          </p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={mutationsDisabled}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Student
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

      {/* Frozen Class Warning */}
      {frozenMessage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <Snowflake className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-600 font-medium">Frozen Class</p>
              <p className="text-sm text-yellow-600 mt-1">{frozenMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedClass(null);
            setStudents([]);
            setError(null);
          }}
          className="text-gray-600 hover:text-gray-900"
          disabled={loading || creating || updating}
        >
          Classes
        </Button>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">{selectedClass.className}</span>
        {selectedClass.frozen && (
          <>
            <span className="text-gray-400">/</span>
            <Badge variant="secondary" className="bg-blue-500 text-white">
              <Snowflake className="w-3 h-3 mr-1" />
              Frozen
            </Badge>
          </>
        )}
      </div>

      {/* Class Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedClass.frozen ? 'bg-blue-100' : 'bg-green-100'}`}>
            <GraduationCap className={`w-6 h-6 ${selectedClass.frozen ? 'text-blue-600' : 'text-green-600'}`} />
          </div>
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">{selectedClass.className}</h2>
            <p className="text-gray-600 text-sm">
              {students.length} {students.length === 1 ? 'student' : 'students'}
              {selectedClass.frozen && ' (Frozen - modifications disabled)'}
            </p>
          </div>
        </div>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600">Loading students...</p>
        </div>
      ) : students.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <DataTable
            columns={columns}
            data={students}
            searchPlaceholder="Search students..."
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">No students found in this class</p>
          <Button 
            onClick={() => setIsModalOpen(true)} 
            variant="outline"
            disabled={mutationsDisabled}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Student to {selectedClass.className}
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddStudentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
          setError(null);
        }}
        student={editingStudent}
        selectedClass={selectedClass}
        onSave={editingStudent ? handleUpdateStudent : handleCreateStudent}
      />
    </div>
  );
}
