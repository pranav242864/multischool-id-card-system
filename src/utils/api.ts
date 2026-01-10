const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken') || null;
};

// Get user role from localStorage (stored after login)
export const getUserRole = (): string | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.role || null;
    } catch {
      return null;
    }
  }
  return null;
};

// Build query string with role-aware schoolId handling
const buildQueryString = (params: Record<string, any> = {}): string => {
  const queryParams = new URLSearchParams();
  const role = getUserRole();
  
  // Role-aware schoolId handling
  if (params.schoolId) {
    // SUPERADMIN must provide schoolId as query param
    if (role === 'SUPERADMIN' || role === 'superadmin') {
      queryParams.append('schoolId', params.schoolId);
    }
    // Non-SUPERADMIN: schoolId comes from JWT token, don't append manually
    // (backend will extract from req.user.schoolId)
  }
  
  // Add other params (excluding schoolId for non-SUPERADMIN)
  Object.keys(params).forEach(key => {
    if (key === 'schoolId') {
      // Already handled above
      return;
    }
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      queryParams.append(key, String(params[key]));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

// Standardized API error format
interface APIError {
  success: false;
  message: string;
  status?: number;
}

// Generic API request function - single gateway for all backend communication
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  params?: Record<string, any>
): Promise<T> {
  const token = getAuthToken();
  
  // Build full URL with query params
  const queryString = params ? buildQueryString(params) : '';
  const url = `${API_BASE_URL}${endpoint}${queryString}`;
  
  // Prepare headers
  const headers: HeadersInit = {
    ...options.headers,
  };
  
  // Add Content-Type only if not FormData (for file uploads)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Always attach Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Global auth handling: 401 Unauthorized (e.g., expired/invalid token)
    if (response.status === 401) {
      // Attempt to extract a meaningful error message from the backend
      let message = 'Unauthorized. Please login again.';
      try {
        const rawText = await response.text();
        if (rawText) {
          try {
            const parsed = JSON.parse(rawText);
            if (parsed && typeof parsed.message === 'string') {
              message = parsed.message;
            } else {
              message = rawText;
            }
          } catch {
            // Not JSON, use raw text as message
            message = rawText;
          }
        }
      } catch {
        // If parsing fails, fall back to default message
      }

      // Clear auth state
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Prevent infinite redirect loops by avoiding redirect when already on /login
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }

      const apiError: APIError = {
        success: false,
        message,
        status: response.status,
      };
      throw apiError;
    }
    
    // Handle non-JSON responses (blobs, etc.)
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/vnd.openxmlformats') || 
        contentType?.includes('application/pdf') ||
        contentType?.includes('application/zip')) {
      if (!response.ok) {
        // Try to parse error from response
        const errorText = await response.text();
        let errorMessage = 'An error occurred';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || `HTTP error! status: ${response.status}`;
        }
        const apiError: APIError = {
          success: false,
          message: errorMessage,
          status: response.status,
        };
        throw apiError;
      }
      return response.blob() as unknown as T;
    }
    
    // Parse JSON response
    const data = await response.json();
    
    // Backend returns { success: true/false, message, data }
    if (!response.ok || (data.success === false)) {
      const apiError: APIError = {
        success: false,
        message: data.message || `HTTP error! status: ${response.status}`,
        status: response.status,
      };
      throw apiError;
    }
    
    return data as T;
  } catch (error) {
    // Network errors or other fetch failures
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const apiError: APIError = {
        success: false,
        message: 'Network error. Please check your connection and try again.',
        status: 0,
      };
      throw apiError;
    }
    
    // Re-throw API errors as-is
    if (error && typeof error === 'object' && 'success' in error && 'message' in error) {
      throw error;
    }
    
    // Wrap unknown errors
    const apiError: APIError = {
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 0,
    };
    throw apiError;
  }
}

// ============================================================================
// AUTH API
// ============================================================================

export const authAPI = {
  // Login (public endpoint - no auth token required)
  login: async (email: string, password: string): Promise<{
    success: boolean;
    token: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      schoolId: string | null;
      schoolName: string | null;
      status: string;
    };
  }> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      const error: APIError = {
        success: false,
        message: data.message || 'Invalid credentials. Please try again.',
        status: response.status,
      };
      throw error;
    }
    
    // Store token and user info
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    
    return data;
  },
  
  // Google OAuth login (public endpoint)
  googleLogin: async (idToken: string, email: string, name: string): Promise<{
    success: boolean;
    token: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      schoolId: string | null;
      schoolName: string | null;
      status: string;
    };
  }> => {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken, email, name }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      const error: APIError = {
        success: false,
        message: data.message || 'Google sign-in failed. Please try again.',
        status: response.status,
      };
      throw error;
    }
    
    // Store token and user info
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    
    return data;
  },
  
  // Logout (clears local storage)
  logout: (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
};

// ============================================================================
// TEMPLATE API
// ============================================================================

export const templateAPI = {
  // Get templates by type
  getTemplates: async (type?: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any[]; count: number }>(
      '/templates',
      { method: 'GET' },
      { type, schoolId }
    );
  },

  // Get template by ID
  getTemplateById: async (templateId: string, schoolId?: string) => {
    // For Superadmin, schoolId is not required - controller validates from template itself
    return apiRequest<{ success: boolean; data: any }>(
      `/templates/${templateId}`,
      { method: 'GET' },
      schoolId ? { schoolId } : undefined
    );
  },

  // Get active template by type
  getActiveTemplate: async (type: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any }>(
      `/templates/active/${type}`,
      { method: 'GET' },
      { schoolId }
    );
  },

  // Create template
  createTemplate: async (templateData: {
    name: string;
    type: string;
    layoutConfig: any;
    sessionId?: string;
    classId?: string;
    isActive?: boolean;
    schoolId?: string;
  }) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      '/templates',
      {
        method: 'POST',
        body: JSON.stringify(templateData),
      },
      { schoolId: templateData.schoolId }
    );
  },

  // Update template
  updateTemplate: async (templateId: string, templateData: {
    name?: string;
    layoutConfig?: any;
    dataTags?: string[];
    sessionId?: string;
    classId?: string;
    isActive?: boolean;
    schoolId?: string;
  }) => {
    // For Superadmin, schoolId is not required - controller validates from template itself
    // Only pass schoolId as query param if provided (for School Admin)
    return apiRequest<{ success: boolean; data: any; message: string }>(
      `/templates/${templateId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(templateData),
      },
      templateData.schoolId ? { schoolId: templateData.schoolId } : undefined
    );
  },

  // Delete template
  deleteTemplate: async (templateId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/templates/${templateId}`,
      { method: 'DELETE' },
      { schoolId }
    );
  },

  // Download Excel template by type
  downloadExcelTemplate: async (type: string, schoolId?: string): Promise<Blob> => {
    return apiRequest<Blob>(
      `/templates/download-excel/${type}`,
      { method: 'GET' },
      { schoolId }
    );
  },

  // Download Excel template by template ID
  downloadExcelTemplateById: async (templateId: string): Promise<Blob> => {
    return apiRequest<Blob>(
      `/templates/${templateId}/download-excel`,
      { method: 'GET' }
    );
  },
};

// ============================================================================
// BULK IMPORT API
// ============================================================================

export const bulkImportAPI = {
  // Import data from Excel file
  importExcel: async (
    file: File,
    entityType: string,
    schoolId?: string
  ): Promise<{ success: boolean; message: string; results: any }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest<{ success: boolean; message: string; results: any }>(
      `/bulk-import/${entityType}`,
      {
        method: 'POST',
        body: formData,
      },
      { schoolId }
    );
  },
};

// ============================================================================
// BULK IMAGE UPLOAD API
// ============================================================================

export const bulkImageUploadAPI = {
  // Upload images in bulk
  uploadImages: async (
    files: File[],
    entityType: 'students' | 'teachers',
    schoolId?: string
  ): Promise<{ success: boolean; message: string; results: any }> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    return apiRequest<{ success: boolean; message: string; results: any }>(
      `/bulk-upload/images/${entityType}`,
      {
        method: 'POST',
        body: formData,
      },
      { schoolId }
    );
  },
};

// ============================================================================
// STUDENT API
// ============================================================================

export const studentAPI = {
  // Get students
  getStudents: async (params?: {
    classId?: string;
    sessionId?: string;
    page?: number;
    limit?: number;
    schoolId?: string;
  }) => {
    return apiRequest<{ success: boolean; data: any[]; pagination?: any }>(
      '/students/students',
      { method: 'GET' },
      params
    );
  },

  // Get student by ID
  getStudentById: async (studentId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any }>(
      `/students/students/${studentId}`,
      { method: 'GET' },
      { schoolId }
    );
  },

  // Create student
  createStudent: async (studentData: {
    admissionNo: string;
    name: string;
    dob: string;
    fatherName: string;
    motherName: string;
    mobile: string;
    address: string;
    classId: string;
    aadhaar?: string;
    photoUrl?: string;
    schoolId?: string;
  }) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      '/students/students',
      {
        method: 'POST',
        body: JSON.stringify({
          admissionNo: studentData.admissionNo,
          name: studentData.name,
          dob: studentData.dob,
          fatherName: studentData.fatherName,
          motherName: studentData.motherName,
          mobile: studentData.mobile,
          address: studentData.address,
          classId: studentData.classId,
          aadhaar: studentData.aadhaar,
          photoUrl: studentData.photoUrl,
        }),
      },
      { schoolId: studentData.schoolId }
    );
  },

  // Update student
  updateStudent: async (
    studentId: string,
    studentData: {
      name?: string;
      dob?: string;
      fatherName?: string;
      motherName?: string;
      mobile?: string;
      address?: string;
      classId?: string;
      aadhaar?: string;
      photoUrl?: string;
      schoolId?: string;
    }
  ) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      `/students/students/${studentId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: studentData.name,
          dob: studentData.dob,
          fatherName: studentData.fatherName,
          motherName: studentData.motherName,
          mobile: studentData.mobile,
          address: studentData.address,
          classId: studentData.classId,
          aadhaar: studentData.aadhaar,
          photoUrl: studentData.photoUrl,
        }),
      },
      { schoolId: studentData.schoolId }
    );
  },

  // Delete student
  deleteStudent: async (studentId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/students/students/${studentId}`,
      { method: 'DELETE' },
      { schoolId }
    );
  },

  // Bulk delete students
  bulkDeleteStudents: async (studentIds: string[], schoolId?: string) => {
    return apiRequest<{ success: boolean; message: string; results: any }>(
      '/students/bulk-delete',
      {
        method: 'POST',
        body: JSON.stringify({ ids: studentIds }),
      },
      { schoolId }
    );
  },
};

// ============================================================================
// TEACHER API
// ============================================================================

export const teacherAPI = {
  // Get teachers
  getTeachers: async (params?: {
    classId?: string;
    page?: number;
    limit?: number;
    schoolId?: string;
  }) => {
    return apiRequest<{ success: boolean; data: any[]; pagination?: any }>(
      '/teachers',
      { method: 'GET' },
      params
    );
  },

  // Get teacher by ID
  getTeacherById: async (teacherId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any }>(
      `/teachers/${teacherId}`,
      { method: 'GET' },
      { schoolId }
    );
  },

  // Create teacher
  createTeacher: async (teacherData: {
    name: string;
    email: string;
    mobile: string;
    classId?: string;
    photoUrl?: string;
    userId: string;
    schoolId?: string;
  }) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      '/teachers',
      {
        method: 'POST',
        body: JSON.stringify({
          name: teacherData.name,
          email: teacherData.email,
          mobile: teacherData.mobile,
          classId: teacherData.classId,
          photoUrl: teacherData.photoUrl,
          userId: teacherData.userId,
        }),
      },
      { schoolId: teacherData.schoolId }
    );
  },

  // Update teacher
  updateTeacher: async (
    teacherId: string,
    teacherData: {
      name?: string;
      mobile?: string;
      classId?: string;
      photoUrl?: string;
      schoolId?: string;
    }
  ) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      `/teachers/${teacherId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: teacherData.name,
          mobile: teacherData.mobile,
          classId: teacherData.classId,
          photoUrl: teacherData.photoUrl,
        }),
      },
      { schoolId: teacherData.schoolId }
    );
  },

  // Delete teacher
  deleteTeacher: async (teacherId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; message: string }>(
      `/teachers/${teacherId}`,
      { method: 'DELETE' },
      { schoolId }
    );
  },

  // Bulk delete teachers
  bulkDeleteTeachers: async (teacherIds: string[], schoolId?: string) => {
    return apiRequest<{ success: boolean; message: string; results: any }>(
      '/teachers/bulk-delete',
      {
        method: 'POST',
        body: JSON.stringify({ ids: teacherIds }),
      },
      { schoolId }
    );
  },
};

// ============================================================================
// SCHOOL API
// ============================================================================

export const schoolAPI = {
  // Get schools
  getSchools: async (schoolId?: string) => {
    // For SUPERADMIN: if schoolId is provided, pass as query param
    // If not provided, backend should return all schools (may require backend fix)
    return apiRequest<{ success: boolean; data: any[]; pagination?: any }>(
      '/schools',
      { method: 'GET' },
      schoolId ? { schoolId } : undefined
    );
  },

  // Get school by ID
  getSchoolById: async (schoolId: string) => {
    return apiRequest<{ success: boolean; data: any }>(
      `/schools/${schoolId}`,
      { method: 'GET' },
      { schoolId }
    );
  },

  // Create school
  createSchool: async (schoolData: {
    name: string;
    address: string;
    contactEmail: string;
  }) => {
    // Note: schoolScoping middleware may require schoolId query param for SUPERADMIN
    // However, when creating a new school, we don't have a schoolId yet
    // Backend should handle this case - if it fails, error will be shown to user
    return apiRequest<{ success: boolean; data: any; message: string }>(
      '/schools',
      {
        method: 'POST',
        body: JSON.stringify({
          name: schoolData.name,
          address: schoolData.address,
          contactEmail: schoolData.contactEmail,
        }),
      }
      // Intentionally NOT passing schoolId - creating new school
    );
  },

  // Delete school
  deleteSchool: async (schoolId: string) => {
    // For DELETE, schoolId is in URL params, but schoolScoping may require query param
    // Pass schoolId as query param for SUPERADMIN
    return apiRequest<{ success: boolean; message: string }>(
      `/schools/${schoolId}`,
      { method: 'DELETE' },
      { schoolId }
    );
  },
};

// ============================================================================
// ADMIN API
// ============================================================================

export const adminAPI = {
  // Get school admins
  getSchoolAdmins: async (schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any[]; count?: number }>(
      '/users',
      { method: 'GET' },
      schoolId ? { schoolId, role: 'SCHOOLADMIN' } : { role: 'SCHOOLADMIN' }
    );
  },

  // Create school admin
  createSchoolAdmin: async (adminData: {
    name: string;
    email: string;
    password: string;
    schoolId: string;
    username?: string;
  }) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      '/users/admin',
      {
        method: 'POST',
        body: JSON.stringify({
          name: adminData.name,
          email: adminData.email,
          password: adminData.password,
          schoolId: adminData.schoolId,
          username: adminData.username,
        }),
      }
    );
  },
};

// ============================================================================
// SESSION API
// ============================================================================

export const sessionAPI = {
  // Get sessions
  getSessions: async (schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any[]; pagination?: any }>(
      '/sessions/sessions',
      { method: 'GET' },
      { schoolId }
    );
  },

  // Get session by ID
  getSessionById: async (sessionId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any }>(
      `/sessions/sessions/${sessionId}`,
      { method: 'GET' },
      { schoolId }
    );
  },

  // Create session
  createSession: async (sessionData: {
    sessionName: string;
    startDate: string;
    endDate: string;
    schoolId?: string;
  }) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      '/sessions/sessions',
      {
        method: 'POST',
        body: JSON.stringify({
          sessionName: sessionData.sessionName,
          startDate: sessionData.startDate,
          endDate: sessionData.endDate,
        }),
      },
      { schoolId: sessionData.schoolId }
    );
  },

  // Activate session
  activateSession: async (sessionId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      `/sessions/sessions/${sessionId}/activate`,
      { method: 'PATCH' },
      { schoolId }
    );
  },

  // Deactivate session
  deactivateSession: async (sessionId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      `/sessions/sessions/${sessionId}/deactivate`,
      { method: 'PATCH' },
      { schoolId }
    );
  },
};

// ============================================================================
// CLASS API
// ============================================================================

export const classAPI = {
  // Get classes
  getClasses: async (params?: {
    sessionId?: string;
    schoolId?: string;
  }) => {
    return apiRequest<{ success: boolean; data: any[] }>(
      '/classes',
      { method: 'GET' },
      params
    );
  },

  // Get class by ID
  getClassById: async (classId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any }>(
      `/classes/${classId}`,
      { method: 'GET' },
      { schoolId }
    );
  },

  // Create class
  createClass: async (classData: {
    className: string;
    sessionId?: string; // Optional - backend uses active session automatically
    schoolId?: string;
  }) => {
    // Backend only needs className - sessionId is auto-set from active session
    return apiRequest<{ success: boolean; data: any; message: string }>(
      '/classes',
      {
        method: 'POST',
        body: JSON.stringify({
          className: classData.className,
        }),
      },
      { schoolId: classData.schoolId }
    );
  },

  // Freeze class
  freezeClass: async (classId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      `/classes/${classId}/freeze`,
      { method: 'PATCH' },
      { schoolId }
    );
  },

  // Unfreeze class
  unfreezeClass: async (classId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      `/classes/${classId}/unfreeze`,
      { method: 'PATCH' },
      { schoolId }
    );
  },
};

// ============================================================================
// PDF API
// ============================================================================

export const pdfAPI = {
  // Generate student PDF
  generateStudentPDF: async (studentId: string, schoolId?: string): Promise<Blob> => {
    return apiRequest<Blob>(
      `/pdf/students/${studentId}`,
      { method: 'GET' },
      { schoolId }
    );
  },

  // Generate bulk student PDFs
  generateBulkStudentPDF: async (
    studentIds?: string[],
    schoolId?: string
  ): Promise<Blob> => {
    return apiRequest<Blob>(
      '/pdf/students/bulk',
      {
        method: 'POST',
        body: JSON.stringify({ studentIds }),
      },
      { schoolId }
    );
  },
};

// ============================================================================
// TEACHER ADMIN API (SUPERADMIN only)
// ============================================================================

export const teacherAdminAPI = {
  // Create teacher user (SUPERADMIN only)
  createTeacherUser: async (teacherData: {
    name: string;
    email: string;
    password: string;
    mobile: string;
    schoolId: string;
    username?: string;
  }) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      '/users/teacher-admin',
      {
        method: 'POST',
        body: JSON.stringify({
          name: teacherData.name,
          email: teacherData.email,
          password: teacherData.password,
          mobile: teacherData.mobile,
          schoolId: teacherData.schoolId,
          username: teacherData.username,
        }),
      }
    );
  },
};

// ============================================================================
// PREVIEW API
// ============================================================================

export const previewAPI = {
  // Preview student card
  previewStudentCard: async (studentId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; html: string }>(
      `/preview/students/${studentId}`,
      { method: 'GET' },
      { schoolId }
    );
  },
};

// ============================================================================
// NOTICE API
// ============================================================================

export const noticeAPI = {
  // Get notices
  getNotices: async (params?: {
    includeArchived?: boolean;
    schoolId?: string;
  }) => {
    return apiRequest<{ success: boolean; count: number; data: any[] }>(
      '/notices',
      { method: 'GET' },
      params
    );
  },

  // Get notice by ID
  getNoticeById: async (noticeId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any }>(
      `/notices/${noticeId}`,
      { method: 'GET' },
      { schoolId }
    );
  },

  // Create notice
  createNotice: async (
    noticeData: {
      title: string;
      description: string;
      visibleTo: string[];
      sessionId?: string;
      attachments?: string[];
      schoolId?: string;
    },
    attachmentFiles?: File[]
  ) => {
    // If files are provided, use FormData
    if (attachmentFiles && attachmentFiles.length > 0) {
      const formData = new FormData();
      formData.append('title', noticeData.title);
      formData.append('description', noticeData.description);
      formData.append('visibleTo', JSON.stringify(noticeData.visibleTo));
      if (noticeData.sessionId) {
        formData.append('sessionId', noticeData.sessionId);
      }
      attachmentFiles.forEach(file => {
        formData.append('attachments', file);
      });
      
      return apiRequest<{ success: boolean; data: any; message: string }>(
        '/notices',
        {
          method: 'POST',
          body: formData,
        },
        { schoolId: noticeData.schoolId }
      );
    }
    
    // Otherwise, use JSON
    return apiRequest<{ success: boolean; data: any; message: string }>(
      '/notices',
      {
        method: 'POST',
        body: JSON.stringify(noticeData),
      },
      { schoolId: noticeData.schoolId }
    );
  },

  // Update notice
  updateNotice: async (
    noticeId: string,
    noticeData: {
      title?: string;
      description?: string;
      visibleTo?: string[];
      sessionId?: string;
      attachments?: string[];
      schoolId?: string;
    }
  ) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      `/notices/${noticeId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(noticeData),
      },
      { schoolId: noticeData.schoolId }
    );
  },

  // Archive notice
  archiveNotice: async (noticeId: string, schoolId?: string) => {
    return apiRequest<{ success: boolean; data: any; message: string }>(
      `/notices/${noticeId}/archive`,
      { method: 'PATCH' },
      { schoolId }
    );
  },
};

// ============================================================================
// LOG API (SUPERADMIN only)
// ============================================================================

export const logAPI = {
  // Get login logs
  getLoginLogs: async (params?: {
    page?: number;
    limit?: number;
    schoolId?: string;
    role?: string;
    success?: boolean;
    startDate?: string;
    endDate?: string;
  }) => {
    return apiRequest<{
      success: boolean;
      data: {
        logs: any[];
        pagination: any;
      };
    }>(
      '/auth/login-logs',
      { method: 'GET' },
      params
    );
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper function to download blob as file
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Export error type for type safety
export type { APIError };
