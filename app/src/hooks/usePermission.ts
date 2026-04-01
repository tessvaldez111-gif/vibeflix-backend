/**
 * usePermission Hook
 * 权限管理 Hook — 封装 permissionManager 为 React Hook，方便页面组件使用
 *
 * 使用方式:
 *   const { status, granted, request, check, openSettings, deviceInfo, loading } = usePermission(AppPermission.NOTIFICATIONS);
 *   // 首次加载时自动检查权限状态
 *   // 需要申请时调用: const ok = await request();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { permissionManager, getDeviceInfo } from '../utils/permissionManager';
import {
  AppPermission,
  PermissionStatus,
  UsePermissionReturn,
} from '../types/permission';

export function usePermission(permission: AppPermission): UsePermissionReturn {
  const [status, setStatus] = useState<PermissionStatus>(PermissionStatus.UNDETERMINED);
  const [granted, setGranted] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // 首次加载时检查权限状态
  useEffect(() => {
    mountedRef.current = true;

    const initStatus = async () => {
      try {
        const details = await permissionManager.checkWithDetails(permission);
        if (mountedRef.current) {
          setStatus(details.status);
          setGranted(details.granted);
          setCanAskAgain(details.canAskAgain);
        }
      } catch (error) {
        console.error('[usePermission] Init check failed:', error);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initStatus();

    return () => {
      mountedRef.current = false;
    };
  }, [permission]);

  // 请求权限
  const request = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const result = await permissionManager.request(permission);
      if (mountedRef.current) {
        // 请求后刷新状态
        const details = await permissionManager.checkWithDetails(permission);
        setStatus(details.status);
        setGranted(details.granted);
        setCanAskAgain(details.canAskAgain);
      }
      return result;
    } catch (error) {
      console.error('[usePermission] Request failed:', error);
      return false;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [permission]);

  // 仅检查权限
  const check = useCallback(async (): Promise<PermissionStatus> => {
    try {
      const s = await permissionManager.check(permission);
      if (mountedRef.current) {
        setStatus(s);
        setGranted(s === PermissionStatus.GRANTED);
        setCanAskAgain(
          s === PermissionStatus.DENIED || s === PermissionStatus.UNDETERMINED
        );
      }
      return s;
    } catch (error) {
      console.error('[usePermission] Check failed:', error);
      return PermissionStatus.UNDETERMINED;
    }
  }, [permission]);

  // 跳转设置
  const openSettings = useCallback(async (): Promise<void> => {
    await permissionManager.openSettings();
  }, []);

  return {
    status,
    granted,
    canAskAgain,
    request,
    check,
    openSettings,
    deviceInfo: getDeviceInfo(),
    loading,
  };
}

export default usePermission;
