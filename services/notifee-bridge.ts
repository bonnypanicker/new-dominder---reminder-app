import { Platform } from 'react-native';

let notifeeInstance: any = null;

export function getNotifee(): any | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  if (notifeeInstance) {
    return notifeeInstance;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    notifeeInstance = require('@notifee/react-native').default;
    return notifeeInstance;
  } catch (e) {
    console.warn('Notifee not available, running in Expo Go/web or without native module.', e);
    return null;
  }
}
