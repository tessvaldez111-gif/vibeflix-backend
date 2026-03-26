// ===== Toast Hook =====
import { useRef, useCallback, useState } from 'react';
import { ToastAndroid, Platform } from 'react-native';

type ToastDuration = 'short' | 'long';

interface ToastState {
  visible: boolean;
  message: string;
  type: 'default' | 'success' | 'error';
}

// Global toast state (single instance)
let globalToastVisible = false;
let globalToastTimer: ReturnType<typeof setTimeout> | null = null;
let globalShowToast: ((msg: string, type: ToastState['type']) => void) | null = null;

export const useToast = () => {
  const show = useCallback((message: string, duration: ToastDuration = 'short') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, duration === 'long' ? ToastAndroid.LONG : ToastAndroid.SHORT);
    } else {
      // iOS: use global callback if a ToastProvider is mounted, fallback to console
      if (globalShowToast) {
        globalShowToast(message, 'default');
      }
    }
  }, []);

  const success = useCallback((message: string) => show(message, 'short'), [show]);
  const error = useCallback((message: string) => show(message, 'long'), [show]);

  return { show, success, error };
};

/**
 * Toast provider hook — call in your app root to enable iOS toast.
 * Returns the toast state and a ref to set in your JSX.
 *
 * Usage in App.tsx:
 *   const { toastState, toastRef } = useToastProvider();
 *   // In render:
 *   <ToastOverlay ref={toastRef} />
 */
export const useToastProvider = () => {
  const [state, setState] = useState<ToastState>({ visible: false, message: '', type: 'default' });

  const showToast = useCallback((message: string, type: ToastState['type'] = 'default') => {
    if (globalToastTimer) clearTimeout(globalToastTimer);
    setState({ visible: true, message, type });
    globalToastVisible = true;
    globalToastTimer = setTimeout(() => {
      setState((prev) => ({ ...prev, visible: false }));
      globalToastVisible = false;
    }, type === 'error' ? 3000 : 2000);
  }, []);

  // Register global callback on mount
  const ref = useRef({ showToast });
  if (typeof globalShowToast === 'undefined' || !globalShowToast) {
    globalShowToast = showToast;
  }

  return { toastState: state, toastRef: ref };
};

/** Get the current global toast show function (for use outside React) */
export const getGlobalToast = () => globalShowToast;
