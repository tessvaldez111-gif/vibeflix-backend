import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, userApi, interactionApi, pointsApi, settingsApi, shareApi, vipApi } from '../services/api';
import type { DramaDetail, Episode, User, PointsInfo, PointsConfig, VipStatus } from '../services/api';
import { ApiError } from '../services/api';
import AuthModal from '../components/AuthModal';
import UserMenu from '../components/UserMenu';
import ShareModal from '../components/ShareModal';

export default function Player() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dramaId = Number(id);
  const [drama, setDrama] = useState<DramaDetail | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimerRef = useRef<number | null>(null);

  // Payment state
  const [pointsConfig, setPointsConfig] = useState<PointsConfig | null>(null);
  const [userPoints, setUserPoints] = useState<PointsInfo | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null); // episode id being purchased
  const [purchaseError, setPurchaseError] = useState('');

  // Auth state
  const [user, setUser] = useState<(User & { token: string }) | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showAuth, setShowAuth] = useState(false);
  const [authReason, setAuthReason] = useState('');

  // Share state
  const [showShare, setShowShare] = useState(false);
  const [shareCode, setShareCode] = useState('');

  // VIP state
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);

  // Load user and validate token
  useEffect(() => {
    const stored = userApi.getStoredUser();
    if (stored) {
      setUser(stored);
      userApi.validateToken().then(validated => {
        if (validated) setUser({ ...validated, token: stored.token });
        else setUser(null);
      });
    }
  }, []);

  // Load VIP status and share code when user changes
  useEffect(() => {
    if (user) {
      vipApi.getStatus().then(setVipStatus).catch(() => {});
      shareApi.getCode().then(c => setShareCode(c.code)).catch(() => {});
    }
  }, [user]);

  // Load points config on mount
  useEffect(() => {
    settingsApi.getPointsConfig().then(setPointsConfig).catch(() => {});
  }, []);

  // Load user points when user changes
  useEffect(() => {
    if (user) {
      pointsApi.getMyPoints().then(p => setUserPoints(p)).catch(() => setUserPoints(null));
    } else {
      setUserPoints(null);
    }
  }, [user]);

  // Load drama detail
  useEffect(() => {
    if (!dramaId || isNaN(dramaId)) {
      setError('无效的短剧ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api.getDramaDetail(dramaId)
      .then((data) => {
        setDrama(data);
        if (data.episodes.length > 0) {
          setCurrentEpisode(data.episodes[0]);
        }
      })
      .catch(() => {
        setError('加载短剧信息失败');
      })
      .finally(() => setLoading(false));
  }, [dramaId]);

  // Check favorite/like status when user or drama changes
  useEffect(() => {
    if (user && dramaId) {
      interactionApi.checkFavorite(dramaId, 'favorite').then(res => setIsFavorited(res.favorited)).catch(() => {});
      interactionApi.checkFavorite(dramaId, 'like').then(res => setIsLiked(res.favorited)).catch(() => {});
    } else {
      setIsFavorited(false);
      setIsLiked(false);
    }
  }, [user, dramaId]);

  // Record watch progress periodically
  useEffect(() => {
    if (!user || !videoRef.current || !currentEpisode) return;

    const saveProgress = () => {
      const video = videoRef.current;
      if (video && video.currentTime > 0 && video.duration > 0) {
        interactionApi.recordProgress({
          drama_id: dramaId,
          episode_id: currentEpisode.id,
          progress: Math.floor(video.currentTime),
          duration: Math.floor(video.duration),
        }).catch(() => {});
      }
    };

    progressTimerRef.current = window.setInterval(saveProgress, 10000);
    const handleUnload = () => saveProgress();
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      window.removeEventListener('beforeunload', handleUnload);
      saveProgress();
    };
  }, [user, dramaId, currentEpisode]);

  useEffect(() => {
    if (currentEpisode && videoRef.current) {
      videoRef.current.load();
    }
  }, [currentEpisode]);

  // ===== Payment Logic =====

  const isEpisodeFree = useCallback((ep: Episode): boolean => {
    if (ep.is_free) return true;
    // VIP 用户全免费
    if (vipStatus?.isVip) return true;
    // Check if within free episode count (first N episodes are free)
    if (pointsConfig && ep.episode_number <= pointsConfig.freeEpisodeCount) return true;
    return false;
  }, [pointsConfig, vipStatus]);

  const getEpisodePointsCost = useCallback((ep: Episode): number => {
    if (isEpisodeFree(ep)) return 0;
    return pointsConfig?.pointsPerEpisode || 10;
  }, [pointsConfig, isEpisodeFree]);

  const handlePurchaseEpisode = async (ep: Episode) => {
    if (!user) {
      setAuthReason('付费剧集需要登录后观看');
      setShowAuth(true);
      return;
    }

    const cost = getEpisodePointsCost(ep);
    const confirmMsg = `确认花费 ${cost} 积分解锁第${ep.episode_number}集？`;
    if (!window.confirm(confirmMsg)) return;

    setPurchaseLoading(String(ep.id));
    setPurchaseError('');

    try {
      const result = await pointsApi.purchaseEpisode(dramaId, ep.id, cost);
      setUserPoints(prev => prev ? { ...prev, balance: result.balance } : null);
      // Refresh drama detail to get updated episode info
      const updatedDrama = await api.getDramaDetail(dramaId);
      setDrama(updatedDrama);
      // Now play the purchased episode
      setCurrentEpisode(ep);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'LOGIN_REQUIRED') {
        setAuthReason('请先登录');
        setShowAuth(true);
      } else {
        setPurchaseError(err.message || '购买失败');
      }
    } finally {
      setPurchaseLoading(null);
    }
  };

  const playEpisode = (ep: Episode) => {
    // Check if episode is locked
    if (!isEpisodeFree(ep)) {
      // Already purchased? Check via current drama data - backend will verify on play
      // We let the getEpisodeAccess call handle the actual check
    }
    setCurrentEpisode(ep);
    setPurchaseError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const playNext = () => {
    if (!drama || !currentEpisode) return;
    const idx = drama.episodes.findIndex((e) => e.id === currentEpisode.id);
    if (idx < drama.episodes.length - 1) {
      playEpisode(drama.episodes[idx + 1]);
    }
  };

  const toggleFavorite = async () => {
    if (!user) return;
    try {
      if (isFavorited) {
        await interactionApi.removeFavorite(dramaId, 'favorite');
        setIsFavorited(false);
      } else {
        await interactionApi.addFavorite(dramaId, 'favorite');
        setIsFavorited(true);
      }
    } catch {}
  };

  const toggleLike = async () => {
    if (!user) return;
    try {
      if (isLiked) {
        await interactionApi.removeFavorite(dramaId, 'like');
        setIsLiked(false);
        if (drama) setDrama({ ...drama, like_count: Math.max(0, drama.like_count - 1) });
      } else {
        await interactionApi.addFavorite(dramaId, 'like');
        setIsLiked(true);
        if (drama) setDrama({ ...drama, like_count: drama.like_count + 1 });
      }
    } catch {}
  };

  const handleAuthSuccess = (data: User & { token: string }) => {
    setUser(data);
    setShowAuth(false);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (error || !drama) {
    return (
      <div className="empty">
        <div className="empty-icon">😕</div>
        <p>{error || '短剧不存在'}</p>
        <button className="btn-back" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  return (
    <div className="player-page">
      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          mode={authMode}
          onClose={() => { setShowAuth(false); setAuthReason(''); }}
          onSwitch={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          onSuccess={handleAuthSuccess}
          reason={authReason}
        />
      )}

      {/* Share Modal */}
      {showShare && (
        <ShareModal
          open={showShare}
          onClose={() => setShowShare(false)}
          dramaId={dramaId}
          dramaTitle={drama?.title}
          shareCode={shareCode}
        />
      )}

      <nav className="nav-bar">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <span className="nav-logo">🎬</span>
          <span className="nav-title">短剧大放送</span>
        </div>
        <div className="nav-right">
          {user ? (
            <UserMenu
              user={user}
              onLogout={() => setUser(null)}
              onPointsUpdate={(balance) => setUserPoints(prev => prev ? { ...prev, balance } : null)}
            />
          ) : (
            <div className="nav-auth">
              <button className="nav-btn" onClick={() => { setAuthMode('login'); setShowAuth(true); }}>登录</button>
              <button className="nav-btn nav-btn-primary" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>注册</button>
            </div>
          )}
        </div>
      </nav>

      <button className="btn-back" onClick={() => navigate('/')}>
        ← 返回首页
      </button>

      <div className="player-layout">
        {/* Video Player */}
        <div className="player-main">
          <div className="video-container">
            {currentEpisode ? (
              <video
                ref={videoRef}
                controls
                autoPlay
                className="video-player"
                onEnded={playNext}
              >
                <source
                  src={api.getVideoUrl(currentEpisode.video_path)}
                  type={api.getVideoMimeType(currentEpisode.video_path)}
                />
                您的浏览器不支持视频播放
              </video>
            ) : (
              <div className="no-video">
                <div className="empty-icon">🎥</div>
                <p>暂无剧集，敬请期待</p>
              </div>
            )}
          </div>

          {/* Purchase Error */}
          {purchaseError && (
            <div className="error-message" style={{ marginBottom: 12 }}>{purchaseError}</div>
          )}

          {/* Drama Info */}
          <div className="drama-detail-info">
            <h1>{drama.title}</h1>
            <div className="drama-meta">
              <span className="meta-tag">{drama.genre}</span>
              <span className={`status-tag ${drama.status}`}>
                {drama.status === 'ongoing' ? '连载中' : drama.status === 'completed' ? '已完结' : '草稿'}
              </span>
              <span>共 {drama.episode_count} 集</span>
              {drama.view_count > 0 && <span>{drama.view_count} 次播放</span>}
              {drama.rating > 0 && <span>⭐ {drama.rating.toFixed(1)}</span>}
            </div>
            {/* Points info bar */}
            {user && pointsConfig && (
              <div className="points-info-bar">
                {vipStatus?.isVip ? (
                  <span className="vip-info-badge">👑 VIP会员 · 全部剧集免费</span>
                ) : (
                  <>
                    <span>当前积分: <strong>{userPoints?.balance ?? '...'}</strong></span>
                    <span>每集 {pointsConfig.pointsPerEpisode} 积分</span>
                    <span>前 {pointsConfig.freeEpisodeCount} 集免费</span>
                  </>
                )}
              </div>
            )}
            {/* Action buttons */}
            <div className="drama-actions">
              <button
                className={`action-btn ${isFavorited ? 'active' : ''}`}
                onClick={toggleFavorite}
                title={user ? (isFavorited ? '取消收藏' : '收藏') : '登录后收藏'}
              >
                {isFavorited ? '❤️' : '🤍'} 收藏
              </button>
              <button
                className={`action-btn ${isLiked ? 'active' : ''}`}
                onClick={toggleLike}
                title={user ? (isLiked ? '取消喜欢' : '喜欢') : '登录后喜欢'}
              >
                {isLiked ? '👍' : '👍'} {drama.like_count}
              </button>
              {user && (
                <Link to="/profile" className="action-btn" style={{ textDecoration: 'none' }}>
                  📋 个人中心
                </Link>
              )}
              <button
                className="action-btn"
                onClick={() => setShowShare(true)}
                title="分享"
              >
                🔗 分享
              </button>
            </div>
            <p className="drama-description">{drama.description || '暂无简介'}</p>
          </div>
        </div>

        {/* Episode List */}
        <div className="player-sidebar">
          <h3>选集 ({drama.episode_count || drama.episodes.length})</h3>
          <div className="episode-list">
            {drama.episodes.map((ep) => {
              const isFree = isEpisodeFree(ep);
              const cost = getEpisodePointsCost(ep);
              const isLocked = !isFree;
              const isActive = currentEpisode?.id === ep.id;
              const isPurchasing = purchaseLoading === String(ep.id);

              return (
                <button
                  key={ep.id}
                  className={`episode-btn ${isActive ? 'active' : ''} ${isLocked && !isActive ? 'locked' : ''}`}
                  onClick={() => isLocked ? handlePurchaseEpisode(ep) : playEpisode(ep)}
                  disabled={isPurchasing}
                >
                  <span className="ep-number">
                    第{ep.episode_number}集
                    {isLocked && <span className="ep-lock">🔒</span>}
                    {!isLocked && cost === 0 && ep.episode_number <= (pointsConfig?.freeEpisodeCount || 0) && (
                      <span className="ep-free">免费</span>
                    )}
                  </span>
                  <span className="ep-title">{ep.title || ''}</span>
                  {isLocked && (
                    <span className="ep-cost">{cost} 积分</span>
                  )}
                  {isPurchasing && (
                    <span className="ep-loading">...</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
