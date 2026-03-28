import { Router, Request, Response } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import * as OrderModel from '../models/Order';
import * as UserPoints from '../models/UserPoints';

const router = Router();

// ========== 用户端 API ==========

// 获取充值套餐列表
router.get('/recharge/packages', async (_req: Request, res: Response) => {
  try {
    const packages = await OrderModel.getActivePackages();
    res.json({ success: true, data: packages });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取套餐列表失败' });
  }
});

// 创建充值订单
router.post('/recharge/create-order', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const { packageId } = req.body;
    if (!packageId) return res.status(400).json({ success: false, message: '请选择充值套餐' });
    const order = await OrderModel.createRechargeOrder(req.user.id, Number(packageId));
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '创建订单失败' });
  }
});

// 获取我的订单
router.get('/orders/my', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(20, parseInt(req.query.pageSize as string) || 10);
    const result = await OrderModel.getUserOrders(req.user.id, page, pageSize);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取订单列表失败' });
  }
});

// ========== 积分 API ==========

// 获取我的积分余额
router.get('/points/my', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const points = await UserPoints.getUserPoints(req.user.id);
    res.json({ success: true, data: points });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取积分失败' });
  }
});

// 获取我的积分流水
router.get('/points/my/log', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(20, parseInt(req.query.pageSize as string) || 10);
    const result = await UserPoints.getPointsLog(req.user.id, page, pageSize);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取积分记录失败' });
  }
});

// 积分购买剧集（使用事务保证原子性）
router.post('/points/purchase', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const { dramaId, episodeId, pointsCost } = req.body;
    if (!dramaId || !episodeId || !pointsCost) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const db = await import('../db');
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 检查是否已购买（在同一事务中）
      const [existingOrders] = await conn.query(
        "SELECT id FROM orders WHERE user_id = ? AND drama_id = ? AND episode_id = ? AND status = 'paid' LIMIT 1",
        [req.user.id, dramaId, episodeId]
      ) as any[];
      if (existingOrders.length > 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: '该集已购买' });
      }

      // 扣减积分（行锁）
      const [pointsRow] = await conn.query(
        'SELECT * FROM user_points WHERE user_id = ? FOR UPDATE',
        [req.user.id]
      ) as any[];
      if (!pointsRow || pointsRow.balance < pointsCost) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: '积分不足' });
      }

      const newBalance = pointsRow.balance - pointsCost;
      await conn.query(
        'UPDATE user_points SET balance = ?, total_spent = total_spent + ? WHERE user_id = ?',
        [newBalance, pointsCost, req.user.id]
      );
      await conn.query(
        "INSERT INTO points_log (user_id, type, amount, balance_after, source, source_id, description) VALUES (?, 'spend', ?, ?, 'purchase', ?, ?)",
        [req.user.id, pointsCost, newBalance, `${dramaId}-${episodeId}`, '购买剧集']
      );

      // 创建订单
      const orderNo = 'PO' + Date.now() + Math.random().toString(36).substring(2, 6);
      await conn.query(
        `INSERT INTO orders (order_no, user_id, drama_id, episode_id, type, status, total_amount, currency, points_amount, points_cost)
         VALUES (?, ?, ?, ?, 'purchase', 'paid', 0, 'CNY', 0, ?)`,
        [orderNo, req.user.id, dramaId, episodeId, pointsCost]
      );

      await conn.commit();
      res.json({ success: true, data: { orderNo, balance: newBalance } });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || '购买失败' });
  }
});

// 获取积分系统配置（公开接口，前端用于显示价格等）
router.get('/settings/points-config', async (_req: Request, res: Response) => {
  try {
    const settings = await (await import('../models/Settings')).getPointsConfig();
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

// 每日签到
router.post('/points/signin', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const db = await import('../db');
    const today = new Date().toISOString().slice(0, 10);
    const existing = await db.query(
      "SELECT id FROM points_log WHERE user_id = ? AND source = 'signin' AND DATE(created_at) = ?",
      [req.user.id, today]
    ) as any[];
    if (existing.length > 0) return res.status(400).json({ success: false, message: '今日已签到' });

    const settings = await (await import('../models/Settings')).getPointsConfig();
    const balance = await UserPoints.addPoints(
      req.user.id, settings.dailySigninPoints, 'signin', '', `每日签到 +${settings.dailySigninPoints}积分`
    );
    res.json({ success: true, data: { balance, points: settings.dailySigninPoints } });
  } catch (err: any) {
    console.error('Signin error:', err);
    res.status(500).json({ success: false, message: '签到失败' });
  }
});

export default router;
