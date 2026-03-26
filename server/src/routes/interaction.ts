import { Router, Response } from 'express';
import * as WatchModel from '../models/WatchHistory';
import * as FavModel from '../models/Favorite';
import * as DramaModel from '../models/Drama';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ========== 观看历史 ==========

// 记录/更新观看进度
router.post('/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { drama_id, episode_id, progress, duration } = req.body;
    if (!drama_id || !episode_id) {
      res.status(400).json({ success: false, message: '参数不完整' });
      return;
    }
    const userId = req.user!.id;
    await WatchModel.addOrUpdateHistory({
      user_id: userId, drama_id, episode_id,
      progress: progress || 0, duration: duration || 0
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '记录观看历史失败' });
  }
});

// 获取观看历史列表
router.get('/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const history = await WatchModel.getUserHistory(req.user!.id);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取观看历史失败' });
  }
});

// 清空观看历史
router.delete('/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await WatchModel.clearUserHistory(req.user!.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '清空观看历史失败' });
  }
});

// ========== 收藏 ==========

// 添加收藏/喜欢
router.post('/favorite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { drama_id, type = 'favorite' } = req.body;
    if (!drama_id) {
      res.status(400).json({ success: false, message: '参数不完整' });
      return;
    }
    const userId = req.user!.id;
    const wasFavorited = await FavModel.isFavorited(userId, drama_id, type);
    await FavModel.addFavorite(userId, drama_id, type as 'favorite' | 'like');
    if (!wasFavorited) {
      if (type === 'like') {
        await DramaModel.incrementLikeCount(drama_id);
      } else {
        await DramaModel.incrementCollectCount(drama_id);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '收藏失败' });
  }
});

// 取消收藏/喜欢 (支持 body 和 query param 两种方式)
router.delete('/favorite', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // 支持 body 和 query param
    const drama_id = Number(req.body?.drama_id || req.query?.drama_id);
    const type = (req.body?.type || req.query?.type || 'favorite') as 'favorite' | 'like';
    if (!drama_id) {
      res.status(400).json({ success: false, message: '参数不完整' });
      return;
    }
    const userId = req.user!.id;
    const wasFavorited = await FavModel.isFavorited(userId, drama_id, type);
    await FavModel.removeFavorite(userId, drama_id, type);
    if (wasFavorited) {
      if (type === 'like') {
        await DramaModel.decrementLikeCount(drama_id);
      } else {
        await DramaModel.decrementCollectCount(drama_id);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '取消收藏失败' });
  }
});

// 检查是否已收藏
router.get('/favorite/check', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { drama_id, type = 'favorite' } = req.query;
    if (!drama_id) {
      res.status(400).json({ success: false, message: '参数不完整' });
      return;
    }
    const favorited = await FavModel.isFavorited(req.user!.id, Number(drama_id), type as 'favorite' | 'like');
    res.json({ success: true, data: { favorited } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '检查收藏状态失败' });
  }
});

// 获取收藏列表
router.get('/favorites', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const type = (req.query.type as 'favorite' | 'like') || 'favorite';
    const favorites = await FavModel.getUserFavorites(req.user!.id, type);
    res.json({ success: true, data: favorites });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取收藏列表失败' });
  }
});

export default router;
