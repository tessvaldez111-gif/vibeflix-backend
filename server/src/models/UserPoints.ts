import { query } from '../db';

export interface UserPointsRow {
  id: number;
  user_id: number;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface PointsLogRow {
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

/** 获取用户积分记录（如不存在则创建） */
export async function getUserPoints(userId: number): Promise<UserPointsRow> {
  const rows = await query(
    'SELECT * FROM user_points WHERE user_id = ?',
    [userId]
  ) as UserPointsRow[];
  if (rows.length) return rows[0];
  // 自动创建
  await query('INSERT INTO user_points (user_id, balance, total_earned) VALUES (?, 0, 0)', [userId]);
  const created = await query('SELECT * FROM user_points WHERE user_id = ?', [userId]) as UserPointsRow[];
  return created[0];
}

/** 增加积分 */
export async function addPoints(userId: number, amount: number, source: string, sourceId: string, description: string): Promise<number> {
  if (amount <= 0) throw new Error('积分数量必须大于0');
  const conn = await (await import('../db')).getConnection();
  try {
    await conn.beginTransaction();
    const [row] = await conn.query('SELECT * FROM user_points WHERE user_id = ? FOR UPDATE', [userId]) as any[];
    if (!row) {
      await conn.query('INSERT INTO user_points (user_id, balance, total_earned) VALUES (?, 0, 0)', [userId]);
      const [newRow] = await conn.query('SELECT * FROM user_points WHERE user_id = ? FOR UPDATE', [userId]) as any[];
      const balance = newRow.balance + amount;
      await conn.query(
        'UPDATE user_points SET balance = ?, total_earned = total_earned + ? WHERE user_id = ?',
        [balance, amount, userId]
      );
      await conn.query(
        'INSERT INTO points_log (user_id, type, amount, balance_after, source, source_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, 'earn', amount, balance, source, sourceId, description]
      );
      await conn.commit();
      return balance;
    }
    const balance = row.balance + amount;
    await conn.query(
      'UPDATE user_points SET balance = ?, total_earned = total_earned + ? WHERE user_id = ?',
      [balance, amount, userId]
    );
    await conn.query(
      'INSERT INTO points_log (user_id, type, amount, balance_after, source, source_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, 'earn', amount, balance, source, sourceId, description]
    );
    await conn.commit();
    return balance;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** 扣减积分 */
export async function spendPoints(userId: number, amount: number, source: string, sourceId: string, description: string): Promise<number> {
  if (amount <= 0) throw new Error('积分数量必须大于0');
  const conn = await (await import('../db')).getConnection();
  try {
    await conn.beginTransaction();
    const [row] = await conn.query('SELECT * FROM user_points WHERE user_id = ? FOR UPDATE', [userId]) as any[];
    if (!row || row.balance < amount) throw new Error('积分不足');
    const balance = row.balance - amount;
    await conn.query(
      'UPDATE user_points SET balance = ?, total_spent = total_spent + ? WHERE user_id = ?',
      [balance, amount, userId]
    );
    await conn.query(
      'INSERT INTO points_log (user_id, type, amount, balance_after, source, source_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, 'spend', amount, balance, source, sourceId, description]
    );
    await conn.commit();
    return balance;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** 获取积分流水 */
export async function getPointsLog(userId: number, page: number, pageSize: number): Promise<{ list: PointsLogRow[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const [countRow] = await query('SELECT COUNT(*) as total FROM points_log WHERE user_id = ?', [userId]) as any[];
  const list = await query(
    'SELECT * FROM points_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, pageSize, offset]
  ) as PointsLogRow[];
  return { list, total: countRow.total };
}

/** 管理员获取所有积分记录（分页） */
export async function getAllPointsLog(page: number, pageSize: number, userId?: number): Promise<{ list: any[]; total: number }> {
  const offset = (page - 1) * pageSize;
  let whereSql = '1=1';
  const params: any[] = [];
  if (userId) {
    whereSql += ' AND pl.user_id = ?';
    params.push(userId);
  }
  const [countRow] = await query(
    `SELECT COUNT(*) as total FROM points_log pl WHERE ${whereSql}`,
    params
  ) as any[];
  const list = await query(
    `SELECT pl.*, u.username, u.nickname FROM points_log pl LEFT JOIN users u ON pl.user_id = u.id WHERE ${whereSql} ORDER BY pl.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  ) as any[];
  return { list, total: countRow.total };
}

/** 管理员调整积分 */
export async function adminAdjustPoints(userId: number, amount: number, description: string): Promise<number> {
  const type = amount > 0 ? 'admin_add' : 'admin_subtract';
  const absAmount = Math.abs(amount);
  const conn = await (await import('../db')).getConnection();
  try {
    await conn.beginTransaction();
    const [row] = await conn.query('SELECT * FROM user_points WHERE user_id = ? FOR UPDATE', [userId]) as any[];
    if (!row) throw new Error('用户积分记录不存在');
    if (amount < 0 && row.balance < absAmount) throw new Error('积分不足，无法扣减');
    const balance = row.balance + amount;
    await conn.query('UPDATE user_points SET balance = ? WHERE user_id = ?', [balance, userId]);
    if (amount > 0) {
      await conn.query('UPDATE user_points SET total_earned = total_earned + ? WHERE user_id = ?', [absAmount, userId]);
    } else {
      await conn.query('UPDATE user_points SET total_spent = total_spent + ? WHERE user_id = ?', [absAmount, userId]);
    }
    await conn.query(
      'INSERT INTO points_log (user_id, type, amount, balance_after, source, source_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, type, absAmount, balance, 'admin', '', description]
    );
    await conn.commit();
    return balance;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
