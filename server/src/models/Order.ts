import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface RechargePackageRow {
  id: number;
  name: string;
  points: number;
  price: number;
  bonus_points: number;
  sort_order: number;
  status: number;
  is_hot: number;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: number;
  order_no: string;
  user_id: number;
  type: 'recharge' | 'purchase';
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_method: string;
  payment_id: string;
  package_id: number;
  points_amount: number;
  drama_id: number;
  episode_id: number;
  points_cost: number;
  total_amount: number;
  currency: string;
  paid_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: number;
  order_id: number;
  payment_no: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  payer_email: string;
  payer_id: string;
  paypal_capture_id: string;
  paypal_order_id: string;
  raw_response: any;
  paid_at: string;
  created_at: string;
  updated_at: string;
}

/** 生成订单号 */
function generateOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${y}${m}${d}${h}${mi}${s}${rand}`;
}

/** 获取所有启用的充值套餐 */
export async function getActivePackages(): Promise<RechargePackageRow[]> {
  return query('SELECT * FROM recharge_packages WHERE status = 1 ORDER BY sort_order ASC') as any as RechargePackageRow[];
}

/** 获取所有充值套餐（管理用） */
export async function getAllPackages(): Promise<RechargePackageRow[]> {
  return query('SELECT * FROM recharge_packages ORDER BY sort_order ASC') as any as RechargePackageRow[];
}

/** 获取单个充值套餐 */
export async function getPackageById(id: number): Promise<RechargePackageRow | null> {
  const rows = await query('SELECT * FROM recharge_packages WHERE id = ?', [id]) as RechargePackageRow[];
  return rows[0] || null;
}

/** 创建充值套餐 */
export async function createPackage(data: Omit<RechargePackageRow, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const result = await query(
    'INSERT INTO recharge_packages (name, points, price, bonus_points, sort_order, status, is_hot) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.points, data.price, data.bonus_points, data.sort_order, data.status, data.is_hot]
  ) as any;
  return result.insertId;
}

/** 更新充值套餐 */
export async function updatePackage(id: number, data: Partial<RechargePackageRow>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.points !== undefined) { fields.push('points = ?'); values.push(data.points); }
  if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
  if (data.bonus_points !== undefined) { fields.push('bonus_points = ?'); values.push(data.bonus_points); }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.is_hot !== undefined) { fields.push('is_hot = ?'); values.push(data.is_hot); }
  if (fields.length === 0) return;
  values.push(id);
  await query(`UPDATE recharge_packages SET ${fields.join(', ')} WHERE id = ?`, values);
}

/** 删除充值套餐 */
export async function deletePackage(id: number): Promise<void> {
  await query('DELETE FROM recharge_packages WHERE id = ?', [id]);
}

/** 创建充值订单 */
export async function createRechargeOrder(userId: number, packageId: number): Promise<OrderRow> {
  const pkg = await getPackageById(packageId);
  if (!pkg) throw new Error('充值套餐不存在');
  if (pkg.status !== 1) throw new Error('该套餐已下架');

  const orderNo = generateOrderNo();
  const pointsAmount = pkg.points + pkg.bonus_points;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30分钟过期

  await query(
    `INSERT INTO orders (order_no, user_id, type, status, package_id, points_amount, total_amount, currency, expires_at)
     VALUES (?, ?, 'recharge', 'pending', ?, ?, ?, 'USD', ?)`,
    [orderNo, userId, packageId, pointsAmount, pkg.price, expiresAt]
  );

  const rows = await query('SELECT * FROM orders WHERE order_no = ?', [orderNo]) as OrderRow[];
  return rows[0];
}

/** 创建购买剧集订单（积分购买） */
export async function createPurchaseOrder(userId: number, dramaId: number, episodeId: number, pointsCost: number): Promise<OrderRow> {
  const orderNo = generateOrderNo();

  await query(
    `INSERT INTO orders (order_no, user_id, type, status, drama_id, episode_id, points_cost, total_amount, currency)
     VALUES (?, ?, 'purchase', 'paid', ?, ?, ?, 0, 'USD')`,
    [orderNo, userId, dramaId, episodeId, pointsCost]
  );

  const rows = await query('SELECT * FROM orders WHERE order_no = ?', [orderNo]) as OrderRow[];
  return rows[0];
}

/** 获取订单列表（管理用） */
export async function getOrders(options: {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  keyword?: string;
}): Promise<{ list: any[]; total: number }> {
  const { page = 1, pageSize = 20, status, type, keyword } = options;
  const offset = (page - 1) * pageSize;
  let whereSql = '1=1';
  const params: any[] = [];

  if (status && status !== 'all') {
    whereSql += ' AND o.status = ?';
    params.push(status);
  }
  if (type && type !== 'all') {
    whereSql += ' AND o.type = ?';
    params.push(type);
  }
  if (keyword) {
    whereSql += ' AND (o.order_no LIKE ? OR u.username LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const [countRow] = await query(
    `SELECT COUNT(*) as total FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE ${whereSql}`,
    params
  ) as any[];

  const list = await query(
    `SELECT o.*, u.username, u.nickname,
      CASE WHEN o.type = 'recharge' THEN rp.name ELSE NULL END as package_name
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     LEFT JOIN recharge_packages rp ON o.package_id = rp.id
     WHERE ${whereSql} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  ) as any[];

  return { list, total: countRow.total };
}

/** 获取用户订单列表 */
export async function getUserOrders(userId: number, page: number, pageSize: number): Promise<{ list: any[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const [countRow] = await query('SELECT COUNT(*) as total FROM orders WHERE user_id = ?', [userId]) as any[];
  const list = await query(
    `SELECT o.*, rp.name as package_name FROM orders o
     LEFT JOIN recharge_packages rp ON o.package_id = rp.id
     WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  ) as any[];
  return { list, total: countRow.total };
}

/** 通过订单号获取订单 */
export async function getOrderByNo(orderNo: string): Promise<OrderRow | null> {
  const rows = await query('SELECT * FROM orders WHERE order_no = ?', [orderNo]) as OrderRow[];
  return rows[0] || null;
}

/** 通过ID获取订单 */
export async function getOrderById(id: number): Promise<OrderRow | null> {
  const rows = await query('SELECT * FROM orders WHERE id = ?', [id]) as OrderRow[];
  return rows[0] || null;
}

/** 更新订单状态 */
export async function updateOrderStatus(orderId: number, status: string, paymentId?: string): Promise<void> {
  const fields: string[] = ['status = ?'];
  const values: any[] = [status];
  if (status === 'paid') fields.push('paid_at = NOW()');
  if (paymentId) { fields.push('payment_id = ?'); values.push(paymentId); }
  values.push(orderId);
  await query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values);
}

/** 订单统计 */
export async function getOrderStats(): Promise<{
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
}> {
  const [totalRow] = await query("SELECT COUNT(*) as c, COALESCE(SUM(total_amount), 0) as s FROM orders WHERE status = 'paid'") as any[];
  const [todayRow] = await query("SELECT COUNT(*) as c, COALESCE(SUM(total_amount), 0) as s FROM orders WHERE status = 'paid' AND DATE(paid_at) = CURDATE()") as any[];
  const [pendingRow] = await query("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'") as any[];
  return {
    totalOrders: totalRow.c,
    totalRevenue: parseFloat(totalRow.s),
    todayOrders: todayRow.c,
    todayRevenue: parseFloat(todayRow.s),
    pendingOrders: pendingRow.c,
  };
}

/** 创建支付记录 */
export async function createPayment(data: {
  orderId: number;
  paymentNo: string;
  paymentMethod: string;
  status: string;
  amount: number;
  currency?: string;
  payerEmail?: string;
  payerId?: string;
  paypalOrderId?: string;
  rawResponse?: any;
}): Promise<number> {
  const result = await query(
    `INSERT INTO payments (order_id, payment_no, payment_method, status, amount, currency, payer_email, payer_id, paypal_order_id, raw_response)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.orderId, data.paymentNo, data.paymentMethod, data.status, data.amount,
     data.currency || 'USD', data.payerEmail || '', data.payerId || '',
     data.paypalOrderId || '', JSON.stringify(data.rawResponse || {})]
  ) as any;
  return result.insertId;
}

/** 更新支付记录 */
export async function updatePayment(id: number, data: Partial<PaymentRow>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.paypal_capture_id !== undefined) { fields.push('paypal_capture_id = ?'); values.push(data.paypal_capture_id); }
  if (data.payer_email !== undefined) { fields.push('payer_email = ?'); values.push(data.payer_email); }
  if (data.payer_id !== undefined) { fields.push('payer_id = ?'); values.push(data.payer_id); }
  if (data.status === 'completed') fields.push('paid_at = NOW()');
  if (fields.length === 0) return;
  values.push(id);
  await query(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`, values);
}

/** 获取支付记录（管理用） */
export async function getPayments(options: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<{ list: any[]; total: number }> {
  const { page = 1, pageSize = 20, status } = options;
  const offset = (page - 1) * pageSize;
  let whereSql = '1=1';
  const params: any[] = [];
  if (status && status !== 'all') {
    whereSql += ' AND p.status = ?';
    params.push(status);
  }
  const [countRow] = await query(
    `SELECT COUNT(*) as total FROM payments p WHERE ${whereSql}`,
    params
  ) as any[];
  const list = await query(
    `SELECT p.*, o.order_no, u.username, u.nickname
     FROM payments p
     LEFT JOIN orders o ON p.order_id = o.id
     LEFT JOIN users u ON o.user_id = u.id
     WHERE ${whereSql} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  ) as any[];
  return { list, total: countRow.total };
}
