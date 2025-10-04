import "expo-router/entry";
import notifee, { EventType } from '@notifee/react-native';
import { rescheduleReminderById } from './services/reminder-scheduler';
import { notificationService } from './hooks/notification-service';
import { calculateNextReminderDate } from './services/reminder-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    const { notification, pressAction } = detail;

    if (!notification) {
      console.log('[BackgroundEvent] No notification in detail, exiting.');
      return;
    }

    if (type !== EventType.ACTION_PRESS) {
      return;
    }

    if (!pressAction) {
      console.log('[BackgroundEvent] No pressAction on ACTION_PRESS, exiting.');
      return;
    }
    
    console.log('[BackgroundEvent]', pressAction.id, notification?.id);

    // After an action, the notification is no longer needed.
    try { await notifee.cancelNotification(notification.id); } catch {}
    try { await notifee.cancelDisplayedNotifications(); } catch {}

    const reminderId = notification?.data?.reminderId;
    if (!reminderId) {
      console.log('[BackgroundEvent] No reminderId in notification data, exiting.');
      return;
    }

    const stored = await AsyncStorage.getItem('dominder_reminders');
    const list = stored ? JSON.parse(stored) : [];
    const idx = list.findIndex((r) => r.id === reminderId);

    if (idx !== -1) {
      const reminder = list[idx];
      const nowIso = new Date().toISOString();

      const snoozeMatch = /^snooze_(\d+)$/.exec(pressAction.id);
      if (snoozeMatch) {
        const minutes = parseInt(snoozeMatch[1], 10);
        console.log(`[BackgroundEvent] Snoozing reminder ${String(reminderId)} for ${minutes} minutes`);
        await rescheduleReminderById(String(reminderId), minutes);
      } else if (pressAction.id === 'done') {
        console.log('[BackgroundEvent] Marking reminder as done:', reminderId);
        if (reminder.repeatType === 'none') {
          list[idx] = {
            ...reminder,
            isCompleted: true,
            snoozeUntil: undefined,
            lastTriggeredAt: reminder.lastTriggeredAt ?? nowIso,
            notificationId: undefined,
          };
          await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
        } else {
          const nextDate = calculateNextReminderDate(reminder, new Date());
          const updatedReminder = {
            ...reminder,
            snoozeUntil: undefined,
            lastTriggeredAt: nowIso,
            nextReminderDate: nextDate ? nextDate.toISOString() : undefined,
            notificationId: undefined,
          };
          list[idx] = updatedReminder;
          await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
          await notificationService.scheduleReminderByModel(updatedReminder);
        }
        console.log('[BackgroundEvent] Updated reminder in storage');
      }
    }
  } catch (err) {
    console.error('[BackgroundEvent] Error:', err);
  }
});