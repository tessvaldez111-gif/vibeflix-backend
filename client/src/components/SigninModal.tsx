import { useState, useEffect } from 'react';
import { signinApi, settingsApi } from '../services/api';

interface SigninModalProps {
  open: boolean;
  onClose: () => void;
  onSigninSuccess?: (balance: number) => void;
  onRechargeClick?: () => void;
}

export default function SigninModal({ open, onClose, onSigninSuccess, onRechargeClick }: SigninModalProps) {
  const [status, setStatus] = useState<{
    signedToday: boolean;
    streakDays: number;
    totalDays: number;
    monthDays: number[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [signinResult, setSigninResult] = useState<{ points: number; streakDays: number } | null>(null);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  useEffect(() => {
    if (open) {
      signinApi.getStatus().then(setStatus).catch(() => {});
    }
  }, [open]);

  const handleSignin = async () => {
    if (loading || status?.signedToday) return;
    setLoading(true);
    try {
      const result = await signinApi.signin();
      setSigninResult({ points: result.points, streakDays: result.streakDays });
      setStatus(prev => prev ? { ...prev, signedToday: true, streakDays: result.streakDays, totalDays: prev.totalDays + 1, monthDays: [...prev.monthDays, day] } : prev);
      onSigninSuccess?.(result.balance);
    } catch (e: any) {
      alert(e.message || '签到失败');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const signedDays = new Set(status?.monthDays || []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content signin-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <h2 className="signin-title">每日签到</h2>
        
        {/* 连续签到奖励展示 */}
        <div className="signin-streak">
          <div className="streak-info">
            <span className="streak-days">{status?.streakDays || 0}</span>
            <span className="streak-label">天连续签到</span>
          </div>
          <div className="streak-tips">
            <span>已累计签到 {status?.totalDays || 0} 天</span>
          </div>
        </div>

        {/* 奖励阶梯 */}
        <div className="signin-milestones">
          <div className={`milestone ${status && status.streakDays >= 7 ? 'reached' : ''}`}>
            <div className="milestone-icon">7</div>
            <div className="milestone-reward">+15积分</div>
          </div>
          <div className={`milestone ${status && status.streakDays >= 14 ? 'reached' : ''}`}>
            <div className="milestone-icon">14</div>
            <div className="milestone-reward">+20积分</div>
          </div>
          <div className={`milestone ${status && status.streakDays >= 30 ? 'reached' : ''}`}>
            <div className="milestone-icon">30</div>
            <div className="milestone-reward">+50积分</div>
          </div>
        </div>

        {/* 签到日历 */}
        <div className="signin-calendar">
          <div className="calendar-header">
            <span>{year}年{month}月</span>
          </div>
          <div className="calendar-weekdays">
            {weekDays.map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="calendar-days">
            {Array.from({ length: firstDayOfWeek }, (_, i) => <span key={`e${i}`} className="day empty" />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = i + 1;
              const isToday = d === day;
              const isSigned = signedDays.has(d);
              return (
                <span key={d} className={`day ${isToday ? 'today' : ''} ${isSigned ? 'signed' : ''}`}>
                  {isSigned ? '✓' : d}
                </span>
              );
            })}
          </div>
        </div>

        {/* 签到结果提示 */}
        {signinResult && (
          <div className="signin-success">
            <div className="signin-success-icon">🎉</div>
            <div className="signin-success-text">
              签到成功！+{signinResult.points} 积分
              {signinResult.streakDays >= 7 && <p className="streak-bonus">连续{signinResult.streakDays}天额外奖励！</p>}
            </div>
          </div>
        )}

        {/* 签到按钮 */}
        <button
          className={`btn-signin-main ${status?.signedToday ? 'done' : ''}`}
          onClick={handleSignin}
          disabled={loading || !!status?.signedToday}
        >
          {status?.signedToday ? '今日已签到 ✓' : loading ? '签到中...' : '立即签到'}
        </button>

        {onRechargeClick && (
          <button className="btn-recharge-link" onClick={() => { onClose(); onRechargeClick(); }}>
            积分不够？去充值 →
          </button>
        )}
      </div>
    </div>
  );
}
