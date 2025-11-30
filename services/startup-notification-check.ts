import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { Platform } from 'react-native';
import { Reminder } from '@/types/reminder';
import { createNotificationConfig } from '../hooks/notification-service';

/**
 * Service to check and trigger pending/missed notifications on app startup
 * Handles cases where app was force stopped and notifications were missed
 */

/**
 * Check all active reminders and trigger notifications for any that are overdue
 */
export async function checkAndTriggerPendingNotifications() {
  if (Platform.OS !== 'android') return;

  try {
    console.log('[StartupCheck] Checking for pending notifications and rescheduling all active reminders...');
    
    const reminderService = require('./reminder-service');
    const allReminders = await reminderService.getAllReminders();
    
    if (!allReminders || allReminders.length === 0) {
      console.log('[StartupCheck] No reminders to check');
      return;
    }

    // Get currently displayed notifications to avoid duplicates
    const displayedNotifications = await notifee.getDisplayedNotifications();
    const displayedIds = new Set(displayedNotifications.map(n => n.id));
    console.log(`[StartupCheck] Currently displayed notifications: ${displayedIds.size}`);

    const now = Date.now();
    const overdueReminders: Reminder[] = [];
    const expiredRingerReminders: Reminder[] = [];
    const remindersToReschedule: Reminder[] = [];

    // Check each active reminder
    for (const reminder of allReminders) {
      if (!reminder.isActive || reminder.isCompleted || reminder.isPaused) {
        continue;
      }

      // Skip if notification already displayed
      const notificationId = `rem-${reminder.id}`;
      if (displayedIds.has(notificationId)) {
        console.log(`[StartupCheck] Notification already displayed for: ${reminder.id}`);
        continue;
      }

      // Determine the scheduled time
      let scheduledTime: number | null = null;
      
      if (reminder.snoozeUntil) {
        scheduledTime = new Date(reminder.snoozeUntil).getTime();
      } else if (reminder.nextReminderDate) {
        scheduledTime = new Date(reminder.nextReminderDate).getTime();
      } else {
        // Calculate from date/time fields
        const [year, month, day] = reminder.date.split('-').map(Number);
        const [hours, minutes] = reminder.time.split(':').map(Number);
        scheduledTime = new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
      }

      if (!scheduledTime) continue;

      // Check if the notification time has passed
      const timeDiff = now - scheduledTime;
      
      if (timeDiff > 0) {
        // Notification time has passed - trigger it!
        const isRinger = reminder.priority === 'high';
        const missedThreshold = 5 * 60 * 1000; // 5 minutes

        // For ringer reminders older than 5 minutes, show "missed" instead of ringing
        if (isRinger && timeDiff > missedThreshold) {
          expiredRingerReminders.push(reminder);
          console.log(`[StartupCheck] Found missed ringer reminder (>5m): ${reminder.id} (${reminder.title})`);
        } else {
          // ALL overdue reminders get triggered (standard, silent, or recent ringer)
          overdueReminders.push(reminder);
          console.log(`[StartupCheck] Found overdue reminder: ${reminder.id} (${reminder.title}) - ${Math.round(timeDiff / 60000)} min ago`);
        }
      } else {
        // Future reminder - needs rescheduling after force stop
        remindersToReschedule.push(reminder);
        console.log(`[StartupCheck] Will reschedule future reminder: ${reminder.id} (${reminder.title})`);
      }
    }

    // Trigger ALL overdue notifications immediately
    if (overdueReminders.length > 0) {
      console.log(`[StartupCheck] Triggering ${overdueReminders.length} overdue notifications`);
      await triggerPendingNotifications(overdueReminders);
    }

    // Show missed notification for very old ringer reminders (>24h)
    if (expiredRingerReminders.length > 0) {
      console.log(`[StartupCheck] Showing ${expiredRingerReminders.length} expired ringer notifications`);
      await showExpiredRingerNotifications(expiredRingerReminders);
    }

    // Reschedule all future reminders (force stop clears AlarmManager alarms)
    if (remindersToReschedule.length > 0) {
      console.log(`[StartupCheck] Rescheduling ${remindersToReschedule.length} future reminders`);
      const notificationService = require('../hooks/notification-service');
      for (const reminder of remindersToReschedule) {
        try {
          await notificationService.scheduleReminderByModel(reminder);
          console.log(`[StartupCheck] Rescheduled reminder: ${reminder.id}`);
        } catch (error) {
          console.error(`[StartupCheck] Error rescheduling ${reminder.id}:`, error);
        }
      }
    }

    console.log('[StartupCheck] Completed pending notification check and rescheduling');
  } catch (error) {
    console.error('[StartupCheck] Error checking pending notifications:', error);
  }
}

/**
 * Trigger notifications for pending reminders that should have fired
 */
async function triggerPendingNotifications(reminders: Reminder[]) {
  const { NativeModules } = require('react-native');
  const { AlarmModule } = NativeModules;

  for (const reminder of reminders) {
    try {
      console.log(`[StartupCheck] Triggering pending notification for: ${reminder.id}`);
      
      const isRinger = reminder.priority === 'high';
      
      // Get scheduled time for display
      let scheduledTime: number;
      if (reminder.snoozeUntil) {
        scheduledTime = new Date(reminder.snoozeUntil).getTime();
      } else if (reminder.nextReminderDate) {
        scheduledTime = new Date(reminder.nextReminderDate).getTime();
      } else {
        const [year, month, day] = reminder.date.split('-').map(Number);
        const [hours, minutes] = reminder.time.split(':').map(Number);
        scheduledTime = new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
      }

      if (isRinger && AlarmModule?.scheduleAlarm) {
        // For valid ringers (< 5 mins late), launch the native Alarm Screen immediately
        console.log(`[StartupCheck] Launching native alarm screen for ringer: ${reminder.id}`);
        // Schedule for "now" (small delay to ensure reliable scheduling)
        AlarmModule.scheduleAlarm(reminder.id, reminder.title, Date.now() + 500, reminder.priority);
      } else {
        // Create config using shared helper
        const notificationConfig = createNotificationConfig(reminder, scheduledTime);
        // Display notification immediately
        await notifee.displayNotification(notificationConfig);
      }

      console.log(`[StartupCheck] Triggered notification/alarm for ${reminder.id}`);
    } catch (error) {
      console.error(`[StartupCheck] Error triggering notification for ${reminder.id}:`, error);
    }
  }
}

/**
 * Show "missed" notifications for expired ringer reminders
 */
async function showExpiredRingerNotifications(reminders: Reminder[]) {
  try {
    // Ensure channel exists
    const channelId = 'missed-alarm-v1';
    await notifee.createChannel({
      id: channelId,
      name: 'Missed Ringer Alarms',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    for (const reminder of reminders) {
      try {
        // Get scheduled time
        let scheduledTime: number;
        if (reminder.snoozeUntil) {
          scheduledTime = new Date(reminder.snoozeUntil).getTime();
        } else if (reminder.nextReminderDate) {
          scheduledTime = new Date(reminder.nextReminderDate).getTime();
        } else {
          const [year, month, day] = reminder.date.split('-').map(Number);
          const [hours, minutes] = reminder.time.split(':').map(Number);
          scheduledTime = new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
        }

        const timeText = formatSmartDateTime(scheduledTime);
        const body = `${reminder.title}\n${timeText}`;

        // Cancel original notification if it exists
        try {
          await notifee.cancelNotification(`rem-${reminder.id}`);
        } catch {}

        await notifee.displayNotification({
          id: `missed-${reminder.id}`,
          title: 'You missed a Ringer reminder',
          body,
          data: {
            reminderId: reminder.id,
            type: 'missed',
          },
          android: {
            channelId,
            importance: AndroidImportance.HIGH,
            smallIcon: 'small_icon_noti',
            color: '#F44336', // Red for missed
            timestamp: scheduledTime,
            showTimestamp: true,
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
            style: {
              type: AndroidStyle.BIGTEXT,
              text: body,
            },
            autoCancel: false,
            ongoing: true, // Non-swipable
            actions: [
              { title: 'Delete', pressAction: { id: 'delete_missed' } },
            ],
          },
        });

        console.log(`[StartupCheck] Showed missed notification for ringer: ${reminder.id}`);
      } catch (error) {
        console.error(`[StartupCheck] Error showing missed notification for ${reminder.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[StartupCheck] Error showing expired ringer notifications:', error);
  }
}

/**
 * Format time for notification display
 */
function formatSmartDateTime(when: number): string {
  const reminderDate = new Date(when);
  const now = new Date();
  
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reminderStart = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  
  const timeStr = reminderDate.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  if (reminderStart.getTime() === todayStart.getTime()) {
    return `Today ${timeStr}`;
  } else if (reminderStart.getTime() === yesterdayStart.getTime()) {
    return `Yesterday ${timeStr}`;
  } else {
    return reminderDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}
