// ===== Interaction Service (Favorites, History) =====
import apiClient from './api';
import type { Drama, WatchHistoryItem } from '../types';

export const interactionService = {
  // ===== Watch History =====
  recordProgress: async (data: {
    drama_id: number;
    episode_id: number;
    progress: number;
    duration: number;
  }): Promise<void> => {
    await apiClient.post('/api/history', data);
  },

  getHistory: async (): Promise<WatchHistoryItem[]> => {
    const res = await apiClient.get<{ data: WatchHistoryItem[] }>('/api/history');
    return res.data.data;
  },

  clearHistory: async (): Promise<void> => {
    await apiClient.delete('/api/history');
  },

  // ===== Favorites =====
  addFavorite: async (dramaId: number, type: 'favorite' | 'like' = 'favorite'): Promise<void> => {
    await apiClient.post('/api/favorite', { drama_id: dramaId, type });
  },

  removeFavorite: async (dramaId: number, type: 'favorite' | 'like' = 'favorite'): Promise<void> => {
    await apiClient.delete('/api/favorite', { data: { drama_id: dramaId, type } });
  },

  checkFavorite: async (dramaId: number, type: 'favorite' | 'like' = 'favorite'): Promise<boolean> => {
    const res = await apiClient.get<{ data: { favorited: boolean } }>(`/api/favorite/check?drama_id=${dramaId}&type=${type}`);
    return res.data.data.favorited;
  },

  getFavorites: async (type: 'favorite' | 'like' = 'favorite'): Promise<Drama[]> => {
    const res = await apiClient.get<{ data: Drama[] }>(`/api/favorites?type=${type}`);
    return res.data.data;
  },

  // ===== Share =====
  share: async (dramaId: number): Promise<void> => {
    await apiClient.post('/api/share', { drama_id: dramaId });
  },

  // ===== Stats =====
  getDramaStats: async (dramaId: number): Promise<{ like_count: number; collect_count: number; comment_count: number; share_count: number; view_count: number }> => {
    type StatsResponse = { like_count: number; collect_count: number; comment_count: number; share_count: number; view_count: number };
    const res = await apiClient.get<{ data: StatsResponse }>(`/api/drama-stats/${dramaId}`);
    return res.data.data;
  },
};
