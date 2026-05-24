import { ApiError, ApiErrorResponse } from "./errors";

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) {
    if (process.env.NODE_ENV === "development") {
      console.warn("NEXT_PUBLIC_BACKEND_URL is missing. Falling back to http://localhost:3001");
      return "http://localhost:3001";
    }
    throw new Error("Configuration Error: NEXT_PUBLIC_BACKEND_URL is undefined.");
  }
  return url.replace(/\/$/, "");
};

export const apiClient = {
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return fetchWithAuth<T>(endpoint, { ...options, method: "GET" });
  },

  async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    const fetchOptions: RequestInit = {
      ...options,
      method: "POST",
    };
    
    if (body) {
      if (isFormData) {
        fetchOptions.body = body;
      } else {
        fetchOptions.body = JSON.stringify(body);
        fetchOptions.headers = {
          ...fetchOptions.headers,
          "Content-Type": "application/json",
        };
      }
    }

    return fetchWithAuth<T>(endpoint, fetchOptions);
  },

  async put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const fetchOptions: RequestInit = {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...options?.headers,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
    };
    return fetchWithAuth<T>(endpoint, fetchOptions);
  },

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return fetchWithAuth<T>(endpoint, { ...options, method: "DELETE" });
  },
};

async function fetchWithAuth<T>(endpoint: string, options: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include", // ALWAYS include credentials
  };

  try {
    const response = await fetch(url, fetchOptions);
    
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      // It's an error from the backend.
      if (data && data.status === "error") {
        throw new ApiError(data as ApiErrorResponse);
      }
      
      // Fallback for non-standard errors
      const detail = data?.detail;
      const detailMessage =
        typeof detail === "string"
          ? detail
          : detail?.message || detail?.error || data?.message;

      throw new ApiError({
        status: "error",
        error: {
          code:
            detail?.code ||
            (response.status === 401
              ? "UNAUTHENTICATED"
              : response.status === 403
                ? "FORBIDDEN"
                : "INTERNAL_ERROR"),
          message: detailMessage || `HTTP error! status: ${response.status}`,
        }
      });
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error.name === "TypeError" && error.message === "Failed to fetch") {
       throw new ApiError({
        status: "error",
        error: {
          code: "BACKEND_UNAVAILABLE",
          message: "NexusHub backend is not reachable.",
        }
      });
    }

    throw new ApiError({
      status: "error",
      error: {
        code: "INTERNAL_ERROR",
        message: error.message || "An unexpected error occurred",
      }
    });
  }
}
