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