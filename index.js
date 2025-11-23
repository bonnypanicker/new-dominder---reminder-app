import 'react-native-gesture-handler';
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

        // Increment occurrence count on delivery (but do not exceed untilCount)
        const occurred = reminder.occurrenceCount ?? 0;
        const hasCountCap = reminder.untilType === 'count' && typeof reminder.untilCount === 'number';
        const nextOccurCount = hasCountCap && occurred >= (reminder.untilCount)
          ? occurred
          : occurred + 1;
        
        // IMPORTANT: Pretend the reminder just triggered at its scheduled time.
        // This tells calculateNextReminderDate to compute the *subsequent* interval
        // relative to the current trigger, preventing duplicate scheduling of the same time.
        const forCalc = { 
          ...reminder, 
          occurrenceCount: nextOccurCount,
          lastTriggeredAt: reminder.nextReminderDate || new Date().toISOString()
        };

        const reminderUtils = require('./services/reminder-utils');
        const nextDate = reminderUtils.calculateNextReminderDate(forCalc, new Date());

        if (nextDate) {
          // Update the reminder with the next occurrence and keep it active
          const updatedReminder = {
            ...forCalc,
            nextReminderDate: nextDate.toISOString(),
            lastTriggeredAt: new Date().toISOString(),
            snoozeUntil: undefined,
            wasSnoozed: undefined,
            isActive: true,
            isCompleted: false,
            isPaused: false,
            isExpired: false,
          };

          await reminderService.updateReminder(updatedReminder);

          // Schedule the next notification
          const notificationService = require('./hooks/notification-service');
          await notificationService.scheduleReminderByModel(updatedReminder);

          console.log(`[onBackgroundEvent] Scheduled next occurrence for ${reminderId} at ${nextDate.toISOString()}`);
        } else {
          // No next occurrence (likely due to Until constraints).
          // Do NOT mark completed yet to avoid cancelling the just-delivered notification.
          // Persist occurrenceCount and lastTriggeredAt; leave notification visible for user action.
          const finalOccurrenceState = {
            ...forCalc,
            nextReminderDate: undefined,
            lastTriggeredAt: new Date().toISOString(),
            snoozeUntil: undefined,
            wasSnoozed: undefined,
            isActive: true,
            isCompleted: false,
            isPaused: false,
          };
          await reminderService.updateReminder(finalOccurrenceState);
          console.log(`[onBackgroundEvent] Final occurrence reached for ${reminderId}; left notification visible (no further scheduling)`);
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
      // For notifee action, do not increment occurrence here (already done on delivery)
      await svc.markReminderDone(reminderId, false);
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
