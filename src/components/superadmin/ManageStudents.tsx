import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, Eye, CreditCard, ImageIcon, School, GraduationCap, ChevronRight } from 'lucide-react';
import { AddStudentModal } from '../modals/AddStudentModal';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { schoolAPI, studentAPI, classAPI, APIError } from '../../utils/api';

interface Student {
  _id?: string;
  id?: string;
  admissionNo: string;
  photo?: string;
  photoUrl?: string;
  name: string;
  class?: string;
  classId?: any;
  school?: string;
  schoolId?: any;
  session?: string;
  sessionId?: any;
  fatherName: string;
  mobile: string;
  dob: string;
}

export function ManageStudents() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [schools, setSchools] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

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
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          // Fetch classes for the school
          const classesResponse = await classAPI.getClasses({ schoolId: selectedSchoolId });
          if (classesResponse.success && classesResponse.data) {
            setClasses(classesResponse.data);
          }

          // Fetch students for the school
          const studentsResponse = await studentAPI.getStudents({ schoolId: selectedSchoolId });
          if (studentsResponse.success && studentsResponse.data) {
            // Map backend data to frontend format
            const mappedStudents = studentsResponse.data.map((student: any) => ({
              _id: student._id,
              id: student._id,
              admissionNo: student.admissionNo,
              photo: student.photoUrl,
              photoUrl: student.photoUrl,
              name: student.name,
              class: student.classId?.className || 'N/A',
              classId: student.classId,
              school: student.schoolId?.name || 'N/A',
              schoolId: student.schoolId,
              session: student.sessionId?.sessionName || 'N/A',
              sessionId: student.sessionId,
              fatherName: student.fatherName || '',
              mobile: student.mobile || '',
              dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
            }));
            setStudents(mappedStudents);
          }
        } catch (err) {
          const apiError = err as APIError;
          setError(apiError.message || 'Failed to load data');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [selectedSchoolId]);

  // Get unique classes for selected school
  const getClassesForSchool = (): string[] => {
    const uniqueClasses = new Set<string>();
    students.forEach(student => {
      if (student.class && student.class !== 'N/A') {
        uniqueClasses.add(student.class);
      }
    });
    return Array.from(uniqueClasses).sort();
  };

  // Get student count for a class
  const getStudentCountForClass = (className: string): number => {
    return students.filter(student => student.class === className).length;
  };

  // Get student count for a school
  const getStudentCountForSchool = (): number => {
    return students.length;
  };

  // Filter students by selected school and class
  const filteredStudents = selectedSchool && selectedClass
    ? students.filter(student => student.class === selectedClass)
    : [];

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleDelete = (studentId: string) => {
    // TODO: Wire delete API when CRUD is implemented
    console.log('Delete student:', studentId);
  };

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
      render: (student) => <span className="text-gray-700">{student.class || 'N/A'}</span>,
    },
    {
      key: 'fatherName',
      header: "Father's Name",
      sortable: true,
      render: (student) => <span className="text-gray-700">{student.fatherName || 'N/A'}</span>,
    },
    {
      key: 'mobile',
      header: 'Mobile',
      sortable: true,
      render: (student) => <span className="text-gray-700">{student.mobile || 'N/A'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (student) => {
        const studentId = student._id || student.id || '';
        return (
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
              onClick={() => handleDelete(studentId)}
              className="text-red-600 hover:text-red-700"
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
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedSchoolId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  // Render Schools List
  if (!selectedSchool) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
            <p className="text-gray-600">Select a school to view its classes and students</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-gray-900 font-semibold text-lg">Select a School</h2>
            <p className="text-gray-600 text-sm mt-1">Click on a school to view its classes</p>
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
      </div>
    );
  }

  // Render Classes List
  if (selectedSchool && !selectedClass) {
    const classList = getClassesForSchool();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
            <p className="text-gray-600">Select a class to view its students</p>
          </div>
        </div>

        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => {
            setSelectedSchool('');
            setSelectedSchoolId('');
            setStudents([]);
            setClasses([]);
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
                {loading ? 'Loading...' : `${getStudentCountForSchool()} ${getStudentCountForSchool() === 1 ? 'student' : 'students'} across ${classList.length} ${classList.length === 1 ? 'class' : 'classes'}`}
              </p>
            </div>
          </div>
        </div>

        {/* Classes List */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Loading classes...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-red-600">Error: {error}</p>
          </div>
        ) : classList.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 mb-4">No classes found</p>
            <p className="text-gray-500 text-sm">Classes will appear here once students are assigned to them.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-gray-900 font-semibold text-lg">Select a Class</h2>
              <p className="text-gray-600 text-sm mt-1">Click on a class to view its students</p>
            </div>
            <div className="divide-y divide-gray-200">
              {classList.map((className) => (
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
        )}
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
            {selectedSchool} - {selectedClass}
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
          onClick={() => {
            setSelectedClass('');
            setSelectedSchool('');
            setSelectedSchoolId('');
            setStudents([]);
            setClasses([]);
          }}
          className="text-gray-600 hover:text-gray-900"
        >
          Schools
        </Button>
        <span className="text-gray-400">/</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedClass('')}
          className="text-gray-600 hover:text-gray-900"
        >
          {selectedSchool}
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
              {selectedSchool} • {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
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
