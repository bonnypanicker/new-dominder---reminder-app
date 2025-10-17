import notifee, { AuthorizationStatus, AndroidNotificationSetting } from '@notifee/react-native';

export async function getPermissionState() {
  const s = await notifee.getNotificationSettings();
  const authorized = s.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  const exact = s?.android?.alarm === AndroidNotificationSetting.ENABLED;
  return { authorized, exact };
}

export async function requestInteractive() {
  await notifee.requestPermission();
  return getPermissionState();
}

export async function openAlarmSettings() {
  try { await notifee.openAlarmPermissionSettings(); } catch {}
}

import { Platform, Linking } from 'react-native';

export async function requestExactAlarmPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }
  
  try {
    const settings = await notifee.getNotificationSettings();
    const exactAlarmEnabled = settings?.android?.alarm === AndroidNotificationSetting.ENABLED;
    
    if (!exactAlarmEnabled) {
      console.log('[PermissionGate] Requesting SCHEDULE_EXACT_ALARM permission');
      await notifee.openAlarmPermissionSettings();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[PermissionGate] Error checking exact alarm permission:', error);
    return false;
  }
}