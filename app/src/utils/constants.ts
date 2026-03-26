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

// Theme Colors (Material 3 inspired)
export const COLORS = {
  primary: '#6750A4',
  primaryLight: '#D0BCFF',
  onPrimary: '#FFFFFF',
  secondary: '#625B71',
  secondaryContainer: '#E8DEF8',
  background: '#1C1B1F',
  surface: '#2B2930',
  onSurface: '#E6E1E5',
  onSurfaceVariant: '#CAC4D0',
  outline: '#938F99',
  error: '#F2B8B5',
  onError: '#601410',
  success: '#7DDC88',
  warning: '#FFD666',
  gold: '#FFB800',
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
