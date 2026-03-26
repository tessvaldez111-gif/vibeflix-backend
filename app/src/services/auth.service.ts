// ===== Auth Service =====
import apiClient, { saveToken, clearToken } from './api';
import type { AuthResponse, LoginRequest, RegisterRequest, SendCodeRequest, SendCodeResponse, User } from '../types';

export const authService = {
  /** Login with username + password */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<{ data: AuthResponse }>('/api/users/login', data);
    const { token } = res.data.data;
    await saveToken(token);
    return res.data.data;
  },

  /** Register a new user */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<{ data: AuthResponse }>('/api/users/register', data);
    const { token } = res.data.data;
    await saveToken(token);
    return res.data.data;
  },

  /** Send email verification code */
  sendCode: async (data: SendCodeRequest): Promise<SendCodeResponse> => {
    const res = await apiClient.post<{ data: SendCodeResponse }>('/api/users/send-code', data);
    return res.data.data;
  },

  /** Get current user info */
  getMe: async (): Promise<User> => {
    const res = await apiClient.get<{ data: User }>('/api/users/me');
    return res.data.data;
  },

  /** Logout */
  logout: async (): Promise<void> => {
    await clearToken();
  },
};
