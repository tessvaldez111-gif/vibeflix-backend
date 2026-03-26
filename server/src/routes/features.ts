import { Router, Request, Response } from 'express';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import * as SigninModel from '../models/Signin';
import * as ShareModel from '../models/Share';
import * as VipModel from '../models/Vip';

const router = Router();

// ========== 签到 API ==========

// 获取签到状态（含连续天数和日历数据）
router.get('/signin/status', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const status = await SigninModel.getSigninStatus(req.user.id);
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取签到状态失败' });
  }
});

// 执行签到（含连续签到奖励）
router.post('/signin', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const result = await SigninModel.doSignin(req.user.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || '签到失败' });
  }
});

// 获取签到日历数据
router.get('/signin/calendar', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
    const calendar = await SigninModel.getSigninCalendar(req.user.id, year, month);
    res.json({ success: true, data: calendar });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取签到日历失败' });
  }
});

// ========== 分享 API ==========

// 获取分享码
router.get('/share/code', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const code = await ShareModel.getShareCode(req.user.id);
    res.json({ success: true, data: { code } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取分享码失败' });
  }
});

// 记录分享
router.post('/share', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const { dramaId, shareType } = req.body;
    const result = await ShareModel.recordShare(
      req.user.id,
      dramaId ? Number(dramaId) : null,
      shareType || 'drama'
    );
    // 分享后发放奖励
    const balance = await ShareModel.rewardShare(req.user.id, result.id);
    res.json({ success: true, data: { ...result, balance } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || '分享失败' });
  }
});

// 分享统计
router.get('/share/stats', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const stats = await ShareModel.getShareStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取分享统计失败' });
  }
});

// ========== VIP API ==========

// 获取 VIP 套餐列表
router.get('/vip/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await VipModel.getActivePlans();
    res.json({ success: true, data: plans });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取VIP套餐失败' });
  }
});

// 获取我的 VIP 状态
router.get('/vip/status', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const status = await VipModel.getUserVipStatus(req.user.id);
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取VIP状态失败' });
  }
});

// 创建 VIP 订单
router.post('/vip/create-order', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ success: false, message: '请选择VIP套餐' });
    const order = await VipModel.createVipOrder(req.user.id, Number(planId));
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || '创建订单失败' });
  }
});

// VIP 支付成功回调
router.post('/vip/activate', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const { orderNo, paypalOrderId } = req.body;
    if (!orderNo || !paypalOrderId) return res.status(400).json({ success: false, message: '参数不完整' });
    const result = await VipModel.activateVip(orderNo, paypalOrderId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'VIP激活失败' });
  }
});

// VIP 订单历史
router.get('/vip/orders', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: '请先登录' });
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(20, parseInt(req.query.pageSize as string) || 10);
    const result = await VipModel.getUserVipOrders(req.user.id, page, pageSize);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取VIP订单失败' });
  }
});

export default router;
