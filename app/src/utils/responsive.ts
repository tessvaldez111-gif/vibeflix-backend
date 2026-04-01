// ===== Responsive Design Utilities =====
// Based on a design baseline of 375x812 (iPhone X/11/12/13/14 standard)
import { Dimensions, Platform, PixelRatio } from 'react-native';

// Design baseline dimensions
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Get current screen dimensions (always fresh)
export const getScreenWidth = () => Dimensions.get('window').width;
export const getScreenHeight = () => Dimensions.get('window').height;

// Responsive scaling - uses width scale to prevent over-stretching on wide screens
export const scale = (size: number): number => {
  return Math.round(size * (getScreenWidth() / BASE_WIDTH));
};

// Vertical scaling (for height-dependent elements)
export const verticalScale = (size: number): number => {
  return Math.round(size * (getScreenHeight() / BASE_HEIGHT));
};

// Moderate scale - less aggressive, good for font sizes and icons
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return Math.round(size + (scale(size) - size) * factor);
};

// Responsive font size - respects the user's system font size setting
export const rf = (size: number): number => {
  const moderatedSize = moderateScale(size, 0.5);
  // Respect system font scale, but cap it to prevent extreme sizes
  const systemScale = Math.min(PixelRatio.getFontScale(), 1.3);
  return Math.round(moderatedSize * systemScale);
};

// Responsive spacing - percentage-based for common spacing values
export const rsp = (percentage: number): number => {
  return Math.round((getScreenWidth() * percentage) / 100);
};

// Responsive width (percentage of screen width)
export const rw = (percentage: number): number => {
  return (getScreenWidth() * percentage) / 100;
};

// Responsive height (percentage of screen height)
export const rh = (percentage: number): number => {
  return (getScreenHeight() * percentage) / 100;
};

// Platform-specific status bar height (dynamic function, not static value)
export const getStatusBarHeight = (): number =>
  Platform.OS === 'android'
    ? 0 // Android StatusBar renders on top of content; padding handled by SafeAreaView
    : 50;

// Safe area helpers - dynamic functions
export const isSmallDevice = (): boolean => getScreenWidth() < 360;
export const isLargeDevice = (): boolean => getScreenWidth() >= 414;

// ===== Responsive SPACING values (dynamic function) =====
// Returns an object of spacing values scaled to current screen width
export const getSpacing = () => ({
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
});

// ===== Common responsive values (dynamic function) =====
// Call this inside components to get fresh values on every render
export const getResponsive = () => ({
  // Spacing
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),

  // Border radius
  smRadius: scale(8),
  mdRadius: scale(12),
  lgRadius: scale(16),
  xlRadius: scale(20),
  fullRadius: scale(999),

  // Font sizes
  xsFont: rf(10),
  smFont: rf(12),
  mdFont: rf(14),
  lgFont: rf(16),
  xlFont: rf(18),
  xxlFont: rf(20),
  titleFont: rf(24),
  heroFont: rf(28),
  logoFont: rf(36),

  // Icon sizes
  smIcon: scale(16),
  mdIcon: scale(22),
  lgIcon: scale(28),
  xlIcon: scale(36),

  // Button sizes
  btnHeight: verticalScale(48),
  inputHeight: verticalScale(50),

  // Card
  cardRadius: scale(12),
  cardPadding: scale(12),

  // Avatar
  smAvatar: scale(36),
  mdAvatar: scale(48),
  lgAvatar: scale(64),
  xlAvatar: scale(80),
});

// ===== Backward-compatible static RESPONSIVE object =====
// DEPRECATED: These are computed at module load time and will NOT update on rotation/resize.
// Prefer using getResponsive() or calling scale()/rf() directly inside components.
export const RESPONSIVE = getResponsive();

// Backward-compatible statusBarHeight static value
export const statusBarHeight = getStatusBarHeight();
