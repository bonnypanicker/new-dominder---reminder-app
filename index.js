import 'expo-router/entry';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    if (type !== EventType.ACTION_PRESS) return;
    const { notification, pressAction } = detail || {};
    if (!notification || !pressAction) return;
    const reminderId = notification.data && notification.data.reminderId;

    try { await notifee.cancelNotification(notification.id); } catch {}
    try { await notifee.cancelDisplayedNotifications(); } catch {}

    if (pressAction.id === 'done') {
      const raw = (await AsyncStorage.getItem('dominder_reminders')) || '[]';
      const list = JSON.parse(raw);
      const i = list.findIndex((r) => r.id === reminderId);
      if (i !== -1) list[i].isCompleted = true;
      await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
      return;
    }

    const m = /^snooze_(\d+)$/.exec(pressAction.id);
    if (m) {
      const mins = parseInt(m[1], 10);
      const svc = require('./services/reminder-scheduler'); // no .ts extension
      await svc.rescheduleReminderById(reminderId, mins);
    }
  } catch (e) {
    console.log('[onBackgroundEvent] error', e);
  }
});