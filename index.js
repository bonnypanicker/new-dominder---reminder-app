import "expo-router/entry";
let notifee;
try {
  notifee = require('@notifee/react-native').default;
} catch (e) {
  console.log('[index] notifee unavailable', e?.message ?? e);
}

import { AppRegistry } from 'react-native';

if (notifee && typeof notifee.onBackgroundEvent === 'function') {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    console.log('[onBackgroundEvent] type:', type, 'detail:', detail);
    try {
      const { notification, pressAction } = detail ?? {};
      if (!notification) return;

      const reminderId = notification?.data?.reminderId;
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      if (type === 1 && pressAction) { // EventType.ACTION_PRESS
        const stored = await AsyncStorage.getItem('dominder_reminders');
        const list = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex((r) => r.id === reminderId);
        if (idx !== -1) {
          const nowIso = new Date().toISOString();
          if (pressAction.id === 'snooze') {
            list[idx] = {
              ...list[idx],
              snoozeUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              isExpired: false,
              lastTriggeredAt: list[idx].lastTriggeredAt ?? nowIso,
            };
          } else if (pressAction.id === 'done') {
            if (list[idx].repeatType === 'none') {
              list[idx] = {
                ...list[idx],
                isCompleted: true,
                snoozeUntil: undefined,
                lastTriggeredAt: list[idx].lastTriggeredAt ?? nowIso,
              };
            } else {
              list[idx] = {
                ...list[idx],
                snoozeUntil: undefined,
                lastTriggeredAt: nowIso,
              };
            }
          }
          await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
        }
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