import { Router, Request, Response } from 'express';
import * as UserModel from '../models/User';
import * as UserPoints from '../models/UserPoints';
import * as EmailVerification from '../models/EmailVerification';
import { sendVerificationEmail } from '../services/email.service';
import { signToken, requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// 发送邮箱验证码
router.post('/send-code', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, message: '请输入有效的邮箱地址' });
      return;
    }
    const code = await EmailVerification.createCode(email, 'register');
    const result = await sendVerificationEmail(email, code, 'register');
    if (!result.success) {
      res.status(500).json({ success: false, message: result.message });
      return;
    }
    res.json({ success: true, message: result.message, data: { devCode: result.devCode } });
  } catch (err: any) {
    if (err.message?.includes('60秒')) {
      res.status(429).json({ success: false, message: err.message });
      return;
    }
    res.status(500).json({ success: false, message: '发送验证码失败' });
  }
});

// 观众端：用户注册（需要邮箱验证码）
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, nickname, email, emailCode, inviteCode } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Username and password are required' });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ success: false, message: '请输入有效的邮箱地址' });
      return;
    }
    if (!emailCode || emailCode.length !== 6) {
      res.status(400).json({ success: false, message: '请输入6位验证码' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }
    if (username.length < 2 || username.length > 20) {
      res.status(400).json({ success: false, message: 'Username must be 2-20 characters' });
      return;
    }

    // 校验邮箱验证码
    const valid = await EmailVerification.verifyCode(email, emailCode, 'register');
    if (!valid) {
      res.status(400).json({ success: false, message: '验证码无效或已过期' });
      return;
    }

    // 检查邮箱是否已被使用
    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      res.status(409).json({ success: false, message: '该邮箱已被注册' });
      return;
    }

    const existing = await UserModel.findByUsername(username);
    if (existing) {
      res.status(409).json({ success: false, message: 'Username already exists' });
      return;
    }
    const userId = await UserModel.create({ username, password, nickname, email, emailVerified: true });

    // 处理邀请码
    let inviterId: number | null = null;
    if (inviteCode) {
      try {
        const inviter = await (await import('../models/Share')).getInviterByCode(inviteCode);
        if (inviter) {
          inviterId = inviter.id;
          // 记录邀请关系
          await (await import('../models/Share')).processInviteReward(inviter.id, userId);
          // 更新被邀请人的 inviter_id
          const db = await import('../db');
          await db.query('UPDATE users SET inviter_id = ? WHERE id = ?', [inviter.id, userId]);
        }
      } catch {
        // 邀请码处理失败不影响注册
      }
    }

    // 注册赠送奖励积分
    try {
      const settings = await (await import('../models/Settings')).getPointsConfig();
      if (settings.registerBonus > 0) {
        await UserPoints.addPoints(
          userId,
          settings.registerBonus,
          'register',
          '',
          '注册奖励'
        );
      }
    } catch {
      // 积分赠送失败不影响注册流程
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(500).json({ success: false, message: '注册失败' });
      return;
    }
    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.json({ success: true, data: { ...user, token } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || '注册失败' });
  }
});

// 观众端：用户登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: '用户名和密码不能为空' });
      return;
    }
    const user = await UserModel.findByCredentials(username, password);
    if (!user) {
      res.status(401).json({ success: false, message: '用户名或密码错误' });
      return;
    }
    await UserModel.updateLastLogin(user.id);
    const token = signToken({ id: user.id, username: user.username, role: user.role });
    res.json({ success: true, data: { ...user, token } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 获取当前用户信息（需要登录）
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

// 获取用户信息（公开）
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(Number(req.params.id));
    if (!user) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

export default router;
