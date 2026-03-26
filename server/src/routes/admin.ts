import { Router, Response } from 'express';
import { requireAdmin, AuthRequest } from '../middleware/auth';
import * as OrderModel from '../models/Order';
import * as UserPoints from '../models/UserPoints';
import * as SettingsModel from '../models/Settings';
import * as VipModel from '../models/Vip';

const router = Router();

// ========== 管理员：订单管理 ==========

// 订单列表
router.get('/admin/orders', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', pageSize = '20', status, type, keyword } = req.query;
    const result = await OrderModel.getOrders({
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      status: status as string,
      type: type as string,
      keyword: keyword as string,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取订单列表失败' });
  }
});

// 订单统计
router.get('/admin/order-stats', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await OrderModel.getOrderStats();
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取订单统计失败' });
  }
});

// 支付记录列表
router.get('/admin/payments', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', pageSize = '20', status } = req.query;
    const result = await OrderModel.getPayments({
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      status: status as string,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取支付记录失败' });
  }
});

// ========== 管理员：充值套餐 ==========

// 获取所有套餐
router.get('/admin/packages', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const packages = await OrderModel.getAllPackages();
    res.json({ success: true, data: packages });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取套餐列表失败' });
  }
});

// 创建套餐
router.post('/admin/packages', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, points, price, bonus_points = 0, sort_order = 0, status = 1, is_hot = 0 } = req.body;
    if (!name || !points || !price) return res.status(400).json({ success: false, message: '缺少必要参数' });
    const id = await OrderModel.createPackage({ name, points: Number(points), price: Number(price), bonus_points: Number(bonus_points), sort_order: Number(sort_order), status, is_hot });
    res.json({ success: true, data: { id } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '创建套餐失败' });
  }
});

// 更新套餐
router.put('/admin/packages/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, points, price, bonus_points, sort_order, status, is_hot } = req.body;
    await OrderModel.updatePackage(Number(req.params.id), {
      name, points: points !== undefined ? Number(points) : undefined,
      price: price !== undefined ? Number(price) : undefined,
      bonus_points: bonus_points !== undefined ? Number(bonus_points) : undefined,
      sort_order: sort_order !== undefined ? Number(sort_order) : undefined,
      status, is_hot,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '更新套餐失败' });
  }
});

// 删除套餐
router.delete('/admin/packages/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await OrderModel.deletePackage(Number(req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '删除套餐失败' });
  }
});

// ========== 管理员：积分管理 ==========

// 积分流水
router.get('/admin/points-log', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', pageSize = '20', userId } = req.query;
    const result = await UserPoints.getAllPointsLog(
      parseInt(page as string),
      parseInt(pageSize as string),
      userId ? Number(userId) : undefined
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取积分记录失败' });
  }
});

// 调整用户积分
router.post('/admin/points/adjust', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, amount, description } = req.body;
    if (!userId || !amount || !description) return res.status(400).json({ success: false, message: '缺少参数' });
    const balance = await UserPoints.adminAdjustPoints(Number(userId), Number(amount), description);
    res.json({ success: true, data: { balance } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ========== 管理员：系统设置 ==========

// 获取所有设置
router.get('/admin/settings', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await SettingsModel.getAllSettings();
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取设置失败' });
  }
});

// 批量更新设置
router.put('/admin/settings', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') return res.status(400).json({ success: false, message: '参数格式错误' });
    await SettingsModel.updateSettings(settings);
    res.json({ success: true, message: '设置已保存' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '保存设置失败' });
  }
});

// ========== 管理员：VIP套餐管理 ==========

router.get('/admin/vip-plans', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const plans = await VipModel.getAllPlans();
    res.json({ success: true, data: plans });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取VIP套餐失败' });
  }
});

router.post('/admin/vip-plans', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, duration_days, price, original_price, free_episodes, points_bonus, features, sort_order, is_hot } = req.body;
    if (!name || !duration_days || !price) {
      return res.status(400).json({ success: false, message: '名称、天数、价格不能为空' });
    }
    const id = await VipModel.createPlan({
      name, duration_days: Number(duration_days), price: Number(price),
      original_price: original_price ? Number(original_price) : null,
      free_episodes: Number(free_episodes) || 0, points_bonus: Number(points_bonus) || 0,
      features: features || null, sort_order: Number(sort_order) || 0, is_hot: Number(is_hot) || 0,
    });
    res.json({ success: true, data: { id } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '创建VIP套餐失败' });
  }
});

router.put('/admin/vip-plans/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, duration_days, price, original_price, free_episodes, points_bonus, features, sort_order, is_hot, status } = req.body;
    await VipModel.updatePlan(Number(req.params.id), {
      name, duration_days: duration_days !== undefined ? Number(duration_days) : undefined,
      price: price !== undefined ? Number(price) : undefined,
      original_price: original_price !== undefined ? (original_price ? Number(original_price) : null) : undefined,
      free_episodes: free_episodes !== undefined ? Number(free_episodes) : undefined,
      points_bonus: points_bonus !== undefined ? Number(points_bonus) : undefined,
      features: features !== undefined ? (features || null) : undefined,
      sort_order: sort_order !== undefined ? Number(sort_order) : undefined,
      is_hot: is_hot !== undefined ? Number(is_hot) : undefined,
      status: status !== undefined ? Number(status) : undefined,
    });
    res.json({ success: true, message: 'VIP套餐已更新' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '更新VIP套餐失败' });
  }
});

router.delete('/admin/vip-plans/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await VipModel.deletePlan(Number(req.params.id));
    res.json({ success: true, message: 'VIP套餐已删除' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '删除VIP套餐失败' });
  }
});

export default router;
