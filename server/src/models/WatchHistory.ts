import { query } from '../db';

export interface WatchHistoryRow {
  id: number;
  user_id: number;
  drama_id: number;
  episode_id: number;
  progress: number;
  duration: number;
  created_at: Date;
  updated_at: Date;
}

export interface WatchHistoryWithDetail extends WatchHistoryRow {
  drama_title: string;
  drama_cover: string;
  episode_title: string;
  episode_number: number;
}

export async function addOrUpdateHistory(data: {
  user_id: number;
  drama_id: number;
  episode_id: number;
  progress: number;
  duration: number;
}): Promise<void> {
  await query(
    `INSERT INTO watch_history (user_id, drama_id, episode_id, progress, duration)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE progress = ?, duration = ?, updated_at = NOW()`,
    [data.user_id, data.drama_id, data.episode_id, data.progress, data.duration,
     data.progress, data.duration]
  );
}

export async function getUserHistory(userId: number, limit = 20): Promise<WatchHistoryWithDetail[]> {
  return query<WatchHistoryWithDetail[]>(
    `SELECT wh.*, d.title AS drama_title, d.cover_image AS drama_cover,
            e.title AS episode_title, e.episode_number
     FROM watch_history wh
     JOIN dramas d ON d.id = wh.drama_id
     JOIN episodes e ON e.id = wh.episode_id
     WHERE wh.user_id = ?
     ORDER BY wh.updated_at DESC
     LIMIT ?`,
    [userId, limit]
  );
}

export async function getDramaProgress(userId: number, dramaId: number): Promise<WatchHistoryRow | null> {
  const rows = await query<WatchHistoryRow[]>(
    `SELECT * FROM watch_history WHERE user_id = ? AND drama_id = ?
     ORDER BY updated_at DESC LIMIT 1`,
    [userId, dramaId]
  );
  return rows[0] || null;
}

export async function clearUserHistory(userId: number): Promise<void> {
  await query('DELETE FROM watch_history WHERE user_id = ?', [userId]);
}
