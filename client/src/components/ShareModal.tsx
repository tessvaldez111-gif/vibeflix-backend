import { useState } from 'react';
import { shareApi } from '../services/api';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  dramaId?: number | null;
  dramaTitle?: string;
  dramaCover?: string;
  shareCode?: string;
}

export default function ShareModal({ open, onClose, dramaId, dramaTitle, dramaCover, shareCode }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareType, setShareType] = useState<'drama' | 'invite'>(dramaId ? 'drama' : 'invite');
  const [shareReward, setShareReward] = useState<string | null>(null);

  const baseUrl = window.location.origin;
  const dramaUrl = dramaId ? `${baseUrl}/drama/${dramaId}` : '';
  const inviteUrl = shareCode ? `${baseUrl}/?invite=${shareCode}` : '';
  const currentUrl = shareType === 'drama' ? dramaUrl : inviteUrl;
  const encodedUrl = encodeURIComponent(currentUrl);
  const shareText = dramaTitle ? `Check out "${dramaTitle}" - a great drama!` : 'Join me on this awesome drama platform!';
  const encodedText = encodeURIComponent(shareText);

  // Report share event for points
  const reportShare = async () => {
    try {
      const result = await shareApi.share(
        shareType === 'drama' ? dramaId || undefined : undefined,
        shareType
      );
      if (result.balance !== undefined) {
        setShareReward(`+Points! ${result.remaining} shares left today`);
      }
    } catch (e: any) {
      if (e.message?.includes('limit') || e.message?.includes('上限')) {
        setShareReward(e.message);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  // Share platform URLs
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`,
  };

  const handleShareClick = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    reportShare();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <h2 className="share-title">Share</h2>

        {/* Share type toggle */}
        {dramaId && (
          <div className="share-tabs">
            <button
              className={`share-tab ${shareType === 'drama' ? 'active' : ''}`}
              onClick={() => setShareType('drama')}
            >
              Share Drama
            </button>
            <button
              className={`share-tab ${shareType === 'invite' ? 'active' : ''}`}
              onClick={() => setShareType('invite')}
            >
              Invite Friends
            </button>
          </div>
        )}

        {shareType === 'drama' && (
          <div className="share-drama-info">
            {dramaCover && <img className="share-drama-cover" src={dramaCover} alt="" />}
            <span className="share-drama-name">{dramaTitle || 'Recommended Drama'}</span>
          </div>
        )}

        {shareType === 'invite' && (
          <div className="share-invite-info">
            <p>Invite friends to register and both of you earn bonus points!</p>
            <div className="share-code-display">
              <span className="share-code-label">Your invite code: </span>
              <span className="share-code-value">{shareCode || '---'}</span>
            </div>
          </div>
        )}

        {/* Share URL box */}
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
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Share platforms */}
        <div className="share-platforms">
          <button className="share-platform-btn" onClick={() => handleShareClick('facebook')}>
            <span className="platform-icon facebook">f</span>
            <span>Facebook</span>
          </button>
          <button className="share-platform-btn" onClick={() => handleShareClick('twitter')}>
            <span className="platform-icon twitter">X</span>
            <span>Twitter</span>
          </button>
          <button className="share-platform-btn" onClick={() => handleShareClick('whatsapp')}>
            <span className="platform-icon whatsapp">W</span>
            <span>WhatsApp</span>
          </button>
          <button className="share-platform-btn" onClick={() => handleShareClick('telegram')}>
            <span className="platform-icon telegram">T</span>
            <span>Telegram</span>
          </button>
          <button className="share-platform-btn" onClick={() => handleShareClick('line')}>
            <span className="platform-icon line">L</span>
            <span>LINE</span>
          </button>
          <button className="share-platform-btn" onClick={handleCopy}>
            <span className="platform-icon copy">C</span>
            <span>Copy Link</span>
          </button>
        </div>

        {/* Share reward */}
        {shareReward && (
          <div className="share-reward-info">
            <span>{shareReward}</span>
          </div>
        )}
      </div>
    </div>
  );
}
