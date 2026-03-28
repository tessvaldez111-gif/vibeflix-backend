const API_BASE = '/api';

// ===== Types (aligned with backend models) =====

export interface Drama {
  id: number;
  title: string;
  description: string;
  cover_image: string;
  category_id: number | null;
  genre: string;
  tags: string | null;
  status: 'ongoing' | 'completed' | 'draft';
  episode_count: number;
  rating: number;
  rating_count: number;
  view_count: number;
  like_count: number;
  collect_count: number;
  release_date: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string;
}

export interface Episode {
  id: number;
  drama_id: number;
  episode_number: number;
  title: string;
  video_path: string;
  duration: number;
  view_count: number;
  is_free: number;
  status: number;
  sort_order: number;
  created_at: string;
}

export interface DramaDetail extends Drama {
  episodes: Episode[];
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface User {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  email: string | null;
  role: string;
  status: number;
  last_login_at: string | null;
  created_at: string;
}

export interface WatchHistoryItem {
  id: number;
  user_id: number;
  drama_id: number;
  episode_id: number;
  progress: number;
  duration: number;
  created_at: string;
  updated_at: string;
  drama_title: string;
  drama_cover: string;
  episode_title: string;
  episode_number: number;
}

export interface PointsInfo {
  id: number;
  user_id: number;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface PointsLogItem {
  id: number;
  user_id: number;
  type: 'earn' | 'spend' | 'refund' | 'admin_add' | 'admin_subtract';
  amount: number;
  balance_after: number;
  source: string;
  source_id: string;
  description: string;
  created_at: string;
}

export interface RechargePackage {
  id: number;
  name: string;
  points: number;
  price: number;
  bonus_points: number;
  is_hot: number;
  sort_order: number;
  status: number;
}

export interface OrderItem {
  id: number;
  order_no: string;
  user_id: number;
  drama_id: number | null;
  episode_id: number | null;
  type: 'recharge' | 'purchase';
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  total_amount: number;
  currency: string;
  points_amount: number;
  points_cost: number;
  created_at: string;
  updated_at: string;
}

export interface PointsConfig {
  registerBonus: number;
  dailySigninPoints: number;
  pointsPerEpisode: number;
  freeEpisodeCount: number;
}

export interface SigninStatus {
  signedToday: boolean;
  streakDays: number;
  totalDays: number;
  monthDays: number[];
}

export interface SigninResult {
  balance: number;
  points: number;
  streakDays: number;
}

export interface ShareCode {
  code: string;
}

export interface ShareStats {
  totalShares: number;
  totalClicks: number;
  inviteCount: number;
  earnedPoints: number;
}

export interface VipPlan {
  id: number;
  name: string;
  duration_days: number;
  price: number;
  original_price: number | null;
  free_episodes: number;
  points_bonus: number;
  features: string | null;
  sort_order: number;
  is_hot: number;
  status: number;
}

export interface VipStatus {
  isVip: boolean;
  vipLevel: number;
  vipExpireAt: string | null;
  daysRemaining: number;
}

export interface VipOrder {
  order_no: string;
  plan_id: number;
  duration_days: number;
  total_amount: number;
  status: string;
  plan_name: string;
  new_expire_at: string;
  created_at: string;
}

// ===== API Error class (fixes #13: expose code field) =====

export class ApiError extends Error {
  code: string | null;
  data: any;
  status: number;

  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.status = status;
    this.code = code || null;
    this.data = data || null;
    this.name = 'ApiError';
  }
}

// ===== Auth helpers =====

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ===== Request helper (fixes #13: expose code and status) =====

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers, ...getAuthHeaders() },
  });

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('网络错误，请稍后重试', res.status);
  }

  if (!data.success) {
    throw new ApiError(data.message || '请求失败', res.status, data.code, data.data);
  }
  return data.data as T;
}

// ===== System Config API (fixes #16) =====

export const settingsApi = {
  getPointsConfig: () => request<PointsConfig>('/settings/points-config'),
};

// ===== Public API =====

export const api = {
  // Dramas
  getDramas: (params?: { keyword?: string; genre?: string; categoryId?: number; page?: number; pageSize?: number; status?: string }) => {
    const search = new URLSearchParams();
    if (params?.keyword) search.set('keyword', params.keyword);
    if (params?.genre) search.set('genre', params.genre);
    if (params?.categoryId) search.set('categoryId', String(params.categoryId));
    if (params?.page) search.set('page', String(params.page));
    if (params?.pageSize) search.set('pageSize', String(params.pageSize));
    if (params?.status) search.set('status', params.status);
    return request<PaginatedResponse<Drama>>(`/dramas?${search.toString()}`);
  },

  getDramaDetail: (id: number) => request<DramaDetail>(`/dramas/${id}`),

  // Check episode access (fixes #1: use backend payment check)
  getEpisodeAccess: (dramaId: number, episodeNumber: number) =>
    request<Episode>(`/dramas/${dramaId}/episodes/${episodeNumber}`),

  getGenres: () => request<string[]>('/genres'),

  // Categories (fixes #9)
  getCategories: () => request<Array<{ id: number; name: string; drama_count?: number }>>('/categories'),

  getVideoUrl: (videoPath: string) => {
    if (!videoPath) return '';
    if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) return videoPath;
    if (videoPath.startsWith('/')) return videoPath;
    return `/${videoPath}`;
  },

  getCoverUrl: (coverPath: string) => {
    if (!coverPath) return '';
    if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) return coverPath;
    if (coverPath.startsWith('/')) return coverPath;
    return `/${coverPath}`;
  },

  // Get video MIME type from path (fixes #19)
  getVideoMimeType: (videoPath: string) => {
    const ext = videoPath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'webm': return 'video/webm';
      case 'mov': return 'video/quicktime';
      case 'mp4':
      default: return 'video/mp4';
    }
  },
};

// ===== User API =====

export const userApi = {
  sendCode: (email: string) => {
    return request<{ devCode?: string }>('/users/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  register: (data: { username: string; password: string; nickname?: string; email: string; emailCode: string; inviteCode?: string }) => {
    return request<User & { token: string }>('/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: (data: { username: string; password: string }) => {
    return request<User & { token: string }>('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMe: () => request<User>('/users/me'),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  saveAuth: (data: User & { token: string }) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
  },

  getStoredUser: (): (User & { token: string }) | null => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  isLoggedIn: (): boolean => {
    return !!localStorage.getItem('token');
  },

  // Validate token (fixes #11)
  validateToken: async (): Promise<User | null> => {
    try {
      const user = await request<User>('/users/me');
      // Update stored user data
      const stored = userApi.getStoredUser();
      if (stored) {
        userApi.saveAuth({ ...user, token: stored.token });
      }
      return user;
    } catch {
      // Token invalid, clear storage
      userApi.logout();
      return null;
    }
  },
};

// ===== Interaction API =====

export const interactionApi = {
  // Watch history
  recordProgress: (data: { drama_id: number; episode_id: number; progress: number; duration: number }) => {
    return request<void>('/history', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getHistory: () => request<WatchHistoryItem[]>('/history'),

  clearHistory: () => {
    return request<void>('/history', { method: 'DELETE' });
  },

  // Favorites
  addFavorite: (dramaId: number, type: 'favorite' | 'like' = 'favorite') => {
    return request<void>('/favorite', {
      method: 'POST',
      body: JSON.stringify({ drama_id: dramaId, type }),
    });
  },

  // Fix #21: prefer query param for DELETE, fallback to body for compatibility
  removeFavorite: (dramaId: number, type: 'favorite' | 'like' = 'favorite') => {
    return request<void>(`/favorite?drama_id=${dramaId}&type=${type}`, {
      method: 'DELETE',
    });
  },

  checkFavorite: (dramaId: number, type: 'favorite' | 'like' = 'favorite') => {
    return request<{ favorited: boolean }>(`/favorite/check?drama_id=${dramaId}&type=${type}`);
  },

  // Fix #8: accept any[] since backend returns DramaRow[] with extra fields
  getFavorites: (type: 'favorite' | 'like' = 'favorite') => {
    return request<any[]>(`/favorites?type=${type}`);
  },
};

// ===== Points & Payment API =====

export const pointsApi = {
  // Get my points
  getMyPoints: () => request<PointsInfo>('/points/my'),

  // Fix #6: accept raw {list, total} and convert to PaginatedResponse
  getMyLog: async (page = 1, pageSize = 10) => {
    const data = await request<{ list: PointsLogItem[]; total: number }>(`/points/my/log?page=${page}&pageSize=${pageSize}`);
    return {
      list: data.list,
      total: data.total,
      page,
      pageSize,
      totalPages: Math.ceil(data.total / pageSize),
    } as PaginatedResponse<PointsLogItem>;
  },

  // Daily signin
  signin: () => request<{ balance: number; points: number }>('/points/signin', { method: 'POST' }),

  // Get recharge packages
  getPackages: () => request<RechargePackage[]>('/recharge/packages'),

  // Create recharge order
  createRechargeOrder: (packageId: number) => request<{ order_no: string; id: number }>('/recharge/create-order', {
    method: 'POST',
    body: JSON.stringify({ packageId }),
  }),

  // Fix #7: accept actual response {orderNo, balance} instead of {order, balance}
  purchaseEpisode: async (dramaId: number, episodeId: number, pointsCost: number) => {
    const data = await request<{ orderNo: string; balance: number }>('/points/purchase', {
      method: 'POST',
      body: JSON.stringify({ dramaId, episodeId, pointsCost }),
    });
    return { order: { orderNo: data.orderNo }, balance: data.balance };
  },

  // Fix #6: handle raw order response
  getMyOrders: async (page = 1, pageSize = 10) => {
    const data = await request<{ list: OrderItem[]; total: number }>(`/orders/my?page=${page}&pageSize=${pageSize}`);
    return {
      list: data.list,
      total: data.total,
      page,
      pageSize,
      totalPages: Math.ceil(data.total / pageSize),
    } as PaginatedResponse<OrderItem>;
  },

  // PayPal
  createPaypalPayment: (orderNo: string) => request<{ orderId: string; approveUrl: string }>('/payment/paypal/create', {
    method: 'POST',
    body: JSON.stringify({ orderNo }),
  }),

  capturePaypalPayment: (paypalOrderId: string) => request<{ orderNo: string }>('/payment/paypal/capture', {
    method: 'POST',
    body: JSON.stringify({ paypalOrderId }),
  }),
};

// ===== Signin API =====

export const signinApi = {
  getStatus: () => request<SigninStatus>('/signin/status'),
  signin: () => request<SigninResult>('/signin', { method: 'POST' }),
  getCalendar: (year: number, month: number) =>
    request<{ days: number[]; streakDays: number }>(`/signin/calendar?year=${year}&month=${month}`),
};

// ===== Share API =====

export const shareApi = {
  getCode: () => request<ShareCode>('/share/code'),
  share: (dramaId?: number, shareType?: string) =>
    request<{ id: number; remaining: number; balance: number }>('/share', {
      method: 'POST',
      body: JSON.stringify({ dramaId: dramaId || null, shareType: shareType || 'drama' }),
    }),
  getStats: () => request<ShareStats>('/share/stats'),
};

// ===== VIP API =====

export const vipApi = {
  getPlans: () => request<VipPlan[]>('/vip/plans'),
  getStatus: () => request<VipStatus>('/vip/status'),
  createOrder: (planId: number) =>
    request<{ order_no: string; id: number }>('/vip/create-order', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
  activate: (orderNo: string, paypalOrderId: string) =>
    request<{ vipLevel: number; vipExpireAt: string }>('/vip/activate', {
      method: 'POST',
      body: JSON.stringify({ orderNo, paypalOrderId }),
    }),
  getOrders: async (page = 1, pageSize = 10) => {
    const data = await request<{ list: VipOrder[]; total: number }>(`/vip/orders?page=${page}&pageSize=${pageSize}`);
    return {
      list: data.list,
      total: data.total,
      page,
      pageSize,
      totalPages: Math.ceil(data.total / pageSize),
    } as PaginatedResponse<VipOrder>;
  },
  createPaypalPayment: (orderNo: string) =>
    request<{ orderId: string; approveUrl: string }>('/payment/paypal/create', {
      method: 'POST',
      body: JSON.stringify({ orderNo }),
    }),
};
