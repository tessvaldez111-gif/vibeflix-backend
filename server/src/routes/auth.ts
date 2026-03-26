import { Router, Request, Response } from 'express';
import * as DramaModel from '../models/Drama';
import * as UserModel from '../models/User';
import { signToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// 管理员登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const user = await UserModel.findByCredentials(username, password);
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '非管理员账号' });
    }
    await UserModel.updateLastLogin(user.id);
    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.json({ success: true, data: { ...user, token } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 获取仪表板统计信息（需要管理员权限）
router.get('/dashboard', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [dramaCount, episodeCount, userCount, recentDramas] = await Promise.all([
      DramaModel.count(),
      DramaModel.episodeCount(),
      UserModel.count(),
      DramaModel.findRecent(5),
    ]);

    res.json({
      success: true,
      data: { dramaCount, episodeCount, userCount, recentDramas },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

// ========== 用户管理（管理员） ==========

// 获取用户列表（分页、搜索）
router.get('/admin/users', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, page = '1', pageSize = '20', role } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const size = Math.min(50, Math.max(1, parseInt(pageSize as string)));
    const offset = (pageNum - 1) * size;

    let sql = 'SELECT id, username, nickname, avatar, email, role, status, last_login_at, created_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (keyword) {
      sql += ' AND (username LIKE ? OR nickname LIKE ? OR email LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (role && role !== 'all') {
      sql += ' AND role = ?';
      params.push(role);
    }

    const countSql = sql.replace(/SELECT\s+.*?\s+FROM/, 'SELECT COUNT(*) as total FROM');
    const totalResult = await (await import('../db')).query(countSql, params) as any[];
    const total = totalResult[0]?.total || 0;

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(size, offset);
    const list = await (await import('../db')).query(sql, params) as any[];

    res.json({ success: true, data: { list, total, page: pageNum, pageSize: size, totalPages: Math.ceil(total / size) } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

// 更新用户信息（角色、状态）
router.put('/admin/users/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user!.id && req.body.role === 'user') {
      return res.status(400).json({ success: false, message: '不能修改自己的管理员权限' });
    }
    const { role, status, nickname, email } = req.body;
    const db = await import('../db');
    const fields: string[] = [];
    const values: any[] = [];
    if (role !== undefined) { fields.push('role = ?'); values.push(role); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (nickname !== undefined) { fields.push('nickname = ?'); values.push(nickname); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (fields.length === 0) return res.status(400).json({ success: false, message: '没有需要更新的字段' });
    values.push(userId);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '更新用户信息失败' });
  }
});

// 删除用户（同时清除积分相关数据）
router.delete('/admin/users/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user!.id) {
      return res.status(400).json({ success: false, message: '不能删除自己' });
    }
    const db = await import('../db');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      // 清除积分记录和余额
      await conn.query('DELETE FROM points_log WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM user_points WHERE user_id = ?', [userId]);
      // 清除订单和支付记录
      await conn.query('DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)', [userId]);
      await conn.query('DELETE FROM orders WHERE user_id = ?', [userId]);
      // 清除观看历史、收藏
      await conn.query('DELETE FROM watch_history WHERE user_id = ?', [userId]);
      await conn.query('DELETE FROM favorites WHERE user_id = ?', [userId]);
      // 最后删除用户
      await conn.query('DELETE FROM users WHERE id = ?', [userId]);
      await conn.commit();
      res.json({ success: true });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: '删除用户失败' });
  }
});

// ========== 修改密码 ==========

// 管理员修改密码
router.put('/admin/change-password', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: '请输入旧密码和新密码' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: '新密码长度不能少于6位' });
    }
    const user = await UserModel.findByCredentials(String(req.user!.id), oldPassword);
    if (!user) {
      return res.status(401).json({ success: false, message: '旧密码错误' });
    }
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.hash(newPassword, 10);
    const db = await import('../db');
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user!.id]);
    res.json({ success: true, message: '密码修改成功' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '修改密码失败' });
  }
});

export default router;
