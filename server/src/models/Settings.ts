import { query } from '../db';

export interface SettingRow {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

/** 获取单个设置 */
export async function getSetting(key: string): Promise<string | null> {
  const rows = await query('SELECT `value` FROM system_settings WHERE `key` = ?', [key]) as SettingRow[];
  return rows[0]?.value ?? null;
}

/** 获取所有设置 */
export async function getAllSettings(): Promise<SettingRow[]> {
  return query('SELECT * FROM system_settings ORDER BY `key`') as any as SettingRow[];
}

/** 批量更新设置 */
export async function updateSettings(settings: Record<string, string>): Promise<void> {
  const conn = await (await import('../db')).getConnection();
  try {
    await conn.beginTransaction();
    for (const [key, value] of Object.entries(settings)) {
      await conn.query(
        'INSERT INTO system_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [key, value, value]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** 获取 PayPal 配置 */
export async function getPaypalConfig(): Promise<{
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
}> {
  const [enabled, clientId, clientSecret, mode] = await Promise.all([
    getSetting('paypal_enabled'),
    getSetting('paypal_client_id'),
    getSetting('paypal_client_secret'),
    getSetting('paypal_mode'),
  ]);
  return {
    enabled: enabled === 'true',
    clientId: clientId || '',
    clientSecret: clientSecret || '',
    mode: (mode === 'live' ? 'live' : 'sandbox') as 'sandbox' | 'live',
  };
}

/** 获取积分系统配置 */
export async function getPointsConfig(): Promise<{
  registerBonus: number;
  dailySigninPoints: number;
  pointsPerEpisode: number;
  freeEpisodeCount: number;
}> {
  const [registerBonus, dailySigninPoints, pointsPerEpisode, freeEpisodeCount] = await Promise.all([
    getSetting('register_bonus_points'),
    getSetting('daily_signin_points'),
    getSetting('points_per_episode'),
    getSetting('free_episode_count'),
  ]);
  return {
    registerBonus: parseInt(registerBonus || '50'),
    dailySigninPoints: parseInt(dailySigninPoints || '5'),
    pointsPerEpisode: parseInt(pointsPerEpisode || '10'),
    freeEpisodeCount: parseInt(freeEpisodeCount || '3'),
  };
}
