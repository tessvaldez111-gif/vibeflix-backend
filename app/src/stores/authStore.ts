// ===== Auth Store (Zustand) =====
import { create } from 'zustand';
import type { User } from '../types';
import { authService } from '../services';
import { setAuthClearHandler } from '../services/api';
import { getItemAsync, deleteItemAsync } from '../utils/secureStorage';

const TOKEN_KEY = 'auth_token';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, nickname?: string, email?: string, emailCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  // Restore session from SecureStore on app start
  init: async () => {
    try {
      const token = await getItemAsync(TOKEN_KEY);
      if (token) {
        const user = await authService.getMe();
        set({ user, token, isAuthenticated: true });
      }
    } catch {
      await deleteItemAsync(TOKEN_KEY);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (username, password) => {
    const res = await authService.login({ username, password });
    // res is flat: { id, username, nickname, avatar, role, token }
    const { token, ...user } = res;
    set({ user: user as User, token, isAuthenticated: true });
  },

  register: async (username, password, nickname, email, emailCode) => {
    const res = await authService.register({ username, password, nickname, email, emailCode });
    // res is flat: { id, username, nickname, avatar, role, token }
    const { token, ...user } = res;
    set({ user: user as User, token, isAuthenticated: true });
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));

// Register 401 auto-logout callback with API interceptor
setAuthClearHandler(() => {
  useAuthStore.getState().set({ user: null, token: null, isAuthenticated: false });
});
