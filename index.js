import 'expo-router/entry';
import './services/headless-task.js';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './services/notification-service';
import { Reminder } from './types/reminder';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    if (type !== EventType.ACTION_PRESS) return;
    const { notification, pressAction } = detail || {};
    if (!notification || !pressAction) return;
    const reminderId = notification.data && notification.data.reminderId;

    try { await notifee.cancelNotification(notification.id); } catch {}

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

      const raw = (await AsyncStorage.getItem('dominder_reminders')) || '[]';
      let reminders = JSON.parse(raw);
      const reminderIndex = reminders.findIndex((r) => r.id === reminderId);

      if (reminderIndex !== -1) {
        let reminder = reminders[reminderIndex];
        const snoozeUntil = new Date(Date.now() + mins * 60 * 1000).toISOString();

        // Update reminder object with snoozeUntil
        reminder = { ...reminder, snoozeUntil };

        // Cancel existing notification if any
        if (reminder.notificationId) {
          await notificationService.cancelNotification(reminder.notificationId);
        }

        // Schedule new notification
        const newNotificationId = await notificationService.scheduleReminderByModel(reminder);
        reminder = { ...reminder, notificationId: newNotificationId };

        reminders[reminderIndex] = reminder;
        await AsyncStorage.setItem('dominder_reminders', JSON.stringify(reminders));
      }
    }
  } catch (e) {
    console.log('[onBackgroundEvent] error', e);
  }
});