/**
 * Base API configuration and utilities
 */

// Base URL for API requests - defaults to localhost:3000 in development
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "" // Empty string means same origin in production
    : "http://localhost:3000";

/**
 * Creates a full URL by combining the base URL with the provided endpoint
 */
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint.substring(1)
    : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

/**
 * Generic fetch wrapper with error handling
 */
export const fetchApi = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  try {
    const url = getApiUrl(endpoint);
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    // Parse response JSON
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Try to extract error message from response
      const errorMessage =
        data.error || data.message || `API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Common API request methods
 */
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, data?: any, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: any, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { ...options, method: "DELETE" }),
};
