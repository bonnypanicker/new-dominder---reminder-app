import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  require('./services/headless-task');
}
import 'expo-router/entry';
import notifee, { EventType } from '@notifee/react-native';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  try {
    // Handle notification delivered events for automatic rescheduling
    if (type === EventType.DELIVERED) {
      const { notification } = detail || {};
      if (!notification || !notification.data) return;

      const reminderId = notification.data.reminderId;
      if (!reminderId) return;

      console.log(`[onBackgroundEvent] Notification delivered for reminder ${reminderId}`);

      // Get reminder and check if it's an "every" type that needs automatic rescheduling
      const reminderService = require('./services/reminder-service');
      const reminder = await reminderService.getReminder(reminderId);
      
      if (!reminder) {
        console.log(`[onBackgroundEvent] Reminder ${reminderId} not found for delivered event`);
        return;
      }

      // Auto-reschedule all repeating reminder types (not just 'every')
      if (reminder.repeatType !== 'none') {
        console.log(`[onBackgroundEvent] Auto-rescheduling '${reminder.repeatType}' reminder ${reminderId}`);
        
        const reminderUtils = require('./services/reminder-utils');
        const nextDate = reminderUtils.calculateNextReminderDate(reminder, new Date());
        
        if (nextDate) {
          // Update the reminder with the next occurrence
          const updatedReminder = {
            ...reminder,
            nextReminderDate: nextDate.toISOString(),
            lastTriggeredAt: new Date().toISOString(),
          };
          
          await reminderService.updateReminder(updatedReminder);
          
          // Schedule the next notification
          const notificationService = require('./hooks/notification-service');
          await notificationService.scheduleReminderByModel(updatedReminder);
          
          console.log(`[onBackgroundEvent] Scheduled next occurrence for ${reminderId} at ${nextDate.toISOString()}`);
        } else {
          console.log(`[onBackgroundEvent] No next occurrence found for ${reminderId}`);
        }
      }
      return;
    }

    // Handle action press events (existing logic)
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