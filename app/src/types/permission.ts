/**
 * Unified Permission Types
 * 权限管理模块的类型定义
 */

// ===== 权限状态枚举 =====
export enum PermissionStatus {
  GRANTED = 'granted',           // 已授权
  DENIED = 'denied',             // 未授权（可再次申请）
  UNDETERMINED = 'undetermined', // 未确定（首次请求）
  BLOCKED = 'blocked',           // 永久拒绝（需跳转设置）
  UNAVAILABLE = 'unavailable',   // 设备不支持此权限
}

// ===== 权限结果 =====
export interface PermissionResult {
  status: PermissionStatus;
  granted: boolean;       // 是否已授权
  canAskAgain: boolean;   // 是否可以再次弹窗申请
  expires: string;        // 'never' | 时长字符串
  isLimited: boolean;     // iOS 14+ 有限权限（如照片）
}

// ===== 请求结果 =====
export interface PermissionRequestResult {
  status: PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
  isLimited: boolean;
}

// ===== 支持的权限类型 =====
export enum AppPermission {
  NOTIFICATIONS = 'notifications',
  CAMERA = 'camera',
  MEDIA_LIBRARY = 'mediaLibrary',
  PHOTOS = 'photos',
  LOCATION = 'location',
  LOCATION_FOREGROUND = 'locationForeground',
  LOCATION_BACKGROUND = 'locationBackground',
  AUDIO = 'audio',
  CONTACTS = 'contacts',
  CALENDAR = 'calendar',
  REMINDERS = 'reminders',
  STORAGE = 'storage',
}

// ===== 设备信息 =====
export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  systemVersion: string;
  brand: string;
  model: string;
  appName: string;
  appVersion: string;
  buildNumber: string;
}

// ===== 权限配置项 =====
export interface PermissionConfig {
  /** 权限标识 */
  permission: AppPermission;
  /** iOS 权限请求的说明文案 */
  iosReason?: string;
  /** Android 权限名称（用于检查） */
  androidPermission?: string;
}

// ===== 权限提示文案映射 =====
export interface PermissionMessages {
  /** 权限名称 */
  name: string;
  /** 权限用途说明 */
  reason: string;
  /** 权限被拒绝时的提示 */
  deniedTitle: string;
  /** 权限被拒绝时的正文 */
  deniedMessage: string;
  /** 跳转设置按钮文案 */
  settingsButtonText: string;
  /** 取消按钮文案 */
  cancelButtonText: string;
}

// ===== Hook 返回值 =====
export interface UsePermissionReturn {
  /** 当前权限状态 */
  status: PermissionStatus;
  /** 是否已授权 */
  granted: boolean;
  /** 是否可以再次弹窗 */
  canAskAgain: boolean;
  /** 请求权限（自动处理弹窗和跳转） */
  request: () => Promise<boolean>;
  /** 仅检查权限 */
  check: () => Promise<PermissionStatus>;
  /** 跳转系统设置 */
  openSettings: () => Promise<void>;
  /** 设备信息 */
  deviceInfo: DeviceInfo;
  /** 加载状态 */
  loading: boolean;
}
