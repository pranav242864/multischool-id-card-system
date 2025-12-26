/**
 * API utility functions
 * All requests go through apiClient - no direct fetch usage
 */
import { apiClient, apiClientMethods } from './apiClient';

// Generic API request function (deprecated - use apiClient directly)
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { method = 'GET', headers, body, ...restOptions } = options;
  
  return apiClient<T>(endpoint, {
    method: method as any,
    headers: headers as any,
    body,
    ...restOptions,
  });
}

// Template API functions
export const templateAPI = {
  // Get templates by type
  getTemplates: async (type?: string, schoolId?: string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (schoolId) params.append('schoolId', schoolId);
    
    const queryString = params.toString();
    return apiClientMethods.get<{ success: boolean; data: any[]; count: number }>(
      `/api/v1/templates${queryString ? `?${queryString}` : ''}`
    );
  },

  // Get template by ID
  getTemplateById: async (templateId: string) => {
    return apiClientMethods.get<{ success: boolean; data: any }>(
      `/api/v1/templates/${templateId}`
    );
  },

  // Get active template by type
  getActiveTemplate: async (type: string, schoolId?: string) => {
    const params = new URLSearchParams();
    if (schoolId) params.append('schoolId', schoolId);
    
    const queryString = params.toString();
    return apiClientMethods.get<{ success: boolean; data: any }>(
      `/api/v1/templates/active/${type}${queryString ? `?${queryString}` : ''}`
    );
  },

  // Download Excel template by type
  downloadExcelTemplate: async (type: string, schoolId?: string): Promise<Blob> => {
    const params = new URLSearchParams();
    if (schoolId) params.append('schoolId', schoolId);
    
    const queryString = params.toString();
    return apiClientMethods.get<Blob>(
      `/api/v1/templates/download-excel/${type}${queryString ? `?${queryString}` : ''}`
    );
  },

  // Download Excel template by template ID
  downloadExcelTemplateById: async (templateId: string): Promise<Blob> => {
    return apiClientMethods.get<Blob>(`/api/v1/templates/${templateId}/download-excel`);
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

// Auth API functions
export const authAPI = {
  // Login user
  login: async (email: string, password: string): Promise<{ success: boolean; token: string; user: any }> => {
    return apiClientMethods.post<{ success: boolean; token: string; user: any }>(
      '/api/v1/auth/login',
      { email, password },
      { skipAuth: true }
    );
  },
};

// Bulk import API functions
export const bulkImportAPI = {
  // Import data from Excel file
  importExcel: async (file: File, entityType: string): Promise<{ success: boolean; message: string; results: any }> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClientMethods.post<{ success: boolean; message: string; results: any }>(
      `/api/v1/bulk-import/${entityType}`,
      formData
    );
  },
};

