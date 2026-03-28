// ===== Comments, Danmaku, Ad Reward API =====
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { query, getConnection } from '../db';

const router = Router();

// GET /comments?dramaId=&episodeId=&page=&pageSize=&sort=
router.get('/comments', async (req: AuthRequest, res: Response) => {
  try {
    const { dramaId, episodeId, page = '1', pageSize = '20', sort = 'latest' } = req.query;
    const p = Math.max(1, parseInt(page as string));
    const ps = Math.min(50, Math.max(1, parseInt(pageSize as string)));
    const offset = (p - 1) * ps;

    if (!dramaId) {
      return res.status(400).json({ success: false, message: 'dramaId is required' });
    }

    let where = 'WHERE c.drama_id = ?';
    const params: any[] = [parseInt(dramaId as string)];
    if (episodeId) {
      where += ' AND c.episode_id = ?';
      params.push(parseInt(episodeId as string));
    }
    let orderBy = 'c.created_at DESC';
    if (sort === 'hot') {
      orderBy = 'c.like_count DESC, c.created_at DESC';
    }

    const rows = await query(
      `SELECT c.*, u.username, u.nickname, u.avatar,
              (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) as like_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, ps, offset]
    ) as any[];

    const comments = (rows || []).map((r: any) => ({
      id: r.id,
      drama_id: r.drama_id,
      episode_id: r.episode_id,
      user_id: r.user_id,
      username: r.username,
      nickname: r.nickname,
      avatar: r.avatar,
      content: r.content,
      like_count: r.like_count || 0,
      is_liked: false,
      created_at: r.created_at,
    }));

    // Batch check likes for logged-in user
    const userId = req.user?.id || 0;
    if (userId > 0 && comments.length > 0) {
      const commentIds = comments.map(c => c.id);
      const likes = await query(
        `SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (?)`,
        [userId, commentIds]
      ) as any[];
      const likedSet = new Set((likes || []).map((l: any) => l.comment_id));
      comments.forEach(c => { c.is_liked = likedSet.has(c.id); });
    }

    // Get total count
    const countRows = await query(`SELECT COUNT(*) as total FROM comments c ${where}`, params) as any[];
    const total = countRows?.[0]?.total || 0;

    res.json({
      success: true,
      data: {
        list: comments,
        total,
        page: p,
        pageSize: ps,
        totalPages: Math.ceil(total / ps),
      },
    });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ success: false, message: 'Failed to get comments' });
  }
});

// POST /comments (auth required)
router.post('/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Login required' });

    const { dramaId, content, episodeId } = req.body;
    if (!dramaId || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'Missing dramaId or content' });
    }

    const result = await query(
      'INSERT INTO comments (drama_id, episode_id, user_id, content) VALUES (?, ?, ?, ?)',
      [parseInt(dramaId), episodeId ? parseInt(episodeId) : null, req.user.id, content.trim().slice(0, 500)]
    ) as any;

    const comment = await query(
      `SELECT c.*, u.username, u.nickname, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
      [result.insertId]
    ) as any[];

    res.json({ success: true, data: comment?.[0] || null });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ success: false, message: 'Failed to create comment' });
  }
});

// POST /comments/:id/like (auth required)
router.post('/comments/:id/like', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Login required' });
    const commentId = parseInt(req.params.id as string);

    await query(
      `INSERT IGNORE INTO comment_likes (comment_id, user_id) VALUES (?, ?)`,
      [commentId, req.user.id]
    );

    await query(
      `UPDATE comments SET like_count = like_count + 1 WHERE id = ?`,
      [commentId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Like comment error:', err);
    res.status(500).json({ success: false, message: 'Failed to like comment' });
  }
});

// DELETE /comments/:id/like (auth required)
router.delete('/comments/:id/like', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Login required' });
    const commentId = parseInt(req.params.id as string);

    const result = await query(
      `DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`,
      [commentId, req.user.id]
    ) as any;

    if ((result as any).affectedRows > 0) {
      await query(
        `UPDATE comments SET like_count = GREATEST(0, like_count - 1) WHERE id = ?`,
        [commentId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Unlike comment error:', err);
    res.status(500).json({ success: false, message: 'Failed to unlike comment' });
  }
});

// ===== Danmaku API =====

// GET /danmaku?dramaId=&episodeId=
router.get('/danmaku', async (req: AuthRequest, res: Response) => {
  try {
    const { dramaId, episodeId } = req.query;
    if (!dramaId || !episodeId) {
      return res.status(400).json({ success: false, message: 'dramaId and episodeId are required' });
    }

    const rows = await query(
      `SELECT * FROM danmaku WHERE drama_id = ? AND episode_id = ? ORDER BY time ASC`,
      [parseInt(dramaId as string), parseInt(episodeId as string)]
    ) as any[];

    res.json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('Get danmaku error:', err);
    res.status(500).json({ success: false, message: 'Failed to get danmaku' });
  }
});

// POST /danmaku (auth required)
router.post('/danmaku', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Login required' });

    const { dramaId, episodeId, content, time, color } = req.body;
    if (!dramaId || !episodeId || !content || time === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await query(
      `INSERT INTO danmaku (drama_id, episode_id, user_id, content, time, color) VALUES (?, ?, ?, ?, ?, ?)`,
      [parseInt(dramaId), parseInt(episodeId), req.user.id, content.trim().slice(0, 100), parseFloat(time), color || '#FFFFFF']
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Send danmaku error:', err);
    res.status(500).json({ success: false, message: 'Failed to send danmaku' });
  }
});

// ===== Ad Reward API =====

// GET /ad-reward/today (auth required)
router.get('/ad-reward/today', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Login required' });

    const rows = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(points), 0) as total_points
       FROM ad_reward_records
       WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
      [req.user.id]
    ) as any[];

    const settings = await query(
      `SELECT \`key\`, value FROM system_settings WHERE \`key\` IN ('ad_reward_points', 'ad_daily_limit')`
    ) as any[];

    const settingsMap: Record<string, number> = {};
    (settings || []).forEach((s: any) => { settingsMap[s.key] = parseInt(s.value) || 0; });

    res.json({
      success: true,
      data: {
        count: rows?.[0]?.count || 0,
        totalPoints: rows?.[0]?.total_points || 0,
        limit: settingsMap.ad_daily_limit || 5,
        pointsPerAd: settingsMap.ad_reward_points || 5,
      },
    });
  } catch (err) {
    console.error('Get ad reward error:', err);
    res.status(500).json({ success: false, message: 'Failed to get ad reward info' });
  }
});

// POST /ad-reward/claim (auth required)
router.post('/ad-reward/claim', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Login required' });

    const settings = await query(
      `SELECT \`key\`, value FROM system_settings WHERE \`key\` IN ('ad_reward_points', 'ad_daily_limit')`
    ) as any[];

    const settingsMap: Record<string, number> = {};
    (settings || []).forEach((s: any) => { settingsMap[s.key] = parseInt(s.value) || 0; });

    const pointsPerAd = settingsMap.ad_reward_points || 5;
    const dailyLimit = settingsMap.ad_daily_limit || 5;

    // Check daily count
    const countRows = await query(
      `SELECT COUNT(*) as count FROM ad_reward_records WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
      [req.user.id]
    ) as any[];

    if ((countRows?.[0]?.count || 0) >= dailyLimit) {
      return res.json({ success: false, message: '今日广告奖励已达上限' });
    }

    // Use transaction for atomicity
    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO ad_reward_records (user_id, drama_id, episode_id, reward_points) VALUES (?, ?, ?, ?)`,
        [req.user.id, req.body.dramaId, req.body.episodeId, pointsPerAd]
      );
      await conn.query(
        `INSERT INTO user_points (user_id, balance) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)`,
        [req.user.id, pointsPerAd]
      );
      await conn.query(
        `INSERT INTO points_log (user_id, type, amount, description)
         VALUES (?, 'reward', ?, '观看广告奖励')`,
        [req.user.id, pointsPerAd]
      );
      await conn.commit();
    } finally {
      conn.release();
    }
    // Get new balance
    const balanceRows = await query('SELECT balance FROM user_points WHERE user_id = ?', [req.user.id]) as any[];
    res.json({
      success: true,
      data: {
        points: pointsPerAd,
        balance: balanceRows?.[0]?.balance || 0,
      },
    });
  } catch (err) {
    console.error('Ad reward claim error:', err);
    res.status(500).json({ success: false, message: 'Failed to claim reward' });
  }
});

export default router;
