import { Router, Request, Response } from 'express';
import * as DramaModel from '../models/Drama';
import * as UserModel from '../models/User';
import * as UserPoints from '../models/UserPoints';
import { requireAdmin, optionalAuth, AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

const router = Router();

// ========== 公开接口（无需认证） ==========

// 获取所有短剧列表（支持搜索和分页）
router.get('/dramas', async (req: Request, res: Response) => {
  try {
    const { keyword, genre, page, pageSize, status } = req.query;
    const data = await DramaModel.findAll({
      keyword: keyword as string,
      genre: genre as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      status: status as string,
    });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取短剧列表失败' });
  }
});

// 获取单个短剧详情
router.get('/dramas/:id', async (req: Request, res: Response) => {
  try {
    const drama = await DramaModel.findById(Number(req.params.id));
    if (!drama) {
      return res.status(404).json({ success: false, message: '短剧不存在' });
    }
    res.json({ success: true, data: drama });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取短剧详情失败' });
  }
});

// 获取剧集信息（需检查付费权限）
router.get('/dramas/:dramaId/episodes/:episodeNumber', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const dramaId = Number(req.params.dramaId);
    const episodeNumber = Number(req.params.episodeNumber);
    const episode = await DramaModel.findEpisodeById(dramaId, episodeNumber);
    if (!episode) {
      return res.status(404).json({ success: false, message: '剧集不存在' });
    }

    // 如果剧集是付费的，检查用户是否已购买或是否免费
    if (!episode.is_free) {
      if (!req.user) {
        return res.status(401).json({ success: false, message: '请先登录', code: 'LOGIN_REQUIRED' });
      }
      const db = await import('../db');
      const [purchased] = await db.query(
        "SELECT id FROM orders WHERE user_id = ? AND drama_id = ? AND episode_id = ? AND status = 'paid' LIMIT 1",
        [req.user.id, dramaId, episode.id]
      ) as any[];
      if (!purchased) {
        return res.status(403).json({ success: false, message: '该集需要付费观看', code: 'PAYMENT_REQUIRED', data: { episode } });
      }
    }

    res.json({ success: true, data: episode });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取剧集信息失败' });
  }
});

// 获取所有分类标签
router.get('/genres', async (_req: Request, res: Response) => {
  try {
    const genres = await DramaModel.findAllGenres();
    res.json({ success: true, data: genres });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '获取分类失败' });
  }
});

// ========== 管理接口（需要管理员认证） ==========

// 创建短剧
router.post('/dramas', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, genre, status, cover_image } = req.body;
    if (!title) return res.status(400).json({ success: false, message: '短剧标题不能为空' });
    const id = await DramaModel.create({ title, description, genre, status, cover_image });
    res.json({ success: true, data: { id } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '创建短剧失败' });
  }
});

// 更新短剧信息
router.put('/dramas/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await DramaModel.update(Number(req.params.id), req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '更新短剧失败' });
  }
});

// 更新短剧封面
router.put('/dramas/:id/cover', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await DramaModel.updateCover(Number(req.params.id), req.body.cover_image);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '更新封面失败' });
  }
});

// 删除短剧（级联删除剧集和文件）
router.delete('/dramas/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { drama, episodes } = await DramaModel.remove(Number(req.params.id));

    // 删除关联的视频文件
    episodes.forEach((ep) => {
      const filePath = path.join(process.cwd(), ep.video_path.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    // 删除封面
    if (drama?.cover_image) {
      const coverPath = path.join(process.cwd(), drama.cover_image.replace(/^\//, ''));
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '删除短剧失败' });
  }
});

// 创建剧集
router.post('/dramas/:dramaId/episodes', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { episode_number, title, video_path, duration } = req.body;
    if (!episode_number) return res.status(400).json({ success: false, message: '集数不能为空' });
    const id = await DramaModel.createEpisode({
      drama_id: Number(req.params.dramaId),
      episode_number,
      title,
      video_path,
      duration,
    });
    res.json({ success: true, data: { id } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '创建剧集失败' });
  }
});

// 删除剧集
router.delete('/dramas/:dramaId/episodes/:episodeId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const episode = await DramaModel.removeEpisode(
      Number(req.params.episodeId),
      Number(req.params.dramaId)
    );
    if (episode) {
      const filePath = path.join(process.cwd(), episode.video_path.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '删除剧集失败' });
  }
});

// 更新剧集信息（标题、排序、集号等）
router.put('/dramas/:dramaId/episodes/:episodeId', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, sort_order, episode_number } = req.body;
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (episode_number !== undefined) updateData.episode_number = episode_number;
    await DramaModel.updateEpisode(Number(req.params.episodeId), Number(req.params.dramaId), updateData);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '更新剧集失败' });
  }
});

// 批量更新剧集排序
router.put('/dramas/:dramaId/episodes/reorder', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: '参数格式错误' });
    }
    for (const item of items) {
      await DramaModel.updateEpisode(item.id, Number(req.params.dramaId), { sort_order: item.sort_order });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: '更新排序失败' });
  }
});

export default router;
