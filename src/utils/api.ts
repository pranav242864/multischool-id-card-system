const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

// Get auth token from localStorage or wherever it's stored
const getAuthToken = (): string | null => {
  // In a real app, you'd get this from your auth context/state
  // For now, we'll check localStorage
  return localStorage.getItem('authToken') || null;
};

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Handle 404 specifically (template not found)
    if (response.status === 404) {
      const error = await response.json().catch(() => ({ message: 'Not found' }));
      const notFoundError = new Error(error.message || 'Not found');
      (notFoundError as any).status = 404;
      throw notFoundError;
    }
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  // Handle file downloads (blob responses)
  if (response.headers.get('content-type')?.includes('application/vnd.openxmlformats')) {
    return response.blob() as unknown as T;
  }

  return response.json();
}

// Template API functions
export const templateAPI = {
  // Get templates by type
  getTemplates: async (type?: string, schoolId?: string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (schoolId) params.append('schoolId', schoolId);
    
    const queryString = params.toString();
    return apiRequest<{ success: boolean; data: any[]; count: number }>(
      `/templates${queryString ? `?${queryString}` : ''}`
    );
  },

  // Get template by ID
  getTemplateById: async (templateId: string) => {
    return apiRequest<{ success: boolean; data: any }>(
      `/templates/${templateId}`
    );
  },

  // Get active template by type
  getActiveTemplate: async (type: string, schoolId?: string) => {
    const params = new URLSearchParams();
    if (schoolId) params.append('schoolId', schoolId);
    
    const queryString = params.toString();
    return apiRequest<{ success: boolean; data: any }>(
      `/templates/active/${type}${queryString ? `?${queryString}` : ''}`
    );
  },

  // Download Excel template by type
  downloadExcelTemplate: async (type: string, schoolId?: string): Promise<Blob> => {
    const params = new URLSearchParams();
    if (schoolId) params.append('schoolId', schoolId);
    
    const queryString = params.toString();
    return apiRequest<Blob>(
      `/templates/download-excel/${type}${queryString ? `?${queryString}` : ''}`
    );
  },

  // Download Excel template by template ID
  downloadExcelTemplateById: async (templateId: string): Promise<Blob> => {
    return apiRequest<Blob>(`/templates/${templateId}/download-excel`);
  },
};

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

// Bulk import API functions
export const bulkImportAPI = {
  // Import data from Excel file
  importExcel: async (file: File, entityType: string): Promise<{ success: boolean; message: string; results: any }> => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/bulk-import/${entityType}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};

