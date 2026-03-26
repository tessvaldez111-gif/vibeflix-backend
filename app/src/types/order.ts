// ===== Order & Payment Types =====

export interface PointsInfo {
  id: number;
  user_id: number;
  balance: number;
  total_earned: number;
  total_spent: number;
}

export interface PointsLogItem {
  id: number;
  user_id: number;
  type: 'earn' | 'spend' | 'refund' | 'admin_add' | 'admin_subtract';
  amount: number;
  balance_after: number;
  source: string;
  description: string;
  created_at: string;
}

export interface RechargePackage {
  id: number;
  name: string;
  points: number;
  price: number;
  bonus_points: number;
  is_hot: number;
}

export interface Order {
  id: number;
  order_no: string;
  user_id: number;
  type: 'recharge' | 'purchase';
  amount: number;
  points: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
}
