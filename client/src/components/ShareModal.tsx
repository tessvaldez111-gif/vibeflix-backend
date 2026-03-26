import { useState } from 'react';
import { shareApi } from '../services/api';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  dramaId?: number | null;
  dramaTitle?: string;
  shareCode?: string;
}

export default function ShareModal({ open, onClose, dramaId, dramaTitle, shareCode }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareType, setShareType] = useState<'drama' | 'invite'>(dramaId ? 'drama' : 'invite');
  const [shareReward, setShareReward] = useState<string | null>(null);

  const baseUrl = window.location.origin;
  const dramaUrl = dramaId ? `${baseUrl}/drama/${dramaId}` : '';
  const inviteUrl = shareCode ? `${baseUrl}/?invite=${shareCode}` : '';

  const currentUrl = shareType === 'drama' ? dramaUrl : inviteUrl;

  // 上报分享事件到后端（发放积分奖励）
  const reportShare = async () => {
    try {
      const result = await shareApi.share(
        shareType === 'drama' ? dramaId || undefined : undefined,
        shareType
      );
      if (result.balance !== undefined) {
        setShareReward(`分享成功，+积分！今日剩余 ${result.remaining} 次`);
      }
    } catch (e: any) {
      // 分享上限等情况不阻断用户操作
      if (e.message?.includes('上限')) {
        setShareReward(e.message);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // 上报分享
      reportShare();
    } catch {
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      reportShare();
    }
  };

  const handleShareWechat = () => {
    handleCopy();
    alert('链接已复制，请打开微信粘贴发送给好友');
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <h2 className="share-title">分享给好友</h2>

        {/* 分享类型切换 */}
        {dramaId && (
          <div className="share-tabs">
            <button
              className={`share-tab ${shareType === 'drama' ? 'active' : ''}`}
              onClick={() => setShareType('drama')}
            >
              分享短剧
            </button>
            <button
              className={`share-tab ${shareType === 'invite' ? 'active' : ''}`}
              onClick={() => setShareType('invite')}
            >
              邀请注册
            </button>
          </div>
        )}

        {shareType === 'drama' && (
          <div className="share-drama-info">
            <span className="share-drama-name">{dramaTitle || '推荐短剧'}</span>
          </div>
        )}

        {shareType === 'invite' && (
          <div className="share-invite-info">
            <p>邀请好友注册，你和好友都能获得积分奖励！</p>
            <div className="share-code-display">
              <span className="share-code-label">我的邀请码：</span>
              <span className="share-code-value">{shareCode || '---'}</span>
            </div>
          </div>
        )}

        {/* 分享链接 */}
        <div className="share-url-box">
          <input
            className="share-url-input"
            value={currentUrl}
            readOnly
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          <button
            className={`btn-copy ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>

        {/* 分享平台 */}
        <div className="share-platforms">
          <button className="share-platform-btn" onClick={handleShareWechat}>
            <span className="platform-icon wechat">微</span>
            <span>微信好友</span>
          </button>
          <button className="share-platform-btn" onClick={handleCopy}>
            <span className="platform-icon weibo">博</span>
            <span>复制链接</span>
          </button>
        </div>

        {/* 分享奖励提示 */}
        {shareReward && (
          <div className="share-reward-info">
            <span>{shareReward}</span>
          </div>
        )}
      </div>
    </div>
  );
}
