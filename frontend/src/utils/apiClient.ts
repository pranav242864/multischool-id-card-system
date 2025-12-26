/**
 * Centralized API Client
 * ALL HTTP requests MUST go through this module.
 * No direct fetch/axios usage is allowed elsewhere.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL environment variable is required');
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken') || null;
};

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  skipAuth?: boolean;
}

/**
 * Centralized API request function
 * All HTTP requests must go through this function
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, skipAuth = false, headers = {}, ...fetchOptions } = options;

  // Build headers
  const requestHeaders: HeadersInit = {
    ...headers,
  };

  // Add Content-Type for JSON bodies (unless already set or FormData)
  if (body && !(body instanceof FormData)) {
    if (!requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }
  }

  // Add auth token unless skipped
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // Prepare request body and final headers
  let requestBody: BodyInit | undefined;
  let finalHeaders = requestHeaders;
  
  if (body instanceof FormData) {
    requestBody = body;
    // Remove Content-Type header for FormData (browser will set it with boundary)
    const headersCopy = { ...requestHeaders } as Record<string, string>;
    delete headersCopy['Content-Type'];
    finalHeaders = headersCopy as HeadersInit;
  } else if (body) {
    requestBody = JSON.stringify(body);
  }

  // Make request
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers: finalHeaders,
    body: requestBody,
  });

  // Handle errors
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    const error = contentType?.includes('application/json')
      ? await response.json().catch(() => ({ message: 'An error occurred' }))
      : { message: 'An error occurred' };
    
    const errorMessage = error.message || `HTTP error! status: ${response.status}`;
    const apiError = new Error(errorMessage);
    (apiError as any).status = response.status;
    throw apiError;
  }

  // Handle file downloads (blob responses)
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/vnd.openxmlformats')) {
    return response.blob() as unknown as T;
  }

  // Parse JSON response
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  // If no content type matches, try to parse as JSON anyway
  try {
    return await response.json();
  } catch {
    throw new Error(`Unexpected response content type: ${contentType || 'unknown'}`);
  }
}

/**
 * Convenience methods for common HTTP methods
 */
export const apiClientMethods = {
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'POST', body }),

  patch: <T>(endpoint: string, body?: any, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};

