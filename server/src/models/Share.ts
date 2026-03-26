import { query } from '../db';

export interface ShareRecord {
  id: number;
  user_id: number;
  drama_id: number | null;
  share_type: 'drama' | 'invite_link';
  click_count: number;
  reward_given: number;
  created_at: string;
}

export interface InviteReward {
  id: number;
  inviter_id: number;
  invitee_id: number;
  reward_points: number;
  created_at: string;
}

/** 生成唯一分享码 */
export async function generateShareCode(userId: number): Promise<string> {
  const baseCode = userId.toString(16).padStart(8, '0');
  const rand = Math.random().toString(16).substring(2, 6);
  const code = baseCode + rand;
  await query('UPDATE users SET share_code = ? WHERE id = ? AND (share_code IS NULL OR share_code = "")', [code, userId]);
  const [user] = await query('SELECT share_code FROM users WHERE id = ?', [userId]) as any[];
  return user?.share_code || code;
}

/** 获取用户分享码 */
export async function getShareCode(userId: number): Promise<string> {
  const [user] = await query('SELECT share_code FROM users WHERE id = ?', [userId]) as any[];
  if (user?.share_code) return user.share_code;
  return generateShareCode(userId);
}

/** 通过分享码查找邀请人 */
export async function getInviterByCode(shareCode: string): Promise<{ id: number; username: string } | null> {
  const rows = await query('SELECT id, username FROM users WHERE share_code = ?', [shareCode]) as any[];
  return rows[0] || null;
}

/** 记录分享 */
export async function recordShare(userId: number, dramaId: number | null, shareType: 'drama' | 'invite_link' = 'drama'): Promise<{ id: number; remaining: number }> {
  // 检查今日分享上限
  const today = new Date().toISOString().slice(0, 10);
  const [todayCount] = await query(
    "SELECT COUNT(*) as cnt FROM share_records WHERE user_id = ? AND DATE(created_at) = ?",
    [userId, today]
  ) as any[];

  const [limitSetting] = await query("SELECT `value` FROM system_settings WHERE `key` = 'daily_share_limit'") as any[];
  const dailyLimit = parseInt(limitSetting?.value || '5');

  if (todayCount.cnt >= dailyLimit) {
    throw new Error(`今日分享次数已达上限(${dailyLimit}次)`);
  }

  const result = await query(
    'INSERT INTO share_records (user_id, drama_id, share_type) VALUES (?, ?, ?)',
    [userId, dramaId, shareType]
  ) as any;

  return { id: result.insertId, remaining: dailyLimit - todayCount.cnt - 1 };
}

/** 发放分享奖励积分 */
export async function rewardShare(userId: number, recordId: number): Promise<number> {
  const [setting] = await query("SELECT `value` FROM system_settings WHERE `key` = 'share_reward_points'") as any[];
  const rewardPoints = parseInt(setting?.value || '10');

  await query('UPDATE share_records SET reward_given = 1 WHERE id = ? AND user_id = ?', [recordId, userId]);
  
  const balance = await (await import('./UserPoints')).addPoints(
    userId, rewardPoints, 'share', String(recordId), `分享奖励 +${rewardPoints}积分`
  );
  return balance;
}

/** 处理邀请注册奖励 */
export async function processInviteReward(inviterId: number, inviteeId: number): Promise<void> {
  // 检查是否已发过奖励
  const [existing] = await query(
    'SELECT id FROM invite_rewards WHERE invitee_id = ?',
    [inviteeId]
  ) as any[];
  if (existing) return; // 已发过，不重复

  // 不能自己邀请自己
  if (inviterId === inviteeId) return;

  const [setting] = await query("SELECT `value` FROM system_settings WHERE `key` = 'invite_reward_points'") as any[];
  const rewardPoints = parseInt(setting?.value || '50');

  // 记录邀请关系
  await query(
    'INSERT INTO invite_rewards (inviter_id, invitee_id, reward_points) VALUES (?, ?, ?)',
    [inviterId, inviteeId, rewardPoints]
  );

  // 给邀请人发积分
  try {
    const [inviter] = await query('SELECT username FROM users WHERE id = ?', [inviterId]) as any[];
    const [invitee] = await query('SELECT username FROM users WHERE id = ?', [inviteeId]) as any[];
    await (await import('./UserPoints')).addPoints(
      inviterId, rewardPoints, 'invite', String(inviteeId),
      `邀请 ${invitee?.username || '新用户'} 注册 +${rewardPoints}积分`
    );
  } catch {
    // 积分发放失败不影响注册
  }
}

/** 获取用户分享统计 */
export async function getShareStats(userId: number): Promise<{
  totalShares: number;
  totalClicks: number;
  inviteCount: number;
  earnedPoints: number;
}> {
  const [shareStats] = await query(
    'SELECT COUNT(*) as total, COALESCE(SUM(click_count), 0) as clicks FROM share_records WHERE user_id = ?',
    [userId]
  ) as any[];

  const [inviteStats] = await query(
    'SELECT COUNT(*) as cnt, COALESCE(SUM(reward_points), 0) as points FROM invite_rewards WHERE inviter_id = ?',
    [userId]
  ) as any[];

  return {
    totalShares: shareStats.total,
    totalClicks: shareStats.clicks,
    inviteCount: inviteStats.cnt,
    earnedPoints: inviteStats.points,
  };
}
