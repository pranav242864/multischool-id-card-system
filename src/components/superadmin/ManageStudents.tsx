import { useState, useEffect } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, Eye, CreditCard, School, GraduationCap, ChevronRight, Loader2, RefreshCw, Download, ArrowUp, Snowflake } from 'lucide-react';
import { AddStudentModal } from '../modals/AddStudentModal';
import { schoolAPI, studentAPI, classAPI, pdfAPI, previewAPI, bulkImportAPI, downloadBlob, APIError } from '../../utils/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
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
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [generatingBulkPdf, setGeneratingBulkPdf] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [selectedTargetClass, setSelectedTargetClass] = useState<string>('');
  const [targetClassName, setTargetClassName] = useState<string>('');
  const [targetSection, setTargetSection] = useState<string>('');

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

  const fetchData = async () => {
    if (!selectedSchoolId) return;
    
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
      console.log('[FRONTEND] API Response:', studentsResponse);
      
      if (studentsResponse.success && studentsResponse.data) {
        console.log('[FRONTEND] Students data received:', studentsResponse.data);
        
        // Map backend data to frontend format
        const mappedStudents = studentsResponse.data.map((student: any) => {
          console.log(`[FRONTEND] Processing student ${student.admissionNo}:`, {
            photoUrl: student.photoUrl,
            photo: student.photo,
            hasPhotoUrl: !!student.photoUrl,
            photoUrlType: typeof student.photoUrl
          });
          
          // Get photoUrl from student object (check multiple possible locations)
          let photoUrl = student.photoUrl || student.photo || null;
          
          console.log(`[FRONTEND] Student ${student.admissionNo} - Initial photoUrl:`, photoUrl);
          
          // Convert photoUrl to use API base URL if it's a relative path
          if (photoUrl) {
            // If it's a relative path, convert to full URL using API base
            if (photoUrl.startsWith('/uploads/')) {
              const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
              const baseUrl = API_BASE_URL.replace('/api/v1', '');
              photoUrl = `${baseUrl}${photoUrl}`;
              console.log(`[FRONTEND] Student ${student.admissionNo} - Converted relative path to:`, photoUrl);
            } else {
              console.log(`[FRONTEND] Student ${student.admissionNo} - Keeping full URL as is:`, photoUrl);
            }
          } else {
            console.log(`[FRONTEND] Student ${student.admissionNo} - No photoUrl found`);
          }
          
          const mappedStudent = {
            _id: student._id,
            id: student._id,
            admissionNo: student.admissionNo,
            photo: photoUrl,
            photoUrl: photoUrl,
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
          };
          
          console.log(`[FRONTEND] Student ${student.admissionNo} - Mapped student photoUrl:`, mappedStudent.photoUrl);
          
          return mappedStudent;
        });
        
        console.log('[FRONTEND] Mapped students:', mappedStudents);
        setStudents(mappedStudents);
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSchoolId]);

  // Refresh classes when modal opens to ensure newly created classes are available
  useEffect(() => {
    if (isModalOpen && selectedSchoolId) {
      const refreshClasses = async () => {
        try {
          const classesResponse = await classAPI.getClasses({ schoolId: selectedSchoolId });
          if (classesResponse.success && classesResponse.data) {
            setClasses(classesResponse.data);
          }
        } catch (err) {
          // Silently fail - don't show error for background refresh
        }
      };
      refreshClasses();
    }
  }, [isModalOpen, selectedSchoolId]);

  // Refresh classes when returning to class selection view (when selectedClass is cleared)
  // This ensures newly created classes appear in the list
  useEffect(() => {
    if (!selectedClass && selectedSchoolId && classes.length >= 0) {
      // Only refresh if we have a school selected but no class selected (on class selection view)
      const refreshClasses = async () => {
        try {
          const classesResponse = await classAPI.getClasses({ schoolId: selectedSchoolId });
          if (classesResponse.success && classesResponse.data) {
            setClasses(classesResponse.data);
          }
        } catch (err) {
          // Silently fail - don't show error for background refresh
        }
      };
      // Small delay to avoid excessive refreshes
      const timeoutId = setTimeout(refreshClasses, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedClass, selectedSchoolId]);

  // Get unique classes for selected school
  // Use the classes array fetched from API (not just classes with students)
  const getClassesForSchool = (): Array<{ name: string; id: string; studentCount: number }> => {
    // First, get all classes from the classes array
    const classMap = new Map<string, { name: string; id: string; studentCount: number }>();
    
    // Add all classes from the API response
    classes.forEach((cls: any) => {
      const className = cls.className || cls.name;
      const classId = cls._id || cls.id;
      if (className && classId) {
        classMap.set(className, {
          name: className,
          id: classId,
          studentCount: 0 // Will be updated below
        });
      }
    });
    
    // Update student counts from students array
    students.forEach(student => {
      if (student.class && student.class !== 'N/A') {
        const existing = classMap.get(student.class);
        if (existing) {
          existing.studentCount += 1;
        } else {
          // If class exists in students but not in classes array, add it
          classMap.set(student.class, {
            name: student.class,
            id: student.classId?._id || student.classId || '',
            studentCount: 1
          });
        }
      }
    });
    
    return Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Get student count for a class (kept for backward compatibility)
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
    // Delete functionality to be implemented
  };

  const handleGeneratePDF = async (student: Student) => {
    const studentId = student._id || student.id || '';
    if (!studentId || !selectedSchoolId) return;

    setGeneratingPdfId(studentId);
    setError(null);

    try {
      const blob = await pdfAPI.generateStudentPDF(studentId, selectedSchoolId);
      const filename = `student-${student.admissionNo}.pdf`;
      downloadBlob(blob, filename);
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to generate PDF');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handlePreview = async (student: Student) => {
    const studentId = student._id || student.id || '';
    if (!studentId || !selectedSchoolId) return;

    setIsPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml('');
    setError(null);

    try {
      const response = await previewAPI.previewStudentCard(studentId, selectedSchoolId);
      if (response.success && response.html) {
        setPreviewHtml(response.html);
      } else {
        setError('Preview not available');
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to load preview');
      setIsPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleBulkPDF = async () => {
    if (selectedStudents.size === 0 || !selectedSchoolId) return;

    setGeneratingBulkPdf(true);
    setError(null);

    try {
      const studentIds = Array.from(selectedStudents);
      const blob = await pdfAPI.generateBulkStudentPDF(studentIds, selectedSchoolId);
      const filename = `students-bulk-${new Date().toISOString().split('T')[0]}.zip`;
      downloadBlob(blob, filename);
      setSelectedStudents(new Set());
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to generate bulk PDF');
    } finally {
      setGeneratingBulkPdf(false);
    }
  };

  const handleToggleSelect = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    const allStudentIds = filteredStudents.map(student => student._id || student.id).filter(Boolean) as string[];
    setSelectedStudents(new Set(allStudentIds));
  };

  const handleExportExcel = async () => {
    if (!selectedSchoolId) {
      setError('Please select a school first');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const blob = await bulkImportAPI.exportExcel('student', selectedSchoolId);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `students_export_${timestamp}.xlsx`;
      downloadBlob(blob, filename);
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBulkPromote = async () => {
    if (selectedStudents.size === 0 || !selectedSchoolId) {
      setError('Please select at least one student');
      return;
    }

    if (!targetClassName || targetClassName.trim() === '') {
      setError('Please enter a target class name');
      return;
    }

    // Find the target class by name
    const targetClass = classes.find((cls: any) => {
      const className = (cls.className || cls.name || '').trim().toLowerCase();
      const inputName = targetClassName.trim().toLowerCase();
      return className === inputName;
    });

    if (!targetClass) {
      setError(`Class "${targetClassName}" not found. Please enter a valid class name.`);
      return;
    }

    // Validate: Check if promotion is allowed (no demotion)
    const currentClass = classes.find((cls: any) => (cls.className || cls.name) === selectedClass);
    
    if (currentClass && targetClass) {
      const currentClassName = currentClass.className || currentClass.name;
      const targetClassName = targetClass.className || targetClass.name;
      const currentClassNumber = extractClassNumber(currentClassName);
      const targetClassNumber = extractClassNumber(targetClassName);

      if (currentClassNumber !== null && targetClassNumber !== null) {
        if (targetClassNumber < currentClassNumber) {
          setError('Class demotion is not allowed. You can only promote students to a higher class.');
          return;
        }
      }
    }

    setIsPromoting(true);
    setError(null);

    try {
      const studentIds = Array.from(selectedStudents);
      const targetClassId = targetClass._id || targetClass.id;
      
      console.log('Bulk promote request:', { studentIds, targetClassId, selectedSchoolId });
      
      const response = await studentAPI.bulkPromoteStudents(studentIds, targetClassId, selectedSchoolId);
      
      if (response.success) {
        // Refresh the data
        await fetchData();
        setSelectedStudents(new Set());
        setSelectedTargetClass('');
        setTargetClassName('');
        setTargetSection('');
        setIsPromotionModalOpen(false);
        // Show success message
        setError(null);
        alert(response.message || `Successfully promoted ${response.results?.success || 0} student(s)`);
      } else {
        setError(response.message || 'Failed to promote students');
      }
    } catch (err: any) {
      console.error('Bulk promote error:', err);
      const apiError = err as APIError;
      // Show more specific error message
      if (apiError.message) {
        setError(apiError.message);
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to promote students. Please try again.');
      } else {
        setError('Failed to promote students. Please check your connection and try again.');
      }
    } finally {
      setIsPromoting(false);
    }
  };

  // Extract class number from class name (e.g., "Class 1 A" -> 1, "Class 10" -> 10)
  const extractClassNumber = (className: string): number | null => {
    if (!className) return null;
    const match = className.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  };

  // Get available classes for promotion (only higher classes, no demotion)
  const getAvailableClassesForPromotion = () => {
    if (!selectedClass || !classes.length) return classes;
    
    const currentClass = classes.find((cls: any) => (cls.className || cls.name) === selectedClass);
    if (!currentClass) return classes;

    const currentClassName = currentClass.className || currentClass.name;
    const currentClassNumber = extractClassNumber(currentClassName);

    // Filter classes: only show higher classes (promotion only, no demotion)
    return classes.filter((cls: any) => {
      const classId = cls._id || cls.id;
      const currentClassId = currentClass._id || currentClass.id;
      
      // Exclude current class
      if (classId === currentClassId) return false;

      // If we can extract class numbers, only allow promotion (higher class number)
      if (currentClassNumber !== null) {
        const targetClassNumber = extractClassNumber(cls.className || cls.name);
        if (targetClassNumber !== null) {
          // Only allow promotion to higher classes
          return targetClassNumber > currentClassNumber;
        }
      }

      // If we can't determine class numbers, allow all other classes
      return true;
    }).sort((a: any, b: any) => {
      // Sort by class number if available
      const numA = extractClassNumber(a.className || a.name);
      const numB = extractClassNumber(b.className || b.name);
      if (numA !== null && numB !== null) {
        return numA - numB;
      }
      return (a.className || a.name).localeCompare(b.className || b.name);
    });
  };

  const columns: Column<Student>[] = [
    {
      key: 'select',
      header: '',
      render: (student) => {
        const studentId = student._id || student.id || '';
        return (
          <input
            type="checkbox"
            checked={selectedStudents.has(studentId)}
            onChange={() => handleToggleSelect(studentId)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        );
      },
    },
    {
      key: 'photo',
      header: 'Photo',
      render: (student) => {
        // Get photoUrl directly from student object - check all possible fields
        const photoSrc = student.photoUrl || student.photo || null;
        
        console.log(`[FRONTEND_RENDER] Rendering photo for ${student.admissionNo}:`, {
          photoSrc,
          photoUrl: student.photoUrl,
          photo: student.photo,
          hasPhotoSrc: !!photoSrc
        });
        
        return (
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
            {photoSrc ? (
              <img 
                src={photoSrc} 
                alt={student.name} 
                className="w-full h-full object-cover"
                onLoad={() => {
                  console.log(`[FRONTEND_RENDER] Image loaded successfully for ${student.admissionNo}:`, photoSrc);
                }}
                onError={(e) => {
                  console.error(`[FRONTEND_RENDER] Image failed to load for ${student.admissionNo}:`, photoSrc);
                  console.error(`[FRONTEND_RENDER] Error event:`, e);
                  // If image fails to load, show nothing (no placeholder)
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs text-gray-500">No Photo</span>
              </div>
            )}
          </div>
        );
      },
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
        const isGeneratingPdf = generatingPdfId === studentId;
        const isDisabledForActions = isGeneratingPdf;

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="Preview"
              onClick={() => handlePreview(student)}
              disabled={isDisabledForActions}
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
              onClick={() => handleGeneratePDF(student)}
              className="text-blue-600"
              disabled={isDisabledForActions}
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
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
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-600">Select a class to view its students</p>
              {isSchoolFrozen && (
                <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                  <Snowflake className="w-3 h-3 mr-1 fill-current" />
                  School is Frozen
                </Badge>
              )}
            </div>
          </div>
          {selectedSchoolId && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={isExporting || loading}
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
              <Button
                variant="outline"
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}
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
              <div className="flex items-center gap-2">
                <h2 className="text-gray-900 font-semibold text-lg">{selectedSchool}</h2>
                {isSchoolFrozen && (
                  <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                    <Snowflake className="w-3 h-3 mr-1 fill-current" />
                    Frozen
                  </Badge>
                )}
              </div>
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
              {classList.map((classItem) => (
                <button
                  key={classItem.id || classItem.name}
                  onClick={() => setSelectedClass(classItem.name)}
                  className="w-full p-6 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium text-lg">{classItem.name}</p>
                        <p className="text-gray-600 text-sm mt-1">
                          {classItem.studentCount} {classItem.studentCount === 1 ? 'student' : 'students'}
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-gray-900 mb-2 text-2xl font-bold">Manage Students</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-600">
                {selectedSchool} - {selectedClass}
              </p>
              {isSchoolFrozen && (
                <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                  <Snowflake className="w-3 h-3 mr-1 fill-current" />
                  School is Frozen
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={isExporting || loading || !selectedSchoolId}
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
            <Button 
              variant="outline"
              onClick={fetchData}
              disabled={loading || !selectedSchoolId}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add New Student
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar - Always visible when students are selected */}
        {selectedStudents.size > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-900">
                  {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleBulkPDF}
                  className="text-gray-600 hover:text-gray-900"
                  disabled={generatingBulkPdf || !selectedSchoolId}
                >
                  {generatingBulkPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Generate PDFs
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTargetClass('');
                    setIsPromotionModalOpen(true);
                  }}
                  className="text-gray-600 hover:text-gray-900"
                  disabled={isPromoting || !selectedSchoolId}
                  title="Promote selected students to a new class"
                >
                  {isPromoting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Promoting...
                    </>
                  ) : (
                    <>
                      <ArrowUp className="w-4 h-4 mr-2" />
                      Bulk Promote
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  className="text-gray-600 hover:text-gray-900"
                  disabled={filteredStudents.length === 0}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedStudents(new Set())}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </div>
        )}
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start gap-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

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
          setError(null);
        }}
        student={editingStudent}
        selectedClass={selectedClass ? classes.find((cls: any) => (cls.className || cls.name) === selectedClass) || null : null}
        schoolId={selectedSchoolId}
        onSave={async () => {
          // Refresh data after save
          if (selectedSchoolId) {
            setLoading(true);
            try {
              const classesResponse = await classAPI.getClasses({ schoolId: selectedSchoolId });
              if (classesResponse.success && classesResponse.data) {
                setClasses(classesResponse.data);
              }
              const studentsResponse = await studentAPI.getStudents({ schoolId: selectedSchoolId });
              if (studentsResponse.success && studentsResponse.data) {
                const mappedStudents = studentsResponse.data.map((student: any) => {
                  // Get photoUrl directly from backend response
                  let photoUrl = student.photoUrl || null;
                  
                  // Convert photoUrl to use API base URL if it's a relative path
                  if (photoUrl) {
                    // If it's a relative path, convert to full URL using API base
                    if (photoUrl.startsWith('/uploads/')) {
                      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
                      const baseUrl = API_BASE_URL.replace('/api/v1', '');
                      photoUrl = `${baseUrl}${photoUrl}`;
                    }
                  }
                  
                  return {
                    _id: student._id,
                    id: student._id,
                    admissionNo: student.admissionNo,
                    photoUrl: photoUrl, // Store photoUrl directly
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
                  };
                });
                setStudents(mappedStudents);
              }
            } catch (err) {
              const apiError = err as APIError;
              setError(apiError.message || 'Failed to refresh data');
            } finally {
              setLoading(false);
            }
          }
        }}
      />

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Student Card Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : previewHtml ? (
              <div 
                className="w-full"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="p-12 text-center text-gray-600">
                Preview not available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Promotion Modal */}
      <Dialog open={isPromotionModalOpen} onOpenChange={(open) => {
        setIsPromotionModalOpen(open);
        if (!open) {
          setSelectedTargetClass('');
          setTargetSection('');
          setError(null);
        }
      }}>
        <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Bulk Promote Students</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <p className="text-sm text-gray-600">
              Promote {selectedStudents.size} selected student(s). Only class promotion and section change are allowed. Class demotion is not allowed.
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Class <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={targetClassName}
                onChange={(e) => {
                  setTargetClassName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., Class 2, Class 3, Class 10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isPromoting}
                list="availableClasses"
              />
              <datalist id="availableClasses">
                {getAvailableClassesForPromotion().map((cls: any) => (
                  <option key={cls._id} value={cls.className || cls.name} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">
                Current class: {selectedClass || 'N/A'} • Enter a higher class name (promotion only, no demotion)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section (Optional)
              </label>
              <input
                type="text"
                value={targetSection}
                onChange={(e) => {
                  // Allow only letters (A-Z, a-z) and numbers
                  const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                  setTargetSection(value);
                  setError(null);
                }}
                placeholder="e.g., A, B, C, 1, 2"
                maxLength={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isPromoting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter section if changing section within the same class (e.g., A, B, C, 1, 2)
              </p>
            </div>

            {isPromoting && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">Promoting students...</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsPromotionModalOpen(false);
                setSelectedTargetClass('');
                setTargetClassName('');
                setTargetSection('');
                setError(null);
              }}
              disabled={isPromoting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleBulkPromote}
              disabled={isPromoting || !targetClassName || targetClassName.trim() === ''}
            >
              {isPromoting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Promoting...
                </>
              ) : (
                'Promote'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
