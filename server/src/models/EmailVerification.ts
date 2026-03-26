// ===== Email Verification Model =====
import { query } from '../db';

export interface VerificationCode {
  id: number;
  email: string;
  code: string;
  purpose: 'register' | 'reset';
  used: number;
  expires_at: string;
  created_at: string;
}

/** 生成 6 位随机验证码 */
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** 创建验证码（同一邮箱 60 秒内只能发一次） */
export async function createCode(email: string, purpose: 'register' | 'reset' = 'register'): Promise<string> {
  // 检查 60 秒内是否已发送
  const recent = await query<VerificationCode[]>(
    `SELECT id FROM email_verification_codes 
     WHERE email = ? AND purpose = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND) AND used = 0`,
    [email, purpose]
  );
  if (recent.length > 0) {
    throw new Error('请等待60秒后再试');
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 分钟过期

  await query(
    `INSERT INTO email_verification_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)`,
    [email, code, purpose, expiresAt]
  );

  return code;
}

/** 验证码校验 */
export async function verifyCode(
  email: string,
  code: string,
  purpose: 'register' | 'reset' = 'register'
): Promise<boolean> {
  const rows = await query<VerificationCode[]>(
    `SELECT id, used, expires_at FROM email_verification_codes 
     WHERE email = ? AND code = ? AND purpose = ? AND used = 0 
     ORDER BY id DESC LIMIT 1`,
    [email, code, purpose]
  );

  if (!rows.length) return false;

  const record = rows[0];
  if (record.used) return false;

  // 检查是否过期
  if (new Date(record.expires_at) < new Date()) return false;

  // 标记已使用
  await query('UPDATE email_verification_codes SET used = 1 WHERE id = ?', [record.id]);
  return true;
}

/** 将邮箱标记为未验证并清理旧验证码 */
export async function cleanupOldCodes(email: string): Promise<void> {
  await query(
    `DELETE FROM email_verification_codes WHERE email = ? AND expires_at < NOW()`,
    [email]
  );
}
