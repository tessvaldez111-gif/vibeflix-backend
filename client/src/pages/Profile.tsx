import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { userApi, interactionApi, pointsApi, api } from '../services/api';
import type { User, WatchHistoryItem, PointsInfo, PointsLogItem, OrderItem, Drama } from '../services/api';
import { usePagination } from '../hooks/useUtils';

type Tab = 'history' | 'favorites' | 'points' | 'orders';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<(User & { token: string }) | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('history');

  // History
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState<Drama[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  // Points
  const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null);
  const [pointsLog, setPointsLog] = useState<PointsLogItem[]>([]);
  const [pointsLogTotal, setPointsLogTotal] = useState(0);
  const { page: logPage, totalPages: logTotalPages, setTotalPages: setLogTotalPages, goPage: goLogPage } = usePagination();
  const [logLoading, setLogLoading] = useState(false);

  // Orders
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const { page: orderPage, totalPages: orderTotalPages, setTotalPages: setOrderTotalPages, goPage: goOrderPage } = usePagination();
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Validate auth on mount
  useEffect(() => {
    const stored = userApi.getStoredUser();
    if (!stored) {
      navigate('/');
      return;
    }
    setUser(stored);
    userApi.validateToken().then(validated => {
      if (validated) setUser({ ...validated, token: stored.token });
      else { userApi.logout(); navigate('/'); }
    });
  }, [navigate]);

  // Load data when tab or user changes
  useEffect(() => {
    if (!user) return;
    loadTabData(activeTab);
  }, [activeTab, user, logPage, orderPage]);

  const loadTabData = (tab: Tab) => {
    switch (tab) {
      case 'history':
        loadHistory();
        break;
      case 'favorites':
        loadFavorites();
        break;
      case 'points':
        loadPoints();
        break;
      case 'orders':
        loadOrders();
        break;
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await interactionApi.getHistory();
      setHistory(data);
    } catch {}
    setHistoryLoading(false);
  };

  const loadFavorites = async () => {
    setFavoritesLoading(true);
    try {
      const data = await interactionApi.getFavorites('favorite');
      setFavorites(data);
    } catch {}
    setFavoritesLoading(false);
  };

  const loadPoints = async () => {
    setLogLoading(true);
    try {
      const [info, logResult] = await Promise.all([
        pointsApi.getMyPoints(),
        pointsApi.getMyLog(logPage, 10),
      ]);
      setPointsInfo(info);
      setPointsLog(logResult.list);
      setPointsLogTotal(logResult.total);
      setLogTotalPages(logResult.totalPages);
    } catch {}
    setLogLoading(false);
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const result = await pointsApi.getMyOrders(orderPage, 10);
      setOrders(result.list);
      setOrdersTotal(result.total);
      setOrderTotalPages(result.totalPages);
    } catch {}
    setOrdersLoading(false);
  };

  const handleClearHistory = async () => {
    if (!window.confirm('确定清空所有观看历史？')) return;
    try {
      await interactionApi.clearHistory();
      setHistory([]);
    } catch {}
  };

  const handleRemoveFavorite = async (dramaId: number) => {
    try {
      await interactionApi.removeFavorite(dramaId, 'favorite');
      setFavorites(prev => prev.filter(d => d.id !== dramaId));
    } catch {}
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatOrderStatus = (status: string) => {
    const map: Record<string, { text: string; cls: string }> = {
      paid: { text: '已完成', cls: 'status-paid' },
      pending: { text: '待支付', cls: 'status-pending' },
      cancelled: { text: '已取消', cls: 'status-cancelled' },
      expired: { text: '已过期', cls: 'status-cancelled' },
    };
    return map[status] || { text: status, cls: '' };
  };

  const formatSourceType = (source: string) => {
    const map: Record<string, string> = {
      signin: '每日签到',
      register: '注册奖励',
      purchase: '购买剧集',
      recharge: '充值',
      admin_add: '管理员增加',
      admin_subtract: '管理员扣减',
      refund: '退款',
    };
    return map[source] || source;
  };

  if (!user) return null;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'history', label: '观看历史', icon: '📺' },
    { key: 'favorites', label: '我的收藏', icon: '❤️' },
    { key: 'points', label: '积分明细', icon: '💎' },
    { key: 'orders', label: '订单记录', icon: '📋' },
  ];

  return (
    <div className="profile-page">
      <nav className="nav-bar">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <span className="nav-logo">🎬</span>
          <span className="nav-title">短剧大放送</span>
        </div>
        <div className="nav-right">
          <Link to="/" className="nav-btn">首页</Link>
        </div>
      </nav>

      <div className="profile-content">
        {/* User Info Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            {(user.nickname || user.username).charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h2>{user.nickname || user.username}</h2>
            <p className="profile-meta">
              {user.role === 'admin' ? '管理员' : '用户'}
              {user.email && ` · ${user.email}`}
            </p>
            {pointsInfo && (
              <p className="profile-points">
                💎 <strong>{pointsInfo.balance}</strong> 积分
                <span className="profile-points-detail">
                  (累计获得 {pointsInfo.total_earned} · 已消费 {pointsInfo.total_spent})
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`profile-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="profile-tab-content">
          {/* ===== Watch History ===== */}
          {activeTab === 'history' && (
            <div className="tab-panel">
              {historyLoading ? (
                <div className="loading"><div className="spinner" /><p>加载中...</p></div>
              ) : history.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📺</div>
                  <p>暂无观看历史</p>
                  <Link to="/" className="nav-btn nav-btn-primary" style={{ marginTop: 16, textDecoration: 'none', display: 'inline-block' }}>
                    去看看
                  </Link>
                </div>
              ) : (
                <>
                  <div className="tab-panel-header">
                    <span>{history.length} 条记录</span>
                    <button className="btn-text-danger" onClick={handleClearHistory}>清空历史</button>
                  </div>
                  <div className="history-list">
                    {history.map(item => (
                      <Link to={`/drama/${item.drama_id}`} key={item.id} className="history-item">
                        <div className="history-cover">
                          <img src={api.getCoverUrl(item.drama_cover)} alt="" onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }} />
                        </div>
                        <div className="history-info">
                          <h4>{item.drama_title}</h4>
                          <p>看到第{item.episode_number}集{item.episode_title ? ` · ${item.episode_title}` : ''}</p>
                          <p className="history-progress">
                            {Math.floor(item.progress / 60)}:{(Math.floor(item.progress) % 60).toString().padStart(2, '0')}
                            / {Math.floor(item.duration / 60)}:{(Math.floor(item.duration) % 60).toString().padStart(2, '0')}
                          </p>
                        </div>
                        <span className="history-time">{formatTime(item.updated_at)}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== Favorites ===== */}
          {activeTab === 'favorites' && (
            <div className="tab-panel">
              {favoritesLoading ? (
                <div className="loading"><div className="spinner" /><p>加载中...</p></div>
              ) : favorites.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">❤️</div>
                  <p>暂无收藏</p>
                  <Link to="/" className="nav-btn nav-btn-primary" style={{ marginTop: 16, textDecoration: 'none', display: 'inline-block' }}>
                    去发现
                  </Link>
                </div>
              ) : (
                <>
                  <div className="tab-panel-header">
                    <span>{favorites.length} 部收藏</span>
                  </div>
                  <div className="drama-grid">
                    {favorites.map(drama => (
                      <div key={drama.id} className="drama-card">
                        <div className="drama-cover" onClick={() => navigate(`/drama/${drama.id}`)}>
                          <img
                            src={api.getCoverUrl(drama.cover_image)}
                            alt={drama.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,' +
                                encodeURIComponent(
                                  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect fill="%231a1a2e" width="300" height="400"/><text x="150" y="200" text-anchor="middle" fill="%23667eea" font-size="48">🎬</text></svg>'
                                );
                            }}
                          />
                          <div className={`drama-badge ${drama.status}`}>
                            {drama.status === 'ongoing' ? '连载中' : '已完结'}
                          </div>
                        </div>
                        <div className="drama-info">
                          <h3 onClick={() => navigate(`/drama/${drama.id}`)} style={{ cursor: 'pointer' }}>{drama.title}</h3>
                          <p className="drama-genre">{drama.genre}</p>
                          <div className="favorite-actions">
                            <Link to={`/drama/${drama.id}`} className="nav-btn" style={{ textDecoration: 'none', fontSize: 12, padding: '4px 10px' }}>
                              去看
                            </Link>
                            <button
                              className="btn-text-danger"
                              onClick={() => handleRemoveFavorite(drama.id)}
                              style={{ fontSize: 12 }}
                            >
                              取消收藏
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== Points ===== */}
          {activeTab === 'points' && (
            <div className="tab-panel">
              {logLoading && !pointsLog.length ? (
                <div className="loading"><div className="spinner" /><p>加载中...</p></div>
              ) : (
                <>
                  <div className="points-summary">
                    <div className="points-summary-item">
                      <span className="points-summary-label">当前余额</span>
                      <span className="points-summary-value">{pointsInfo?.balance ?? '...'}</span>
                    </div>
                    <div className="points-summary-item">
                      <span className="points-summary-label">累计获得</span>
                      <span className="points-summary-value earn">{pointsInfo?.total_earned ?? '...'}</span>
                    </div>
                    <div className="points-summary-item">
                      <span className="points-summary-label">累计消费</span>
                      <span className="points-summary-value spend">{pointsInfo?.total_spent ?? '...'}</span>
                    </div>
                  </div>
                  <h3 style={{ margin: '20px 0 12px', fontSize: 16 }}>积分流水</h3>
                  {pointsLog.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">💎</div>
                      <p>暂无积分记录</p>
                    </div>
                  ) : (
                    <>
                      <div className="points-log-list">
                        {pointsLog.map(log => (
                          <div key={log.id} className={`points-log-item ${log.type}`}>
                            <div className="points-log-left">
                              <span className={`points-log-amount ${log.type === 'earn' || log.type === 'refund' || log.type === 'admin_add' ? 'positive' : 'negative'}`}>
                                {log.type === 'earn' || log.type === 'refund' || log.type === 'admin_add' ? '+' : '-'}{log.amount}
                              </span>
                              <span className="points-log-desc">{log.description}</span>
                            </div>
                            <div className="points-log-right">
                              <span className="points-log-source">{formatSourceType(log.source)}</span>
                              <span className="points-log-balance">余额 {log.balance_after}</span>
                              <span className="points-log-time">{formatTime(log.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {logTotalPages > 1 && (
                        <div className="pagination" style={{ marginTop: 20 }}>
                          <button className="page-btn" disabled={logPage <= 1} onClick={() => goLogPage(logPage - 1)}>上一页</button>
                          <span style={{ padding: '0 12px', color: '#999' }}>{logPage}/{logTotalPages}</span>
                          <button className="page-btn" disabled={logPage >= logTotalPages} onClick={() => goLogPage(logPage + 1)}>下一页</button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== Orders ===== */}
          {activeTab === 'orders' && (
            <div className="tab-panel">
              {ordersLoading && !orders.length ? (
                <div className="loading"><div className="spinner" /><p>加载中...</p></div>
              ) : (
                <>
                  <div className="tab-panel-header">
                    <span>共 {ordersTotal} 笔订单</span>
                  </div>
                  {orders.length === 0 ? (
                    <div className="empty">
                      <div className="empty-icon">📋</div>
                      <p>暂无订单记录</p>
                    </div>
                  ) : (
                    <>
                      <div className="order-list">
                        {orders.map(order => {
                          const st = formatOrderStatus(order.status);
                          return (
                            <div key={order.id} className="order-item">
                              <div className="order-header">
                                <span className="order-no">{order.order_no}</span>
                                <span className={`order-status ${st.cls}`}>{st.text}</span>
                              </div>
                              <div className="order-body">
                                <div className="order-detail">
                                  <span className="order-type">{order.type === 'recharge' ? '积分充值' : '剧集购买'}</span>
                                  {order.type === 'recharge' && order.points_amount > 0 && (
                                    <span className="order-amount">+{order.points_amount} 积分</span>
                                  )}
                                  {order.type === 'purchase' && order.points_cost > 0 && (
                                    <span className="order-amount">-{order.points_cost} 积分</span>
                                  )}
                                </div>
                                <div className="order-price">
                                  {order.total_amount > 0 ? `$${parseFloat(String(order.total_amount)).toFixed(2)}` : '免费'}
                                </div>
                              </div>
                              <div className="order-footer">
                                <span>{formatTime(order.created_at)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {orderTotalPages > 1 && (
                        <div className="pagination" style={{ marginTop: 20 }}>
                          <button className="page-btn" disabled={orderPage <= 1} onClick={() => goOrderPage(orderPage - 1)}>上一页</button>
                          <span style={{ padding: '0 12px', color: '#999' }}>{orderPage}/{orderTotalPages}</span>
                          <button className="page-btn" disabled={orderPage >= orderTotalPages} onClick={() => goOrderPage(orderPage + 1)}>下一页</button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
