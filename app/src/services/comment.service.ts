// ===== Comment & Danmaku Service =====
import apiClient from './api';
import type { Comment, Danmaku, PaginatedResponse } from '../types';

export const commentService = {
  // ===== Comments =====
  getComments: async (dramaId: number, episodeId?: number, page = 1, pageSize = 20, sort = 'latest'): Promise<PaginatedResponse<Comment>> => {
    const epParam = episodeId ? `&episodeId=${episodeId}` : '';
    const res = await apiClient.get<{ data: PaginatedResponse<Comment> }>(
      `/api/comments?dramaId=${dramaId}${epParam}&page=${page}&pageSize=${pageSize}&sort=${sort}`
    );
    return res.data.data;
  },

  addComment: async (dramaId: number, content: string, episodeId?: number): Promise<Comment> => {
    const res = await apiClient.post<{ data: Comment }>('/api/comments', { dramaId, content, episodeId });
    return res.data.data;
  },

  likeComment: async (commentId: number): Promise<void> => {
    await apiClient.post(`/api/comments/${commentId}/like`);
  },

  unlikeComment: async (commentId: number): Promise<void> => {
    await apiClient.delete(`/api/comments/${commentId}/like`);
  },

  // ===== Danmaku =====
  getDanmaku: async (dramaId: number, episodeId: number): Promise<Danmaku[]> => {
    const res = await apiClient.get<{ data: Danmaku[] }>(`/api/danmaku?dramaId=${dramaId}&episodeId=${episodeId}`);
    return res.data.data;
  },

  sendDanmaku: async (dramaId: number, episodeId: number, content: string, color?: string, position?: number): Promise<Danmaku> => {
    const res = await apiClient.post<{ data: Danmaku }>('/api/danmaku', {
      dramaId, episodeId, content, color: color || '#FFFFFF', position: position ?? 0,
    });
    return res.data.data;
  },
};

// ===== Ad Reward Service =====
export const adRewardService = {
  /** Claim ad reward points for watching an ad on a specific episode */
  claimReward: async (dramaId: number, episodeId: number): Promise<{ points: number; balance: number }> => {
    const res = await apiClient.post<{ data: { points: number; balance: number } }>('/api/ad-reward/claim', { dramaId, episodeId });
    return res.data.data;
  },

  /** Get today's ad reward count */
  getTodayCount: async (): Promise<{ count: number; maxDaily: number }> => {
    const res = await apiClient.get<{ data: { count: number; maxDaily: number }>('/api/ad-reward/today');
    return res.data.data;
  },
};
