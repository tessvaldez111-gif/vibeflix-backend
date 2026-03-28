import { query } from '../db';

export interface DramaRow {
  id: number;
  title: string;
  description: string;
  cover_image: string;
  category_id: number | null;
  genre: string;
  tags: string | null;
  status: 'ongoing' | 'completed' | 'draft';
  episode_count: number;
  total_episodes: number;
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

export interface DramaDetail extends DramaRow {
  episodes: EpisodeRow[];
}

export interface EpisodeRow {
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

export interface PaginatedDramas {
  list: DramaRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// === Drama Model ===

export async function findAll(options?: {
  keyword?: string;
  genre?: string;
  categoryId?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<PaginatedDramas> {
  const { keyword, genre, categoryId, sortBy, page = 1, pageSize = 12, status } = options || {};
  const pageNum = Math.max(1, page);
  const size = Math.min(50, Math.max(1, pageSize));
  const offset = (pageNum - 1) * size;

  let sql = `SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON d.category_id = c.id WHERE 1=1`;
  const params: unknown[] = [];

  if (status && status !== 'all') {
    sql += ' AND d.status = ?';
    params.push(status);
  } else {
    sql += ' AND d.status != ?';
    params.push('draft');
  }
  if (keyword) {
    sql += ' AND (d.title LIKE ? OR d.description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (genre) {
    sql += ' AND d.genre = ?';
    params.push(genre);
  }
  if (categoryId) {
    sql += ' AND d.category_id = ?';
    params.push(categoryId);
  }

  // 排序
  const orderMap: Record<string, string> = {
    latest: 'd.created_at DESC',
    popular: 'd.view_count DESC',
    rating: 'd.rating DESC',
  };
  sql += ` ORDER BY ${orderMap[sortBy || 'latest'] || 'd.created_at DESC'}`;

  const countSql = sql.replace(/SELECT\s+d\.\*,\s*c\.name\s+AS\s+category_name/, 'SELECT COUNT(*) as total');
  const totalResult = await query(countSql, params) as any[];
  const total = totalResult[0]?.total || 0;

  sql += ' LIMIT ? OFFSET ?';
  params.push(size, offset);
  const list = await query(sql, params) as DramaRow[];

  return { list, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) };
}

export async function findById(id: number): Promise<DramaDetail | null> {
  const dramas = await query(
    `SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON d.category_id = c.id WHERE d.id = ?`,
    [id]
  ) as DramaRow[];
  if (!dramas.length) return null;

  // 同时增加播放量
  await query('UPDATE dramas SET view_count = view_count + 1 WHERE id = ?', [id]);

  const episodes = await query(
    'SELECT * FROM episodes WHERE drama_id = ? AND status = 1 ORDER BY sort_order ASC, episode_number ASC',
    [id]
  ) as EpisodeRow[];
  return { ...dramas[0], episodes };
}

export async function create(data: {
  title: string;
  description?: string;
  category_id?: number;
  genre?: string;
  tags?: string;
  status?: string;
  cover_image?: string;
  release_date?: string;
  total_episodes?: number;
}): Promise<number> {
  const result = await query(
    `INSERT INTO dramas (title, description, category_id, genre, tags, status, cover_image, release_date, total_episodes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.description || '', data.category_id || null, data.genre || '其他', data.tags || null, data.status || 'ongoing', data.cover_image || null, data.release_date || null, data.total_episodes || 0]
  ) as any;
  return result.insertId;
}

export async function update(id: number, data: {
  title?: string;
  description?: string;
  category_id?: number | null;
  genre?: string;
  tags?: string;
  status?: string;
  cover_image?: string;
  release_date?: string;
  total_episodes?: number;
}): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
  if (data.genre !== undefined) { fields.push('genre = ?'); values.push(data.genre); }
  if (data.tags !== undefined) { fields.push('tags = ?'); values.push(data.tags); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.cover_image !== undefined) { fields.push('cover_image = ?'); values.push(data.cover_image); }
  if (data.release_date !== undefined) { fields.push('release_date = ?'); values.push(data.release_date); }
  if (data.total_episodes !== undefined) { fields.push('total_episodes = ?'); values.push(data.total_episodes); }
  if (fields.length === 0) return;
  values.push(id);
  await query(`UPDATE dramas SET ${fields.join(', ')}, episode_count=(SELECT COUNT(*) FROM episodes WHERE drama_id=?) WHERE id=?`, [...values, id, id]);
}

export async function updateCover(id: number, cover_image: string): Promise<void> {
  await query('UPDATE dramas SET cover_image = ? WHERE id = ?', [cover_image, id]);
}

export async function remove(id: number): Promise<{ drama: DramaRow; episodes: EpisodeRow[] }> {
  const dramas = await query('SELECT * FROM dramas WHERE id = ?', [id]) as DramaRow[];
  const episodes = await query(
    'SELECT * FROM episodes WHERE drama_id = ?',
    [id]
  ) as EpisodeRow[];
  await query('DELETE FROM dramas WHERE id = ?', [id]);
  return { drama: dramas[0], episodes };
}

export async function findRecent(limit = 5): Promise<DramaRow[]> {
  return query(
    `SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON d.category_id = c.id
     WHERE d.status != 'draft' ORDER BY d.created_at DESC LIMIT ?`,
    [limit]
  ) as Promise<DramaRow[]>;
}

export async function findPopular(limit = 8): Promise<DramaRow[]> {
  return query(
    `SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON d.category_id = c.id
     WHERE d.status != 'draft' ORDER BY d.view_count DESC LIMIT ?`,
    [limit]
  ) as Promise<DramaRow[]>;
}

export async function count(): Promise<number> {
  const result = await query('SELECT COUNT(*) as count FROM dramas') as any[];
  return result[0].count;
}

export async function findAllGenres(): Promise<string[]> {
  const rows = await query(
    'SELECT DISTINCT genre FROM dramas WHERE genre IS NOT NULL AND genre != ""'
  ) as any[];
  return rows.map((r) => r.genre);
}

export async function refreshEpisodeCount(dramaId: number): Promise<void> {
  await query(
    'UPDATE dramas SET episode_count = (SELECT COUNT(*) FROM episodes WHERE drama_id = ?) WHERE id = ?',
    [dramaId, dramaId]
  );
}

export async function incrementViewCount(id: number): Promise<void> {
  await query('UPDATE dramas SET view_count = view_count + 1 WHERE id = ?', [id]);
}

export async function incrementLikeCount(id: number): Promise<void> {
  await query('UPDATE dramas SET like_count = like_count + 1 WHERE id = ?', [id]);
}

export async function decrementLikeCount(id: number): Promise<void> {
  await query('UPDATE dramas SET like_count = GREATEST(0, like_count - 1) WHERE id = ?', [id]);
}

export async function incrementCollectCount(id: number): Promise<void> {
  await query('UPDATE dramas SET collect_count = collect_count + 1 WHERE id = ?', [id]);
}

export async function decrementCollectCount(id: number): Promise<void> {
  await query('UPDATE dramas SET collect_count = GREATEST(0, collect_count - 1) WHERE id = ?', [id]);
}

export async function incrementShareCount(id: number): Promise<void> {
  await query('UPDATE dramas SET share_count = share_count + 1 WHERE id = ?', [id]);
}

export async function getCommentCount(dramaId: number): Promise<number> {
  const result = await query('SELECT COUNT(*) as cnt FROM comments WHERE drama_id = ?', [dramaId]) as any[];
  return result[0]?.cnt || 0;
}

export async function getDramaStats(dramaId: number): Promise<{
  like_count: number; collect_count: number; comment_count: number; share_count: number; view_count: number;
}> {
  const rows = await query(
    'SELECT like_count, collect_count, COALESCE(share_count,0) as share_count, view_count FROM dramas WHERE id = ?',
    [dramaId]
  ) as any[];
  if (!rows.length) return { like_count: 0, collect_count: 0, comment_count: 0, share_count: 0, view_count: 0 };
  const d = rows[0];
  const comment_count = await getCommentCount(dramaId);
  return { like_count: d.like_count || 0, collect_count: d.collect_count || 0, comment_count, share_count: d.share_count || 0, view_count: d.view_count || 0 };
}

// === Episode Model ===

export async function findEpisodeById(dramaId: number, episodeNumber: number): Promise<EpisodeRow | null> {
  const episodes = await query(
    'SELECT * FROM episodes WHERE drama_id = ? AND episode_number = ? AND status = 1',
    [dramaId, episodeNumber]
  ) as EpisodeRow[];
  return episodes[0] || null;
}

export async function createEpisode(data: {
  drama_id: number;
  episode_number: number;
  title?: string;
  video_path: string;
  duration?: number;
  is_free?: number;
}): Promise<number> {
  const result = await query(
    `INSERT INTO episodes (drama_id, episode_number, title, video_path, duration, is_free, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       video_path = VALUES(video_path),
       duration = VALUES(duration),
       sort_order = VALUES(sort_order)`,
    [data.drama_id, data.episode_number, data.title || '', data.video_path, data.duration || 0, data.is_free !== undefined ? data.is_free : 1, data.episode_number]
  ) as any;
  await refreshEpisodeCount(data.drama_id);
  return result.insertId || 0;
}

export async function findEpisodeFiles(dramaId: number): Promise<EpisodeRow[]> {
  return query('SELECT video_path FROM episodes WHERE drama_id = ?', [dramaId]) as Promise<EpisodeRow[]>;
}

export async function removeEpisode(episodeId: number, dramaId: number): Promise<EpisodeRow | null> {
  const episodes = await query(
    'SELECT video_path FROM episodes WHERE id = ? AND drama_id = ?',
    [episodeId, dramaId]
  ) as EpisodeRow[];
  if (episodes.length) {
    await query('DELETE FROM episodes WHERE id = ? AND drama_id = ?', [episodeId, dramaId]);
    await refreshEpisodeCount(dramaId);
  }
  return episodes[0] || null;
}

export async function updateEpisode(episodeId: number, dramaId: number, data: {
  title?: string;
  sort_order?: number;
  episode_number?: number;
}): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
  if (data.episode_number !== undefined) { fields.push('episode_number = ?'); values.push(data.episode_number); }
  if (fields.length === 0) return;
  values.push(episodeId, dramaId);
  await query(`UPDATE episodes SET ${fields.join(', ')} WHERE id = ? AND drama_id = ?`, values);
}

export async function episodeCount(): Promise<number> {
  const result = await query('SELECT COUNT(*) as count FROM episodes') as any[];
  return result[0].count;
}
