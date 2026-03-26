import { useState, useEffect } from 'react';
import { vipApi, pointsApi } from '../services/api';
import type { VipPlan, VipStatus } from '../services/api';

interface VipModalProps {
  open: boolean;
  onClose: () => void;
  vipStatus?: VipStatus | null;
}

export default function VipModal({ open, onClose, vipStatus: propVipStatus }: VipModalProps) {
  const [plans, setPlans] = useState<VipPlan[]>([]);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(propVipStatus || null);
  const [purchasing, setPurchasing] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      vipApi.getPlans().then(setPlans).catch(() => {});
      vipApi.getStatus().then(setVipStatus).catch(() => {});
    }
  }, [open]);

  const handlePurchase = async (plan: VipPlan) => {
    if (purchasing) return;
    setPurchasing(plan.id);
    try {
      const order = await vipApi.createOrder(plan.id);
      // 创建 PayPal 支付
      const payment = await vipApi.createPaypalPayment(order.order_no);
      if (payment.approveUrl) {
        window.open(payment.approveUrl, '_blank');
      }
    } catch (e: any) {
      alert(e.message || '创建订单失败');
    } finally {
      setPurchasing(null);
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content vip-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="vip-header">
          <h2 className="vip-title">
            <span className="vip-crown">👑</span> VIP 会员
          </h2>
          {vipStatus?.isVip ? (
            <div className="vip-current">
              <span className="vip-badge">VIP</span>
              <span>剩余 {vipStatus.daysRemaining} 天到期</span>
            </div>
          ) : (
            <p className="vip-desc">开通VIP，享受全部剧集免费观看等专属特权</p>
          )}
        </div>

        {/* VIP 特权 */}
        <div className="vip-privileges">
          <div className="privilege">
            <span className="privilege-icon">🎬</span>
            <span>全部剧集免费</span>
          </div>
          <div className="privilege">
            <span className="privilege-icon">⚡</span>
            <span>签到积分翻倍</span>
          </div>
          <div className="privilege">
            <span className="privilege-icon">💎</span>
            <span>VIP专属标识</span>
          </div>
          <div className="privilege">
            <span className="privilege-icon">🎯</span>
            <span>优先看新剧</span>
          </div>
        </div>

        {/* 套餐列表 */}
        <div className="vip-plans">
          {plans.map(plan => {
            const features = plan.features ? JSON.parse(plan.features) as string[] : [];
            const isCurrentPlan = vipStatus?.isVip && vipStatus.daysRemaining > 0;
            return (
              <div key={plan.id} className={`vip-plan-card ${plan.is_hot ? 'hot' : ''}`}>
                {plan.is_hot && <div className="vip-plan-badge">热门</div>}
                <div className="vip-plan-name">{plan.name}</div>
                <div className="vip-plan-price">
                  <span className="price-current">${plan.price.toFixed(2)}</span>
                  {plan.original_price && (
                    <span className="price-original">${plan.original_price.toFixed(2)}</span>
                  )}
                </div>
                <div className="vip-plan-duration">{plan.duration_days}天</div>
                <ul className="vip-plan-features">
                  {features.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
                <button
                  className={`btn-vip-buy ${isCurrentPlan ? 'renew' : ''}`}
                  onClick={() => handlePurchase(plan)}
                  disabled={purchasing === plan.id}
                >
                  {purchasing === plan.id ? '处理中...' : isCurrentPlan ? '续费' : '立即开通'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
