// ===== Axios Instance + JWT Interceptors =====
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { getItemAsync, deleteItemAsync } from '../utils/secureStorage';
import { ApiResponse } from '../types';

// Lazy import to avoid circular dependency
let clearAuthState: (() => void) | null = null;
export const setAuthClearHandler = (handler: () => void) => {
  clearAuthState = handler;
};

// ===== Config =====
// In development: use the IP address of your dev machine
// In production: use your deployed backend URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__
  ? 'http://localhost:3001'
  : 'https://your-domain.com'); // TODO: change to production URL

const TOKEN_KEY = 'auth_token';

// ===== Axios Instance =====
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===== Request Interceptor: Attach JWT =====
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Response Interceptor: Unwrap API Response =====
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response;
    if (data.success === false) {
      return Promise.reject(new Error(data.message || 'Request failed'));
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth state
      deleteItemAsync(TOKEN_KEY);
      clearAuthState?.();
    }
    return Promise.reject(error);
  }
);

// ===== Helpers =====

/** Get stored auth token */
export const getToken = async (): Promise<string | null> => {
  return getItemAsync(TOKEN_KEY);
};

/** Save auth token */
export const saveToken = async (token: string): Promise<void> => {
  const { setItemAsync } = await import('../utils/secureStorage');
  await setItemAsync(TOKEN_KEY, token);
};

/** Clear auth token */
export const clearToken = async (): Promise<void> => {
  await deleteItemAsync(TOKEN_KEY);
};

/** Build media URL (cover images, videos) */
export const getMediaUrl = (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const cleanPath = path.replace(/^\//, ''); // remove leading slash
  return `${BASE_URL}/${cleanPath}`;
};

export default apiClient;
