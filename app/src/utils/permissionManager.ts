/**
 * Unified Permission Manager
 * 统一权限管理模块 — 封装设备信息、权限检查、权限申请、系统设置跳转
 *
 * 使用方式:
 *   import { permissionManager } from '@/utils/permissionManager';
 *   const granted = await permissionManager.request(AppPermission.NOTIFICATIONS);
 */

import { Platform, Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import {
  AppPermission,
  PermissionStatus,
  PermissionResult,
  PermissionRequestResult,
  PermissionMessages,
  DeviceInfo,
} from '../types/permission';

// ===== 权限提示文案配置 =====

const PERMISSION_MESSAGES: Record<AppPermission, PermissionMessages> = {
  [AppPermission.NOTIFICATIONS]: {
    name: '推送通知',
    reason: '需要推送通知权限以接收新剧更新和观看提醒',
    deniedTitle: '通知权限被拒绝',
    deniedMessage: '您已拒绝通知权限，将无法收到新剧更新和观看提醒。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.CAMERA]: {
    name: '相机',
    reason: '需要相机权限以拍摄头像或上传内容',
    deniedTitle: '相机权限被拒绝',
    deniedMessage: '您已拒绝相机权限。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.MEDIA_LIBRARY]: {
    name: '媒体库',
    reason: '需要媒体库权限以选择视频或照片',
    deniedTitle: '媒体库权限被拒绝',
    deniedMessage: '您已拒绝媒体库权限。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.PHOTOS]: {
    name: '照片',
    reason: '需要照片权限以选择和上传图片',
    deniedTitle: '照片权限被拒绝',
    deniedMessage: '您已拒绝照片权限。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.LOCATION]: {
    name: '位置',
    reason: '需要位置权限以提供本地化内容推荐',
    deniedTitle: '位置权限被拒绝',
    deniedMessage: '您已拒绝位置权限。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.LOCATION_FOREGROUND]: {
    name: '位置（前台）',
    reason: '需要位置权限以提供本地化内容推荐',
    deniedTitle: '位置权限被拒绝',
    deniedMessage: '您已拒绝位置权限。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.LOCATION_BACKGROUND]: {
    name: '位置（后台）',
    reason: '需要后台位置权限以持续提供本地化推荐',
    deniedTitle: '后台位置权限被拒绝',
    deniedMessage: '您已拒绝后台位置权限。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.AUDIO]: {
    name: '麦克风',
    reason: '需要麦克风权限以录制语音或视频',
    deniedTitle: '麦克风权限被拒绝',
    deniedMessage: '您已拒绝麦克风权限。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.CONTACTS]: {
    name: '通讯录',
    reason: '需要通讯录权限以查找好友',
    deniedTitle: '通讯录权限被拒绝',
    deniedMessage: '您已拒绝通讯录权限。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.CALENDAR]: {
    name: '日历',
    reason: '需要日历权限以添加观看提醒',
    deniedTitle: '日历权限被拒绝',
    deniedMessage: '您已拒绝日历权限。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.REMINDERS]: {
    name: '提醒事项',
    reason: '需要提醒事项权限以创建观看提醒',
    deniedTitle: '提醒事项权限被拒绝',
    deniedMessage: '您已拒绝提醒事项权限。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
  [AppPermission.STORAGE]: {
    name: '存储',
    reason: '需要存储权限以保存下载的视频和缓存',
    deniedTitle: '存储权限被拒绝',
    deniedMessage: '您已拒绝存储权限，可能影响视频下载和缓存功能。您可以在系统设置中手动开启。',
    settingsButtonText: '去设置',
    cancelButtonText: '暂不开启',
  },
};

// ===== 辅助：将 expo 权限状态映射为统一枚举 =====

function mapExpoStatus(
  expoStatus: Notifications.PermissionStatus | 'granted' | 'denied' | 'undetermined' | 'unavailable',
  canAskAgain: boolean
): PermissionStatus {
  if (expoStatus === 'granted') return PermissionStatus.GRANTED;
  if (expoStatus === 'denied' && !canAskAgain) return PermissionStatus.BLOCKED;
  if (expoStatus === 'denied' && canAskAgain) return PermissionStatus.DENIED;
  if (expoStatus === 'undetermined') return PermissionStatus.UNDETERMINED;
  if (expoStatus === 'unavailable') return PermissionStatus.UNAVAILABLE;
  return PermissionStatus.DENIED;
}

// ===== 设备信息 =====

let _deviceInfo: DeviceInfo | null = null;

export function getDeviceInfo(): DeviceInfo {
  if (_deviceInfo) return _deviceInfo;

  _deviceInfo = {
    platform: Platform.OS as 'ios' | 'android' | 'web',
    systemVersion: Platform.Version?.toString() ?? 'unknown',
    brand: Platform.OS === 'android'
      ? (Platform.constants?.Brand as string) ?? 'Android'
      : Platform.OS === 'ios'
        ? 'Apple'
        : 'Web',
    model: Platform.OS === 'android'
      ? (Platform.constants?.Model as string) ?? 'Unknown'
      : Platform.OS === 'ios'
        ? (Platform.constants?.Model as string) ?? 'iPhone'
        : 'Browser',
    appName: Application.applicationName ?? 'DramaFlix',
    appVersion: Application.nativeApplicationVersion ?? '1.0.0',
    buildNumber: Application.nativeBuildVersion ?? '1',
  };

  return _deviceInfo;
}

// ===== 权限管理核心 =====

class PermissionManager {
  // ----- 权限状态检查 -----

  /**
   * 检查权限当前状态
   * @returns PermissionStatus 枚举
   */
  async check(permission: AppPermission): Promise<PermissionStatus> {
    try {
      // 通知权限（最常用的，单独处理）
      if (permission === AppPermission.NOTIFICATIONS) {
        const status = await Notifications.getPermissionsAsync();
        return mapExpoStatus(status.status, status.canAskAgain);
      }

      // 其他权限需要对应模块
      if (Platform.OS === 'web') {
        return PermissionStatus.UNAVAILABLE;
      }

      // 未接入的权限暂返回未确定状态
      console.warn(`[PermissionManager] Permission not yet implemented: ${permission}`);
      return PermissionStatus.UNDETERMINED;
    } catch (error) {
      console.error(`[PermissionManager] Error checking ${permission}:`, error);
      return PermissionStatus.UNDETERMINED;
    }
  }

  /**
   * 检查权限并返回完整结果
   */
  async checkWithDetails(permission: AppPermission): Promise<PermissionResult> {
    try {
      if (permission === AppPermission.NOTIFICATIONS) {
        const result = await Notifications.getPermissionsAsync();
        return {
          status: mapExpoStatus(result.status, result.canAskAgain),
          granted: result.status === 'granted',
          canAskAgain: result.canAskAgain,
          expires: result.expires,
          isLimited: result.ios?.allowsLimitedAccess ?? false,
        };
      }

      // 未实现的权限
      const status = await this.check(permission);
      return {
        status,
        granted: status === PermissionStatus.GRANTED,
        canAskAgain: status === PermissionStatus.DENIED || status === PermissionStatus.UNDETERMINED,
        expires: 'never',
        isLimited: false,
      };
    } catch (error) {
      console.error(`[PermissionManager] Error checking details for ${permission}:`, error);
      return {
        status: PermissionStatus.UNDETERMINED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
        isLimited: false,
      };
    }
  }

  // ----- 权限申请 -----

  /**
   * 请求权限（核心方法）
   * 自动处理首次申请和被拒绝后引导跳转设置
   *
   * @param permission 权限类型
   * @param options.silent 是否静默模式（不弹提示，仅返回结果）
   * @returns 是否获得授权
   */
  async request(
    permission: AppPermission,
    options?: { silent?: boolean }
  ): Promise<boolean> {
    try {
      // 先检查当前状态
      const status = await this.check(permission);

      // 已授权，直接返回 true
      if (status === PermissionStatus.GRANTED) return true;

      // 设备不支持
      if (status === PermissionStatus.UNAVAILABLE) {
        if (!options?.silent) {
          console.warn(`[PermissionManager] ${PERMISSION_MESSAGES[permission].name} is not available on this device`);
        }
        return false;
      }

      // 已永久拒绝 → 弹出引导跳转设置（非静默模式）
      if (status === PermissionStatus.BLOCKED) {
        if (options?.silent) return false;
        return this._showSettingsDialog(permission);
      }

      // UNDETERMINED 或 DENIED（可再次申请）→ 发起权限请求
      const granted = await this._requestPermission(permission);

      // 如果仍然被拒绝且不可再申请 → 弹出引导（非静默模式）
      if (!granted) {
        const newStatus = await this.check(permission);
        if (newStatus === PermissionStatus.BLOCKED && !options?.silent) {
          return this._showSettingsDialog(permission);
        }
      }

      return granted;
    } catch (error) {
      console.error(`[PermissionManager] Error requesting ${permission}:`, error);
      return false;
    }
  }

  /**
   * 底层权限申请（直接调用系统弹窗）
   */
  private async _requestPermission(permission: AppPermission): Promise<boolean> {
    try {
      if (permission === AppPermission.NOTIFICATIONS) {
        const result = await Notifications.requestPermissionsAsync();
        return result.status === 'granted';
      }

      // 未实现的权限类型
      console.warn(`[PermissionManager] Direct request not yet implemented for: ${permission}`);
      return false;
    } catch (error) {
      console.error(`[PermissionManager] Error in _requestPermission for ${permission}:`, error);
      return false;
    }
  }

  // ----- 引导弹窗 -----

  /**
   * 弹出对话框引导用户跳转系统设置
   */
  private _showSettingsDialog(permission: AppPermission): Promise<boolean> {
    return new Promise((resolve) => {
      const messages = PERMISSION_MESSAGES[permission];

      Alert.alert(
        messages.deniedTitle,
        messages.deniedMessage,
        [
          {
            text: messages.cancelButtonText,
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: messages.settingsButtonText,
            onPress: async () => {
              await this.openSettings();
              // 跳转设置后不自动 resolve，让用户手动返回
              // 返回 false，由调用方决定是否重新检查
              resolve(false);
            },
          },
        ],
        { cancelable: false }
      );
    });
  }

  // ----- 跳转系统设置 -----

  /**
   * 打开应用系统设置页面
   */
  async openSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        // iOS: 跳转应用设置
        await Linking.openURL('app-settings:');
      } else if (Platform.OS === 'android') {
        // Android: 尝试打开应用详情设置
        await Linking.openSettings();
      } else {
        console.warn('[PermissionManager] Cannot open settings on this platform');
      }
    } catch (error) {
      console.error('[PermissionManager] Error opening settings:', error);
      // 降级处理：尝试通用 URL
      try {
        await Linking.openURL(
          Platform.OS === 'ios'
            ? 'app-settings:'
            : 'https://play.google.com/store/apps/details?id=com.dramaflix.app'
        );
      } catch {
        console.error('[PermissionManager] Fallback settings URL also failed');
      }
    }
  }

  // ----- 批量权限请求 -----

  /**
   * 批量请求多个权限
   * @returns 权限结果映射
   */
  async requestMultiple(
    permissions: AppPermission[],
    options?: { silent?: boolean }
  ): Promise<Record<AppPermission, boolean>> {
    const results: Record<string, boolean> = {};

    // 逐个请求（避免同时弹多个系统弹窗）
    for (const perm of permissions) {
      results[perm] = await this.request(perm, options);
    }

    return results as Record<AppPermission, boolean>;
  }

  // ----- 工具方法 -----

  /**
   * 获取权限的提示文案
   */
  getMessages(permission: AppPermission): PermissionMessages {
    return PERMISSION_MESSAGES[permission];
  }

  /**
   * 检查 Android 版本是否 >= targetVersion
   */
  isAndroidVersionAtLeast(major: number): boolean {
    if (Platform.OS !== 'android') return false;
    const version = parseInt(Platform.Version.toString(), 10);
    return version >= major;
  }

  /**
   * 获取 Android API Level
   */
  getAndroidApiLevel(): number | null {
    if (Platform.OS !== 'android') return null;
    return parseInt(Platform.Version.toString(), 10);
  }

  /**
   * 获取 iOS 系统版本
   */
  getIOSVersion(): string {
    if (Platform.OS !== 'ios') return '0';
    return Platform.Version.toString();
  }
}

// ===== 单例导出 =====
export const permissionManager = new PermissionManager();
export default permissionManager;
