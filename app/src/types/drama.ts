// ===== Drama Types =====

export interface Drama {
  id: number;
  title: string;
  description: string;
  cover_image: string;
  genre: string;
  status: 'ongoing' | 'completed';
  episode_count: number;
  view_count: number;
  like_count: number;
  collect_count: number;
  created_at: string;
  updated_at: string;
}

export interface Episode {
  id: number;
  drama_id: number;
  episode_number: number;
  title: string;
  video_path: string;
  duration: number;
  is_free: number;
  points_cost: number;
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

export interface WatchHistoryItem {
  id: number;
  drama_id: number;
  episode_id: number;
  progress: number;
  duration: number;
  drama_title: string;
  drama_cover: string;
  episode_title: string;
  episode_number: number;
  updated_at: string;
}

export interface SwipeEpisodeData {
  id: number;
  drama_id: number;
  episode_number: number;
  title: string;
  video_path: string;
  duration: number;
  is_free: number;
  points_cost: number;
  drama_title: string;
  drama_genre: string;
  drama_status: string;
  episode_count: number;
}
