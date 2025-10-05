import notifee from '@notifee/react-native';

export async function getPermissionState() {
  const s = await notifee.getNotificationSettings();
  const authorized = s.authorizationStatus === notifee.AuthorizationStatus.AUTHORIZED;
  const exact = s?.android?.alarm === notifee.AndroidNotificationSetting.ENABLED;
  return { authorized, exact };
}

export async function requestInteractive() {
  await notifee.requestPermission();
  return getPermissionState();
}

export async function openAlarmSettings() {
  try { await notifee.openAlarmPermissionSettings(); } catch {}
}