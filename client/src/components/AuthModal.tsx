import { useState, useEffect, useRef, useCallback } from 'react';
import { userApi } from '../services/api';
import type { User } from '../services/api';

const COUNTDOWN_SECONDS = 60;

interface AuthModalProps {
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitch: () => void;
  onSuccess: (user: User & { token: string }) => void;
  reason?: string;
}

export default function AuthModal({ mode, onClose, onSwitch, onSuccess, reason }: AuthModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 检查 URL 中的邀请码参数
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) {
      setInviteCode(code);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // 清理倒计时
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSendCode = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }
    setSendingCode(true);
    setError('');
    try {
      const result = await userApi.sendCode(email.trim());
      if (result.devCode) {
        // 开发模式：直接显示验证码
        setError('');
        alert(`开发模式 - 验证码: ${result.devCode}`);
      } else {
        alert('验证码已发送到您的邮箱');
      }
      setCodeSent(true);
      startCountdown();
    } catch (err: any) {
      setError(err.message || '发送验证码失败');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        // 注册校验
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError('请输入有效的邮箱地址');
          setLoading(false);
          return;
        }
        if (!emailCode.trim() || emailCode.trim().length !== 6) {
          setError('请输入6位验证码');
          setLoading(false);
          return;
        }
        const data = await userApi.register({
          username,
          password,
          nickname: nickname || undefined,
          email: email.trim(),
          emailCode: emailCode.trim(),
          inviteCode: inviteCode || undefined,
        });
        userApi.saveAuth(data);
        onSuccess(data);
      } else {
        const data = await userApi.login({ username, password });
        userApi.saveAuth(data);
        onSuccess(data);
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const canSendCode = countdown === 0 && !sendingCode;

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>&times;</button>
        <h2>{mode === 'login' ? '登录' : '注册'}</h2>
        {reason && <div className="auth-reason">{reason}</div>}
        {error && <div className="auth-error">{error}</div>}
        {inviteCode && mode === 'register' && (
          <div className="auth-invite">邀请码已填入，注册后你和邀请人都会获得积分奖励</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              minLength={2}
              maxLength={20}
              autoComplete="username"
            />
          </div>
          {mode === 'register' && (
            <>
              <div className="auth-field">
                <label>昵称（选填）</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="取个好听的名字"
                  autoComplete="nickname"
                />
              </div>
              <div className="auth-field">
                <label>邮箱 <span className="auth-required">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setCodeSent(false); }}
                  placeholder="请输入邮箱地址"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label>邮箱验证码 <span className="auth-required">*</span></label>
                <div className="auth-code-row">
                  <input
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6位验证码"
                    required
                    maxLength={6}
                    className="auth-code-input"
                    autoComplete="one-time-code"
                  />
                  <button
                    type="button"
                    className={`auth-send-code-btn ${!canSendCode ? 'disabled' : ''}`}
                    onClick={handleSendCode}
                    disabled={!canSendCode}
                  >
                    {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : codeSent ? '重新发送' : '发送验证码'}
                  </button>
                </div>
              </div>
              <div className="auth-field">
                <label>邀请码（选填）</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="好友的邀请码"
                />
              </div>
            </>
          )}
          <div className="auth-field">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? '请稍候...' : mode === 'login' ? '登 录' : '注 册'}
          </button>
        </form>
        <div className="auth-switch">
          {mode === 'login' ? (
            <span>还没有账号？<a onClick={onSwitch}>立即注册</a></span>
          ) : (
            <span>已有账号？<a onClick={onSwitch}>去登录</a></span>
          )}
        </div>
      </div>
    </div>
  );
}
