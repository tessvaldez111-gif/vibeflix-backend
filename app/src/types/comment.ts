// ===== Comment Types =====

export interface Comment {
  id: number;
  drama_id: number;
  episode_id: number | null;
  user_id: number;
  username: string;
  nickname: string;
  avatar?: string;
  content: string;
  like_count: number;
  is_liked: boolean;
  created_at: string;
}

export interface Danmaku {
  id: number;
  drama_id: number;
  episode_id: number;
  user_id: number;
  content: string;
  time: number; // seconds - when to show the danmaku
  color: string;
  position: number; // 0=top, 1=center, 2=bottom
  created_at: string;
}

export interface AdRewardRecord {
  id: number;
  user_id: number;
  drama_id: number;
  episode_id: number;
  reward_points: number;
  created_at: string;
}
