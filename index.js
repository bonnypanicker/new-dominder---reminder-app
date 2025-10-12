import './services/headless-task';
import 'expo-router/entry';
import notifee, { EventType } from '@notifee/react-native';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    if (type !== EventType.ACTION_PRESS) return;
    const { notification, pressAction } = detail || {};
    if (!notification || !pressAction) return;

    const reminderId = notification.data && notification.data.reminderId;

    // Cancel only this notification
    try { await notifee.cancelNotification(notification.id); } catch {}

    if (pressAction.id === 'done') {
      const svc = require('./services/reminder-scheduler');
      await svc.markReminderDone(reminderId);
      return;
    }

    const m = /^snooze_(\d+)$/.exec(pressAction.id);
    if (m) {
      const mins = parseInt(m[1], 10);
      const svc = require('./services/reminder-scheduler');
      await svc.rescheduleReminderById(reminderId, mins);
    }
  } catch (e) {
    console.log('[onBackgroundEvent] error', e);
  }
});