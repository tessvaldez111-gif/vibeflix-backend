import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, userApi } from '../services/api';
import type { Drama, PaginatedResponse, User } from '../services/api';
import { useDebounce, usePagination } from '../hooks/useUtils';
import AuthModal from '../components/AuthModal';
import UserMenu from '../components/UserMenu';

interface Category {
  id: number;
  name: string;
  icon: string | null;
}

export default function Home() {
  const navigate = useNavigate();
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedKeyword = useDebounce(keyword, 500);
  const { page, totalPages, setTotalPages, goPage } = usePagination();

  // Auth state
  const [user, setUser] = useState<(User & { token: string }) | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showAuth, setShowAuth] = useState(false);

  // Check stored auth on mount
  useEffect(() => {
    const stored = userApi.getStoredUser();
    if (stored) setUser(stored);
  }, []);

  // Load categories from categories table (not genres from dramas table)
  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {
      setError('加载分类失败');
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.getDramas({
      keyword: debouncedKeyword,
      categoryId: selectedCategoryId ?? undefined,
      page,
      pageSize: 12,
    })
      .then((data: PaginatedResponse<Drama>) => {
        setDramas(data.list);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => {
        setError('加载短剧列表失败，请检查网络连接');
        setDramas([]);
      })
      .finally(() => setLoading(false));
  }, [debouncedKeyword, selectedCategoryId, page]);

  const handleAuthSuccess = (data: User & { token: string }) => {
    setUser(data);
    setShowAuth(false);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="home">
      {/* Nav */}
      <nav className="nav-bar">
        <div className="nav-brand" onClick={() => navigate('/')}>
          <span className="nav-logo">🎬</span>
          <span className="nav-title">短剧大放送</span>
        </div>
        <div className="nav-right">
          {user ? (
            <UserMenu user={user} onLogout={handleLogout} />
          ) : (
            <div className="nav-auth">
              <button className="nav-btn" onClick={() => { setAuthMode('login'); setShowAuth(true); }}>登录</button>
              <button className="nav-btn nav-btn-primary" onClick={() => { setAuthMode('register'); setShowAuth(true); }}>注册</button>
            </div>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuth(false)}
          onSwitch={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>短剧大放送</h1>
          <p>海量短剧，精彩不停</p>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜索短剧..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); goPage(1); }}
            />
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="content">
        <div className="filters">
          <button
            className={`filter-tag ${!selectedCategoryId ? 'active' : ''}`}
            onClick={() => { setSelectedCategoryId(null); goPage(1); }}
          >
            全部
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`filter-tag ${selectedCategoryId === c.id ? 'active' : ''}`}
              onClick={() => { setSelectedCategoryId(c.id); goPage(1); }}
            >
              {c.icon || ''} {c.name}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <div className="error-message">{error}</div>}

        {/* Results info */}
        {!error && (
          <div className="results-info">
            <span>共 {total} 部短剧</span>
          </div>
        )}

        {/* Drama Grid */}
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            <p>加载中...</p>
          </div>
        ) : !error && dramas.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📭</div>
            <p>没有找到相关短剧</p>
          </div>
        ) : (
          <div className="drama-grid">
            {dramas.map((drama) => (
              <div
                key={drama.id}
                className="drama-card"
                onClick={() => navigate(`/drama/${drama.id}`)}
              >
                <div className="drama-cover">
                  <img
                    src={api.getCoverUrl(drama.cover_image)}
                    alt={drama.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml,' +
                        encodeURIComponent(
                          '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect fill="%231a1a2e" width="300" height="400"/><text x="150" y="190" text-anchor="middle" fill="%23667eea" font-size="48">🎬</text><text x="150" y="240" text-anchor="middle" fill="%23666" font-size="14">' +
                            drama.title +
                            '</text></svg>'
                        );
                    }}
                  />
                  <div className={`drama-badge ${drama.status}`}>
                    {drama.status === 'ongoing' ? '连载中' : '已完结'}
                  </div>
                  <div className="drama-count">{drama.episode_count}集</div>
                </div>
                <div className="drama-info">
                  <h3>{drama.title}</h3>
                  <p className="drama-genre">{drama.genre}</p>
                  <p className="drama-desc">{drama.description?.substring(0, 50)}{drama.description?.length > 50 ? '...' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
            >
              上一页
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`page-btn ${page === pageNum ? 'active' : ''}`}
                  onClick={() => goPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
