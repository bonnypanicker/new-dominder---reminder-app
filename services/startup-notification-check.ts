import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { Platform } from 'react-native';
import { Reminder } from '@/types/reminder';

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
    console.log('[StartupCheck] Checking for pending notifications...');
    
    const reminderService = require('./reminder-service');
    const allReminders = await reminderService.getAllReminders();
    
    if (!allReminders || allReminders.length === 0) {
      console.log('[StartupCheck] No reminders to check');
      return;
    }

    const now = Date.now();
    const pendingReminders: Reminder[] = [];
    const expiredRingerReminders: Reminder[] = [];

    // Check each active reminder
    for (const reminder of allReminders) {
      if (!reminder.isActive || reminder.isCompleted || reminder.isPaused) {
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
        // Notification time has passed
        const isRinger = reminder.priority === 'high';
        const gracePeriod = isRinger ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5 min for ringer, 60 min for others

        if (timeDiff <= gracePeriod) {
          // Within grace period - trigger immediately
          pendingReminders.push(reminder);
          console.log(`[StartupCheck] Found pending reminder: ${reminder.id} (${reminder.title})`);
        } else if (isRinger) {
          // Ringer reminder expired beyond grace period
          expiredRingerReminders.push(reminder);
          console.log(`[StartupCheck] Found expired ringer reminder: ${reminder.id} (${reminder.title})`);
        }
      }
    }

    // Trigger pending notifications immediately
    if (pendingReminders.length > 0) {
      console.log(`[StartupCheck] Triggering ${pendingReminders.length} pending notifications`);
      await triggerPendingNotifications(pendingReminders);
    }

    // Show missed notification for expired ringers
    if (expiredRingerReminders.length > 0) {
      console.log(`[StartupCheck] Showing ${expiredRingerReminders.length} expired ringer notifications`);
      await showExpiredRingerNotifications(expiredRingerReminders);
    }

    console.log('[StartupCheck] Completed pending notification check');
  } catch (error) {
    console.error('[StartupCheck] Error checking pending notifications:', error);
  }
}

/**
 * Trigger notifications for pending reminders that should have fired
 */
async function triggerPendingNotifications(reminders: Reminder[]) {
  for (const reminder of reminders) {
    try {
      console.log(`[StartupCheck] Triggering pending notification for: ${reminder.id}`);
      
      const isRinger = reminder.priority === 'high';
      const channelId = isRinger ? 'alarm-v2' : 
                        reminder.priority === 'medium' ? 'standard-v2' : 'silent-v2';

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

      // Format time display
      const timeText = formatSmartDateTime(scheduledTime);
      const body = [reminder.description?.trim(), timeText].filter(Boolean).join('\n');

      // Display notification immediately
      await notifee.displayNotification({
        id: `rem-${reminder.id}`,
        title: reminder.title,
        body,
        data: {
          reminderId: reminder.id,
          priority: reminder.priority,
          title: reminder.title,
          route: 'index'
        },
        android: {
          channelId,
          importance: isRinger ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
          smallIcon: 'small_icon_noti',
          color: '#6750A4',
          timestamp: scheduledTime,
          showTimestamp: true,
          lightUpScreen: isRinger,
          ongoing: true,
          autoCancel: false,
          pressAction: {
            id: 'default',
            launchActivity: 'default'
          },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: body
          },
          actions: [
            { title: 'Done', pressAction: { id: 'done' } },
            { title: 'Snooze 5', pressAction: { id: 'snooze_5' } },
            { title: 'Snooze 10', pressAction: { id: 'snooze_10' } },
            { title: 'Snooze 15', pressAction: { id: 'snooze_15' } },
            { title: 'Snooze 30', pressAction: { id: 'snooze_30' } },
          ],
        },
      });

      console.log(`[StartupCheck] Triggered notification for ${reminder.id}`);
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
            autoCancel: true,
            ongoing: false,
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
