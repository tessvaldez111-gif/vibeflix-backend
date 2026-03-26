import { query } from '../db';

export interface CategoryRow {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
  status: number;
  created_at: Date;
  updated_at: Date;
}

export async function findAllCategories(): Promise<CategoryRow[]> {
  return query<CategoryRow[]>(
    'SELECT * FROM categories WHERE status = 1 ORDER BY sort_order ASC'
  );
}

export async function findAllCategoriesWithCount(): Promise<(CategoryRow & { drama_count: number })[]> {
  return query<(CategoryRow & { drama_count: number })[]>(
    `SELECT c.*, COUNT(d.id) AS drama_count
     FROM categories c
     LEFT JOIN dramas d ON d.category_id = c.id AND d.status != 'draft'
     WHERE c.status = 1
     GROUP BY c.id
     ORDER BY c.sort_order ASC`
  );
}

export async function findCategoryById(id: number): Promise<CategoryRow | null> {
  const rows = await query<CategoryRow[]>('SELECT * FROM categories WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function createCategory(data: { name: string; icon?: string; sort_order?: number }): Promise<number> {
  const result = await query<any>(
    'INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)',
    [data.name, data.icon || null, data.sort_order || 0]
  );
  return result.insertId;
}

export async function updateCategory(id: number, data: Partial<{ name: string; icon: string; sort_order: number; status: number }>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (fields.length === 0) return;
  values.push(id);
  await query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteCategory(id: number): Promise<void> {
  // 先将该分类下的短剧的 category_id 置 null
  await query('UPDATE dramas SET category_id = NULL WHERE category_id = ?', [id]);
  await query('DELETE FROM categories WHERE id = ?', [id]);
}
