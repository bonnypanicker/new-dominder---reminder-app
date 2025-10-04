import notifee, { AuthorizationStatus } from '@notifee/react-native';
import { Platform, Alert, Linking } from 'react-native';

interface PermissionStatus {
  authorized: boolean;
  exact: boolean;
}

export async function ensurePermissions({ interactive = false }): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') {
    return { authorized: true, exact: true };
  }

  const settings = await notifee.getNotificationSettings();

  let authorized = settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  let exact = true; // Assume true until proven otherwise for older Android versions

  if (settings.android) {
    // Request POST_NOTIFICATIONS if not authorized and interactive
    if (!authorized && interactive) {
      const requestedSettings = await notifee.requestPermission();
      authorized = requestedSettings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    }

    // Check and request exact alarm permissions for Android 12+
    if (Platform.Version >= 31) { // Android 12 (API level 31)
      exact = settings.android.alarm === 1;

      if (!exact && interactive) {
        await notifee.openAlarmPermissionSettings();
        // User needs to manually grant, so we can't re-check immediately
        // We'll return false for exact and let the user re-trigger if needed
        exact = false;
      }
    }
  }

  return { authorized, exact };
}

export async function openHelpfulSystemScreens() {
  if (Platform.OS !== 'android') {
    return;
  }

  // Open notification settings
  await notifee.openNotificationSettings();

  // Open battery optimization settings if available (Android specific)
  if (Platform.Version >= 23) { // Android 6.0 (API level 23)
    const powerManagerInfo: any = await notifee.getPowerManagerInfo();
    if (powerManagerInfo && !powerManagerInfo.isBatteryOptimizationEnabled) {
      await notifee.openBatteryOptimizationSettings();
    }
  }
}
