// ===== Drama Service =====
import apiClient from './api';
import type { Drama, DramaDetail, PaginatedResponse } from '../types';

interface DramaQueryParams {
  keyword?: string;
  genre?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  sortBy?: 'latest' | 'popular' | 'rating';
}

export const dramaService = {
  /** Get drama list with pagination and filters */
  getDramas: async (params?: DramaQueryParams): Promise<PaginatedResponse<Drama>> => {
    const search = new URLSearchParams();
    if (params?.keyword) search.set('keyword', params.keyword);
    if (params?.genre) search.set('genre', params.genre);
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    if (params?.status) search.set('status', params.status);
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    const res = await apiClient.get<{ data: PaginatedResponse<Drama> }>(`/api/dramas?${search.toString()}`);
    return res.data.data;
  },

  /** Get single drama detail with episodes */
  getDramaDetail: async (id: number): Promise<DramaDetail> => {
    const res = await apiClient.get<{ data: DramaDetail }>(`/api/dramas/${id}`);
    return res.data.data;
  },

  /** Get all genres */
  getGenres: async (): Promise<string[]> => {
    const res = await apiClient.get<{ data: string[] }>('/api/genres');
    return res.data.data;
  },

  /** Get drama list (shortcut for HomeScreen) */
  getRecentDramas: async (limit = 10): Promise<Drama[]> => {
    const res = await apiClient.get<{ data: PaginatedResponse<Drama> }>(`/api/dramas?pageSize=${limit}`);
    return res.data.data.list;
  },

  /** Get popular/hot dramas sorted by view count */
  getPopularDramas: async (limit = 10): Promise<Drama[]> => {
    const res = await apiClient.get<{ data: PaginatedResponse<Drama> }>(`/api/dramas?sortBy=popular&pageSize=${limit}`);
    return res.data.data.list;
  },

  /** Increment view count */
  recordView: async (dramaId: number): Promise<void> => {
    await apiClient.post('/api/dramas/view', { drama_id: dramaId });
  },
};
