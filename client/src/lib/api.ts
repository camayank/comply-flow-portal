/**
 * API Request Utilities
 * Centralized API request handling with consistent error handling
 */

import { withCsrfHeaders } from './csrf';

interface RequestOptions extends RequestInit {
  body?: any;
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Centralized API request function with error handling
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers, ...restOptions } = options;

  const config: RequestInit = {
    ...restOptions,
    headers: withCsrfHeaders({
      'Content-Type': 'application/json',
      ...headers,
    }),
    credentials: 'include', // Include cookies for authentication
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(endpoint, config);

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errorData = await response.json();
        throw new APIError(
          errorData.message || errorData.error || `Request failed with status ${response.status}`,
          response.status,
          errorData.code,
          errorData.details
        );
      } else {
        const errorText = await response.text();
        throw new APIError(
          errorText || `Request failed with status ${response.status}`,
          response.status
        );
      }
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    // Parse JSON response
    if (isJson) {
      return await response.json();
    }

    // Return text for non-JSON responses
    return (await response.text()) as T;
  } catch (error) {
    // Re-throw APIError as-is
    if (error instanceof APIError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new APIError(
        'Network error. Please check your internet connection.',
        0,
        'NETWORK_ERROR'
      );
    }

    // Handle other errors
    throw new APIError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Typed GET request
 */
export function get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * Typed POST request
 */
export function post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'POST', body });
}

/**
 * Typed PUT request
 */
export function put<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'PUT', body });
}

/**
 * Typed PATCH request
 */
export function patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'PATCH', body });
}

/**
 * Typed DELETE request
 */
export function del<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}
