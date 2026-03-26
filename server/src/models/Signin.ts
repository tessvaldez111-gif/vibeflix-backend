import { query } from '../db';

export interface SigninRecord {
  id: number;
  user_id: number;
  signin_date: string;
  streak_days: number;
  points_earned: number;
  created_at: string;
}

interface StreakBonus {
  [key: string]: number;
}

const DEFAULT_STREAK_BONUS: StreakBonus = {
  '1': 5, '2': 5, '3': 5, '4': 5, '5': 5, '6': 5,
  '7': 15, '14': 20, '30': 50,
};

/** 获取连续签到奖励配置 */
async function getStreakBonusConfig(): Promise<StreakBonus> {
  try {
    const rows = await query("SELECT `value` FROM system_settings WHERE `key` = 'signin_streak_bonus'") as any[];
    if (rows.length > 0 && rows[0].value) {
      return JSON.parse(rows[0].value) as StreakBonus;
    }
  } catch {}
  return DEFAULT_STREAK_BONUS;
}

/** 计算应得签到积分（根据连续天数） */
function calcBonus(streakDays: number, config: StreakBonus): number {
  let bonus = config['1'] || 5; // 默认基础积分
  const keys = Object.keys(config).map(Number).sort((a, b) => a - b);
  for (const key of keys) {
    if (streakDays >= key) {
      bonus = config[key];
    }
  }
  return bonus;
}

/** 获取用户签到状态 */
export async function getSigninStatus(userId: number): Promise<{
  signedToday: boolean;
  streakDays: number;
  totalDays: number;
  monthDays: number[];
}> {
  const today = new Date().toISOString().slice(0, 10);
  
  // 获取今日签到记录
  const todayRecords = await query(
    'SELECT * FROM user_signin_records WHERE user_id = ? AND signin_date = ?',
    [userId, today]
  ) as SigninRecord[];
  
  const signedToday = todayRecords.length > 0;
  const currentStreak = todayRecords.length > 0 ? todayRecords[0].streak_days : 0;

  // 获取总签到天数
  const [countRow] = await query(
    'SELECT COUNT(*) as total FROM user_signin_records WHERE user_id = ?',
    [userId]
  ) as any[];
  const totalDays = countRow.total;

  // 获取当月签到日期列表
  const monthStart = today.slice(0, 7) + '-01';
  const monthRecords = await query(
    'SELECT DAY(signin_date) as day FROM user_signin_records WHERE user_id = ? AND signin_date >= ? AND signin_date <= LAST_DAY(?)',
    [userId, monthStart, today]
  ) as any[];
  const monthDays = monthRecords.map((r: any) => r.day);

  return { signedToday, streakDays: currentStreak, totalDays, monthDays };
}

/** 执行签到（含连续签到计算和阶梯奖励） */
export async function doSignin(userId: number): Promise<{
  balance: number;
  points: number;
  streakDays: number;
}> {
  const db = await import('../db');
  const today = new Date().toISOString().slice(0, 10);

  // 检查今日是否已签到
  const [existing] = await db.query(
    'SELECT id FROM user_signin_records WHERE user_id = ? AND signin_date = ?',
    [userId, today]
  ) as any[];
  if (existing) throw new Error('今日已签到');

  // 计算连续签到天数
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const [yesterdayRecord] = await db.query(
    'SELECT streak_days FROM user_signin_records WHERE user_id = ? AND signin_date = ?',
    [userId, yesterday]
  ) as any[];

  const streakDays = yesterdayRecord ? yesterdayRecord.streak_days + 1 : 1;

  // 获取奖励配置并计算积分
  const bonusConfig = await getStreakBonusConfig();
  const points = calcBonus(streakDays, bonusConfig);

  // 获取 VIP 签到加成
  const [user] = await db.query(
    'SELECT vip_level, vip_expire_at FROM users WHERE id = ?',
    [userId]
  ) as any[];
  let vipBonus = 0;
  if (user && user.vip_level > 0 && user.vip_expire_at && new Date(user.vip_expire_at) > new Date()) {
    const vipSigninBonus = await (await import('./Settings')).getSetting('vip_signin_bonus');
    vipBonus = parseInt(vipSigninBonus || '0');
  }
  const totalPoints = points + vipBonus;

  // 记录签到
  await db.query(
    'INSERT INTO user_signin_records (user_id, signin_date, streak_days, points_earned) VALUES (?, ?, ?, ?)',
    [userId, today, streakDays, totalPoints]
  );

  // 增加积分
  const description = vipBonus > 0
    ? `连续签到${streakDays}天 +${points}积分 (VIP额外+${vipBonus})`
    : `连续签到${streakDays}天 +${points}积分`;
  const balance = await (await import('./UserPoints')).addPoints(
    userId, totalPoints, 'signin', '', description
  );

  return { balance, points: totalPoints, streakDays };
}

/** 获取签到日历数据 */
export async function getSigninCalendar(userId: number, year: number, month: number): Promise<{
  days: number[];
  streakDays: number;
}> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const records = await query(
    'SELECT signin_date, streak_days FROM user_signin_records WHERE user_id = ? AND signin_date BETWEEN ? AND ? ORDER BY signin_date DESC',
    [userId, startDate, endDate]
  ) as any[];

  // 获取当月最大连续天数（取最后一天记录的streak）
  const days = records.map((r: any) => new Date(r.signin_date).getDate());
  const streakDays = records.length > 0 ? records[0].streak_days : 0;

  return { days, streakDays };
}
