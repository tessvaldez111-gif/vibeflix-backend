import { useState, useRef, useEffect } from 'react';
import { userApi, pointsApi, signinApi, vipApi, shareApi } from '../services/api';
import type { User, VipStatus } from '../services/api';
import { Link } from 'react-router-dom';
import SigninModal from './SigninModal';
import VipModal from './VipModal';

interface UserMenuProps {
  user: User & { token: string };
  onLogout: () => void;
  onPointsUpdate?: (balance: number) => void;
}

export default function UserMenu({ user, onLogout, onPointsUpdate }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [signinDone, setSigninDone] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showSignin, setShowSignin] = useState(false);
  const [showVip, setShowVip] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pointsApi.getMyPoints().then(p => {
      setBalance(p.balance);
      onPointsUpdate?.(p.balance);
    }).catch(() => {});
    // Check VIP status
    vipApi.getStatus().then(setVipStatus).catch(() => {});
  }, []);

  // Check signin status on mount
  useEffect(() => {
    signinApi.getStatus().then(s => {
      setSigninDone(s.signedToday);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowRecharge(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSigninClick = () => {
    setOpen(false);
    setShowSignin(true);
  };

  const handleSigninSuccess = (newBalance: number) => {
    setBalance(newBalance);
    setSigninDone(true);
    onPointsUpdate?.(newBalance);
  };

  const handleShowRecharge = async () => {
    if (showRecharge) { setShowRecharge(false); return; }
    try {
      const pkgs = await pointsApi.getPackages();
      setPackages(pkgs);
      setShowRecharge(true);
    } catch (e) {
      alert('加载套餐失败');
    }
  };

  const handleRecharge = async (pkgId: number) => {
    try {
      const order = await pointsApi.createRechargeOrder(pkgId);
      const payment = await pointsApi.createPaypalPayment(order.order_no);
      if (payment.approveUrl) {
        window.open(payment.approveUrl, '_blank');
      }
      setShowRecharge(false);
    } catch (e: any) {
      alert(e.message || '创建订单失败');
    }
  };

  const handleLogout = () => {
    userApi.logout();
    onLogout();
    setOpen(false);
  };

  return (
    <>
      <div className="user-menu" ref={menuRef}>
        <button className="user-avatar" onClick={() => setOpen(!open)}>
          {(user.nickname || user.username).charAt(0).toUpperCase()}
          {vipStatus?.isVip && <span className="avatar-vip-badge">V</span>}
        </button>
        {open && (
          <div className="user-dropdown">
            <div className="user-info">
              <span className="user-name">
                {(user.nickname || user.username)}
                {vipStatus?.isVip && <span className="user-vip-tag">VIP</span>}
              </span>
              <span className="user-role">
                {vipStatus?.isVip ? `${vipStatus.daysRemaining}天VIP` : user.role === 'admin' ? '管理员' : '用户'}
              </span>
            </div>

            {/* Points Display */}
            <div className="points-bar">
              <span className="points-balance">{balance !== null ? `${balance} 积分` : '加载中...'}</span>
              <button className="btn-signin" onClick={handleSigninClick}>
                {signinDone ? '✓ 已签到' : '每日签到'}
              </button>
            </div>

            {/* VIP Entry */}
            <button className="user-dropdown-item vip-entry" onClick={() => { setOpen(false); setShowVip(true); }}>
              <span className="vip-entry-icon">👑</span> {vipStatus?.isVip ? 'VIP会员' : '开通VIP'}
            </button>

            <div className="user-dropdown-divider" />
            <Link to="/profile" className="user-dropdown-item" onClick={() => setOpen(false)}>
              📋 个人中心
            </Link>
            <button className="user-dropdown-item" onClick={handleShowRecharge}>
              {showRecharge ? '收起' : '💎 充值积分'}
            </button>

            {/* Recharge Packages */}
            {showRecharge && packages.length > 0 && (
              <div className="recharge-packages">
                {packages.map(pkg => (
                  <button key={pkg.id} className={`recharge-pkg${pkg.is_hot ? ' hot' : ''}`} onClick={() => handleRecharge(pkg.id)}>
                    <div className="pkg-name">{pkg.name}</div>
                    <div className="pkg-points">{pkg.points + pkg.bonus_points} 积分{pkg.bonus_points > 0 ? ` (含赠${pkg.bonus_points})` : ''}</div>
                    <div className="pkg-price">${parseFloat(pkg.price).toFixed(2)}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="user-dropdown-divider" />
            <button className="user-dropdown-item logout" onClick={handleLogout}>
              退出登录
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSignin && (
        <SigninModal
          open={showSignin}
          onClose={() => setShowSignin(false)}
          onSigninSuccess={handleSigninSuccess}
          onRechargeClick={() => { setShowSignin(false); setShowRecharge(true); }}
        />
      )}
      {showVip && (
        <VipModal
          open={showVip}
          onClose={() => setShowVip(false)}
          vipStatus={vipStatus}
        />
      )}
    </>
  );
}
