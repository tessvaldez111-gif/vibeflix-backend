import { query } from '../db';

export interface FavoriteRow {
  id: number;
  user_id: number;
  drama_id: number;
  type: 'favorite' | 'like';
  created_at: Date;
}

export async function addFavorite(userId: number, dramaId: number, type: 'favorite' | 'like' = 'favorite'): Promise<void> {
  await query(
    `INSERT INTO favorites (user_id, drama_id, type) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE type = ?`,
    [userId, dramaId, type, type]
  );
}

export async function removeFavorite(userId: number, dramaId: number, type?: 'favorite' | 'like'): Promise<void> {
  if (type) {
    await query('DELETE FROM favorites WHERE user_id = ? AND drama_id = ? AND type = ?', [userId, dramaId, type]);
  } else {
    await query('DELETE FROM favorites WHERE user_id = ? AND drama_id = ?', [userId, dramaId]);
  }
}

export async function isFavorited(userId: number, dramaId: number, type: 'favorite' | 'like' = 'favorite'): Promise<boolean> {
  const rows = await query<{ id: number }[]>(
    'SELECT id FROM favorites WHERE user_id = ? AND drama_id = ? AND type = ?',
    [userId, dramaId, type]
  );
  return rows.length > 0;
}

export async function getUserFavorites(userId: number, type: 'favorite' | 'like' = 'favorite'): Promise<any[]> {
  return query<any[]>(
    `SELECT d.* FROM favorites f
     JOIN dramas d ON d.id = f.drama_id
     WHERE f.user_id = ? AND f.type = ?
     ORDER BY f.created_at DESC`,
    [userId, type]
  );
}

export async function getUserFavoriteIds(userId: number, type: 'favorite' | 'like' = 'favorite'): Promise<number[]> {
  const rows = await query<{ drama_id: number }[]>(
    'SELECT drama_id FROM favorites WHERE user_id = ? AND type = ?',
    [userId, type]
  );
  return rows.map(r => r.drama_id);
}
