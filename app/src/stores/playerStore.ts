// ===== Player Store (Zustand) =====
import { create } from 'zustand';
import type { Episode, Danmaku } from '../types';
import { interactionService } from '../services';

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

interface PlayerState {
  currentEpisode: Episode | null;
  currentDramaId: number | null;
  progress: number; // seconds
  duration: number; // seconds
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;

  // Danmaku
  danmakuEnabled: boolean;
  danmakuList: Danmaku[];
  danmakuOpacity: number;

  // Ad reward
  adRewardAvailable: boolean;

  // Actions
  setEpisode: (episode: Episode, dramaId: number) => void;
  setProgress: (progress: number, duration: number) => void;
  play: () => void;
  pause: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  saveProgress: () => Promise<void>;
  clearPlayer: () => void;
  setDanmakuEnabled: (enabled: boolean) => void;
  setDanmakuList: (list: Danmaku[]) => void;
  setDanmakuOpacity: (opacity: number) => void;
  setAdRewardAvailable: (available: boolean) => void;
}

// Load saved speed from MMKV-like storage (simplified via localStorage-like approach)
let savedSpeed: PlaybackSpeed = 1.0;
try {
  const stored = localStorage?.getItem?.('playback_speed');
  if (stored) savedSpeed = parseFloat(stored) as PlaybackSpeed;
} catch (_) {}

let savedDanmakuEnabled = true;
try {
  const stored = localStorage?.getItem?.('danmaku_enabled');
  if (stored !== null) savedDanmakuEnabled = stored === '1';
} catch (_) {}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentEpisode: null,
  currentDramaId: null,
  progress: 0,
  duration: 0,
  isPlaying: false,
  playbackSpeed: savedSpeed,

  danmakuEnabled: savedDanmakuEnabled,
  danmakuList: [],
  danmakuOpacity: 0.8,

  adRewardAvailable: true,

  setEpisode: (episode, dramaId) => set({ currentEpisode: episode, currentDramaId: dramaId, progress: 0 }),

  setProgress: (progress, duration) => set({ progress, duration }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: speed });
    try { localStorage?.setItem?.('playback_speed', String(speed)); } catch (_) {}
  },

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
      // Silent fail
    }
  },

  clearPlayer: () => set({
    currentEpisode: null, currentDramaId: null,
    progress: 0, duration: 0, isPlaying: false,
    danmakuList: [], adRewardAvailable: true,
  }),

  setDanmakuEnabled: (enabled) => {
    set({ danmakuEnabled: enabled });
    try { localStorage?.setItem?.('danmaku_enabled', enabled ? '1' : '0'); } catch (_) {}
  },

  setDanmakuList: (list) => set({ danmakuList: list }),

  setDanmakuOpacity: (opacity) => set({ danmakuOpacity: opacity }),

  setAdRewardAvailable: (available) => set({ adRewardAvailable: available }),
}));
