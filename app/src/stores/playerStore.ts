// ===== Player Store (Zustand) =====
import { create } from 'zustand';
import type { Episode } from '../types';
import { interactionService } from '../services';

interface PlayerState {
  currentEpisode: Episode | null;
  currentDramaId: number | null;
  progress: number; // seconds
  duration: number; // seconds
  isPlaying: boolean;

  // Actions
  setEpisode: (episode: Episode, dramaId: number) => void;
  setProgress: (progress: number, duration: number) => void;
  play: () => void;
  pause: () => void;
  saveProgress: () => Promise<void>;
  clearPlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentEpisode: null,
  currentDramaId: null,
  progress: 0,
  duration: 0,
  isPlaying: false,

  setEpisode: (episode, dramaId) => set({ currentEpisode: episode, currentDramaId: dramaId, progress: 0 }),

  setProgress: (progress, duration) => set({ progress, duration }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  saveProgress: async () => {
    const { currentEpisode, currentDramaId, progress, duration } = get();
    if (!currentEpisode || !currentDramaId) return;
    try {
      await interactionService.recordProgress({
        drama_id: currentDramaId,
        episode_id: currentEpisode.id,
        progress: Math.floor(progress),
        duration: Math.floor(duration),
      });
    } catch {
      // Silent fail — don't interrupt playback
    }
  },

  clearPlayer: () => set({ currentEpisode: null, currentDramaId: null, progress: 0, duration: 0, isPlaying: false }),
}));
