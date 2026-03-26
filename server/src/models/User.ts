import { query } from '../db';
import bcrypt from 'bcryptjs';

export interface UserRow {
  id: number;
  username: string;
  password: string;
  nickname: string;
  avatar: string;
  email: string | null;
  email_verified: number;
  role: 'admin' | 'user';
  status: number;
  last_login_at: string | null;
  created_at: string;
}

export interface UserInfo {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  email: string | null;
  email_verified: number;
  role: 'admin' | 'user';
  status: number;
  last_login_at: string | null;
  created_at: string;
}

export async function findByCredentials(username: string, password: string): Promise<UserInfo | null> {
  const users = await query<UserRow[]>(
    'SELECT * FROM users WHERE username = ? AND status = 1',
    [username]
  );
  if (!users.length) return null;

  const user = users[0];

  // 兼容：如果密码未加密（长度短于hash），用明文比较后自动升级
  const isHashed = user.password.startsWith('$2');
  if (isHashed) {
    const match = await bcrypt.compare(password, user.password);
    if (!match) return null;
  } else {
    if (user.password !== password) return null;
    // 自动升级为加密密码
    const hashed = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
  }

  const { password: _, ...info } = user;
  return info;
}

export async function findById(id: number): Promise<UserInfo | null> {
  const users = await query<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]) ;
  if (!users.length) return null;
  const { password: _, ...info } = users[0];
  return info;
}

export async function findByUsername(username: string): Promise<UserRow | null> {
  const users = await query<UserRow[]>('SELECT * FROM users WHERE username = ?', [username]);
  return users[0] || null;
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const users = await query<UserRow[]>('SELECT * FROM users WHERE email = ?', [email]);
  return users[0] || null;
}

export async function create(data: {
  username: string;
  password: string;
  nickname?: string;
  email?: string;
  emailVerified?: boolean;
}): Promise<number> {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const result = await query<any>(
    'INSERT INTO users (username, password, nickname, email, email_verified, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.username, hashedPassword, data.nickname || data.username, data.email || null, data.emailVerified ? 1 : 0, 'user', 1]
  );
  return result.insertId;
}

export async function updateLastLogin(id: number): Promise<void> {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
}

export async function count(): Promise<number> {
  const result = await query<{ count: number }[]>('SELECT COUNT(*) as count FROM users');
  return result[0].count;
}

export async function countToday(): Promise<number> {
  const result = await query<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()'
  );
  return result[0].count;
}
