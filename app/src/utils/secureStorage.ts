// ===== Secure Storage Web Compatibility =====
// expo-secure-store is not supported on web; fallback to localStorage

import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';

const webStorage = {
  getItemAsync: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItemAsync: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  deleteItemAsync: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

// Use expo-secure-store on native, localStorage on web
let secureStore: typeof webStorage;

if (Platform.OS === 'web') {
  secureStore = webStorage;
} else {
  // Dynamic import for native
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SecureStore = require('expo-secure-store');
    secureStore = SecureStore;
  } catch {
    secureStore = webStorage;
  }
}

export const getItemAsync = (key: string) => secureStore.getItemAsync(key);
export const setItemAsync = (key: string, value: string) => secureStore.setItemAsync(key, value);
export const deleteItemAsync = (key: string) => secureStore.deleteItemAsync(key);
