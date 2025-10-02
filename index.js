let notifee;
try {
  notifee = require('@notifee/react-native').default;
} catch (e) {
  console.log('[index] notifee unavailable', e?.message ?? e);
}

import { AppRegistry } from 'react-native';

if (notifee && typeof notifee.onBackgroundEvent === 'function') {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    try {
      const { notification, pressAction } = detail ?? {};
      if (!notification || !pressAction) return;
      if (type === 1 && pressAction.id === 'snooze') {
        await notifee.cancelNotification?.(notification.id);
      } else if (type === 1 && pressAction.id === 'done') {
        await notifee.cancelNotification?.(notification.id);
      }
    } catch (err) {
      console.log('[index] backgroundEvent error', err);
    }
  });
}

function HeadlessCheck() {
  return null;
}

AppRegistry.registerComponent('main', () => HeadlessCheck);