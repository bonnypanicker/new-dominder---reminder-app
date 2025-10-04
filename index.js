import "expo-router/entry";
import { rescheduleReminderById } from './services/reminder-scheduler';

let notifee;
try {
  notifee = require('@notifee/react-native').default;
} catch (e) {
  console.log('[index] notifee unavailable', e?.message ?? e);
}

if (notifee?.onBackgroundEvent) {
  const { EventType } = require('@notifee/react-native');

  notifee.onBackgroundEvent(async ({ type, detail }) => {
    console.log('[onBackgroundEvent] type:', type, 'detail:', detail);
    try {
      const { notification, pressAction } = detail ?? {};
      if (!notification) return;

      try {
        await notifee.cancelNotification(notification.id);
      } catch (e) {
        console.log('[onBackgroundEvent] cancelNotification failed', e);
      }
      try {
        await notifee.cancelDisplayedNotifications();
      } catch {}

      const reminderId = notification?.data?.reminderId;
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;

      if (type === EventType.ACTION_PRESS && pressAction) {
        const stored = await AsyncStorage.getItem('dominder_reminders');
        const list = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex((r) => r.id === reminderId);
        if (idx !== -1) {
          const reminder = list[idx];
          const nowIso = new Date().toISOString();

          const snoozeMatch = /^snooze_(\d+)$/.exec(pressAction.id);
          if (snoozeMatch) {
            const minutes = parseInt(snoozeMatch[1], 10);
            console.log(`[onBackgroundEvent] Snoozing reminder ${String(reminderId)} for ${minutes} minutes`);
            await rescheduleReminderById(String(reminderId), minutes);
          } else if (pressAction.id === 'done') {
            console.log('[onBackgroundEvent] Marking reminder as done:', reminderId);
            if (reminder.repeatType === 'none') {
              list[idx] = {
                ...reminder,
                isCompleted: true,
                snoozeUntil: undefined,
                lastTriggeredAt: reminder.lastTriggeredAt ?? nowIso,
                notificationId: undefined,
              };
            } else {
              list[idx] = {
                ...reminder,
                snoozeUntil: undefined,
                lastTriggeredAt: nowIso,
                notificationId: undefined,
              };
            }
            await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
          }
          await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
          console.log('[onBackgroundEvent] Updated reminder in storage');
        }
      }
    } catch (err) {
      console.log('[index] backgroundEvent error', err);
    }
  });
}
