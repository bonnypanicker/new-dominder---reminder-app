import { Platform } from 'react-native';
import notifee from '@notifee/react-native';

let notifeeInstance: any = null;

export function getNotifee(): any | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  if (notifeeInstance) {
    return notifeeInstance;
  }

  try {
    notifeeInstance = notifee;
    return notifeeInstance;
  } catch (e) {
    console.warn('Notifee not available, running in Expo Go/web or without native module.', e);
    return null;
  }
}
