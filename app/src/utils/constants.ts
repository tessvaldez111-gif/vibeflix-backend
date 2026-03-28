// ===== Constants =====

// App
export const APP_NAME = 'DramaFlix';

// API
export const DEFAULT_PAGE_SIZE = 20;
export const AUTO_SAVE_INTERVAL = 10; // seconds — auto save watch progress

// Player
export const PLAYER_CONTROLS_TIMEOUT = 3000; // ms
export const MIN_PROGRESS_SAVE = 5; // don't save if < 5s watched

// Points
export const FREE_EPISODES_DEFAULT = 3;
export const DAILY_SIGNIN_POINTS_DEFAULT = 10;

// Theme Colors (Hongguo-inspired warm palette)
export const COLORS = {
  primary: '#FF4757',        // Red-500 (Hongguo red)
  primaryLight: '#FF6B81',   // Red-400 (lighter accent)
  primaryDark: '#E8414F',    // Red-600 (deeper)
  onPrimary: '#FFFFFF',
  secondary: '#FF8C42',      // Orange-500 (warm accent)
  secondaryContainer: '#2D2420',
  background: '#0D0D0D',     // Near-black
  surface: '#1A1A1A',        // Dark surface
  surfaceLight: '#252525',   // Lighter surface for cards
  onSurface: '#F5F5F5',      // Near-white text
  onSurfaceVariant: '#999999', // Muted text
  outline: '#333333',        // Subtle border
  error: '#FF4757',
  onError: '#FFFFFF',
  success: '#2ED573',
  warning: '#FFA502',
  gold: '#FFD700',
  tabBarBg: '#111111',       // Tab bar background
  tabActive: '#FF4757',      // Active tab color
  tabInactive: '#666666',    // Inactive tab color
};

// Theme Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Genre colors for tags
export const GENRE_COLORS: Record<string, string> = {
  romance: '#FF6B8A',
  comedy: '#FFD93D',
  thriller: '#6C5CE7',
  action: '#FF6348',
  fantasy: '#00D2D3',
  drama: '#A29BFE',
  horror: '#636E72',
  mystery: '#2D3436',
};
