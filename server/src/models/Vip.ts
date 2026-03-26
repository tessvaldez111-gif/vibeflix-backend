import { query } from '../db';

export interface VipPlan {
  id: number;
  name: string;
  duration_days: number;
  price: number;
  original_price: number | null;
  free_episodes: number;
  points_bonus: number;
  features: string | null;
  sort_order: number;
  is_hot: number;
  status: number;
}

export interface VipOrder {
  id: number;
  order_no: string;
  user_id: number;
  plan_id: number;
  duration_days: number;
  total_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  payment_id: string | null;
  old_expire_at: string | null;
  new_expire_at: string;
  vip_level: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

/** 获取上架的 VIP 套餐列表 */
export async function getActivePlans(): Promise<VipPlan[]> {
  return query(
    'SELECT * FROM vip_plans WHERE status = 1 ORDER BY sort_order ASC, id ASC'
  ) as VipPlan[];
}

/** 获取所有 VIP 套餐（管理员用） */
export async function getAllPlans(): Promise<VipPlan[]> {
  return query(
    'SELECT * FROM vip_plans ORDER BY sort_order ASC, id ASC'
  ) as VipPlan[];
}

/** 获取单个套餐 */
export async function getPlanById(id: number): Promise<VipPlan | null> {
  const rows = await query('SELECT * FROM vip_plans WHERE id = ?', [id]) as VipPlan[];
  return rows[0] || null;
}

/** 获取用户 VIP 状态 */
export async function getUserVipStatus(userId: number): Promise<{
  isVip: boolean;
  vipLevel: number;
  vipExpireAt: string | null;
  daysRemaining: number;
}> {
  const [user] = await query(
    'SELECT vip_level, vip_expire_at FROM users WHERE id = ?',
    [userId]
  ) as any[];

  if (!user || user.vip_level <= 0 || !user.vip_expire_at) {
    return { isVip: false, vipLevel: 0, vipExpireAt: null, daysRemaining: 0 };
  }

  const now = new Date();
  const expire = new Date(user.vip_expire_at);
  if (expire <= now) {
    // VIP 已过期，重置
    await query('UPDATE users SET vip_level = 0, vip_expire_at = NULL WHERE id = ?', [userId]);
    return { isVip: false, vipLevel: 0, vipExpireAt: null, daysRemaining: 0 };
  }

  const daysRemaining = Math.ceil((expire.getTime() - now.getTime()) / 86400000);
  return {
    isVip: true,
    vipLevel: user.vip_level,
    vipExpireAt: user.vip_expire_at,
    daysRemaining,
  };
}

/** 检查用户是否为有效 VIP */
export async function isUserVip(userId: number): Promise<boolean> {
  const status = await getUserVipStatus(userId);
  return status.isVip;
}

/** 创建 VIP 订单 */
export async function createVipOrder(userId: number, planId: number): Promise<VipOrder> {
  const plan = await getPlanById(planId);
  if (!plan) throw new Error('套餐不存在');
  if (plan.status !== 1) throw new Error('套餐已下架');

  // 计算新的到期时间
  const currentStatus = await getUserVipStatus(userId);
  const baseDate = currentStatus.isVip && currentStatus.daysRemaining > 0
    ? new Date(currentStatus.vipExpireAt!)
    : new Date();
  const newExpire = new Date(baseDate.getTime() + plan.duration_days * 86400000);

  const orderNo = 'VIP' + Date.now() + Math.random().toString(36).substring(2, 6);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 分钟后过期

  const result = await query(
    `INSERT INTO vip_orders (order_no, user_id, plan_id, duration_days, total_amount, currency, old_expire_at, new_expire_at, vip_level, expires_at)
     VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, 1, ?)`,
    [orderNo, userId, planId, plan.duration_days, plan.price, currentStatus.vipExpireAt, newExpire.toISOString().slice(0, 19).replace('T', ' '), expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
  ) as any;

  return {
    id: result.insertId,
    order_no: orderNo,
    user_id: userId,
    plan_id: planId,
    duration_days: plan.duration_days,
    total_amount: plan.price,
    currency: 'USD',
    status: 'pending',
    payment_id: null,
    old_expire_at: currentStatus.vipExpireAt,
    new_expire_at: newExpire.toISOString().slice(0, 19).replace('T', ' '),
    vip_level: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
  };
}

/** 激活 VIP（支付成功后调用） */
export async function activateVip(orderNo: string, paypalOrderId: string): Promise<{
  vipLevel: number;
  vipExpireAt: string;
}> {
  const db = await import('../db');
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 查找订单
    const [order] = await conn.query(
      "SELECT * FROM vip_orders WHERE order_no = ? AND status = 'pending' FOR UPDATE",
      [orderNo]
    ) as any[];
    if (!order) throw new Error('订单不存在或已处理');

    // 更新订单状态
    await conn.query(
      "UPDATE vip_orders SET status = 'paid', payment_id = ? WHERE id = ?",
      [paypalOrderId, order.id]
    );

    // 获取最新 VIP 状态（防止并发）
    const [user] = await conn.query(
      'SELECT vip_level, vip_expire_at FROM users WHERE id = ? FOR UPDATE',
      [order.user_id]
    ) as any[];

    // 计算最终到期时间
    const baseDate = user.vip_level > 0 && user.vip_expire_at && new Date(user.vip_expire_at) > new Date()
      ? new Date(user.vip_expire_at)
      : new Date();
    const finalExpire = new Date(Math.max(
      baseDate.getTime(),
      new Date(order.new_expire_at).getTime()
    ));

    // 激活 VIP
    await conn.query(
      'UPDATE users SET vip_level = 1, vip_expire_at = ? WHERE id = ?',
      [finalExpire.toISOString().slice(0, 19).replace('T', ' '), order.user_id]
    );

    await conn.commit();

    return {
      vipLevel: 1,
      vipExpireAt: finalExpire.toISOString(),
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** 获取用户 VIP 订单历史 */
export async function getUserVipOrders(userId: number, page: number, pageSize: number): Promise<{
  list: any[];
  total: number;
}> {
  const offset = (page - 1) * pageSize;
  const [countRow] = await query(
    "SELECT COUNT(*) as total FROM vip_orders WHERE user_id = ?",
    [userId]
  ) as any[];
  const list = await query(
    `SELECT vo.*, vp.name as plan_name FROM vip_orders vo LEFT JOIN vip_plans vp ON vo.plan_id = vp.id
     WHERE vo.user_id = ? ORDER BY vo.created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  ) as any[];
  return { list, total: countRow.total };
}

/** 管理员：VIP 套餐 CRUD */
export async function createPlan(data: {
  name: string;
  duration_days: number;
  price: number;
  original_price?: number;
  free_episodes: number;
  points_bonus: number;
  features?: string;
  sort_order?: number;
  is_hot?: number;
}): Promise<number> {
  const result = await query(
    `INSERT INTO vip_plans (name, duration_days, price, original_price, free_episodes, points_bonus, features, sort_order, is_hot, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [data.name, data.duration_days, data.price, data.original_price || null, data.free_episodes, data.points_bonus,
     data.features || null, data.sort_order || 0, data.is_hot || 0]
  ) as any;
  return result.insertId;
}

export async function updatePlan(id: number, data: Partial<{
  name: string; duration_days: number; price: number; original_price: number;
  free_episodes: number; points_bonus: number; features: string; sort_order: number; is_hot: number; status: number;
}>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }
  if (fields.length === 0) return;
  values.push(id);
  await query(`UPDATE vip_plans SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deletePlan(id: number): Promise<void> {
  await query('DELETE FROM vip_plans WHERE id = ?', [id]);
}
