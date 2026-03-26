// ===== Wallet Store (Zustand) =====
import { create } from 'zustand';
import type { PointsInfo, RechargePackage } from '../types';
import { paymentService } from '../services';

interface WalletState {
  points: PointsInfo | null;
  packages: RechargePackage[];
  todaySignedIn: boolean;
  isLoading: boolean;

  // Actions
  loadPoints: () => Promise<void>;
  loadPackages: () => Promise<void>;
  signin: () => Promise<{ balance: number; points: number }>;
  resetAfterRecharge: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  points: null,
  packages: [],
  todaySignedIn: false,
  isLoading: false,

  loadPoints: async () => {
    try {
      const points = await paymentService.getMyPoints();
      set({ points });
    } catch {
      // Silent fail
    }
  },

  loadPackages: async () => {
    try {
      const packages = await paymentService.getPackages();
      set({ packages });
    } catch {
      // Silent fail
    }
  },

  signin: async () => {
    const result = await paymentService.signin();
    set({ todaySignedIn: true });
    // Reload points after sign-in
    await paymentService.getMyPoints().then((p) => set({ points: p }));
    return result;
  },

  resetAfterRecharge: async () => {
    set({ isLoading: true });
    try {
      const points = await paymentService.getMyPoints();
      set({ points, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
