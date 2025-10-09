import notifee, {
  TimestampTrigger,
  TriggerType,
  AndroidImportance,
  Event,
} from '@notifee/react-native';
import { Reminder, Priority } from '@/types/reminder';
import { CHANNEL_IDS, ensureBaseChannels } from '@/services/channels';
import { calculateNextReminderDate } from '@/services/reminder-utils';

const getPriorityChannelId = (priority: Priority): string => {
  switch (priority) {
    case 'high':
      return CHANNEL_IDS.ALARM;
    case 'low':
      return CHANNEL_IDS.SILENT;
    case 'medium':
    default:
      return CHANNEL_IDS.STANDARD;
  }
};

export const notificationService = {
  initialize: async (): Promise<boolean> => {
    try {
      console.log('[Dominder-Debug] Initializing notification service and channels');
      await ensureBaseChannels();
      console.log('[Dominder-Debug] Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('[Dominder-Debug] Failed to initialize notification service:', error);
      return false;
    }
  },

  requestPermissions: async (): Promise<boolean> => {
    try {
      console.log('[Dominder-Debug] Requesting notification permissions');
      const settings = await notifee.requestPermission();
      const granted = settings.authorizationStatus >= 1;
      console.log('[Dominder-Debug] Notification permission granted:', granted);
      return granted;
    } catch (error) {
      console.error('[Dominder-Debug] Failed to request permissions:', error);
      return false;
    }
  },

  checkPermissions: async (): Promise<boolean> => {
    try {
      const settings = await notifee.getNotificationSettings();
      const granted = settings.authorizationStatus >= 1;
      console.log('[Dominder-Debug] Notification permission status:', granted);
      return granted;
    } catch (error) {
      console.error('[Dominder-Debug] Failed to check permissions:', error);
      return false;
    }
  },

  scheduleReminderByModel: async (reminder: Reminder): Promise<string | undefined> => {
    try {
      console.log(`[Dominder-Debug] Scheduling notification for reminder: ${reminder.id} (${reminder.title})`);
      
      const now = new Date();
      let triggerTime: Date | null = null;

      if (reminder.snoozeUntil) {
        triggerTime = new Date(reminder.snoozeUntil);
        console.log(`[Dominder-Debug] Using snooze time: ${triggerTime.toISOString()}`);
      } else if (reminder.nextReminderDate && reminder.repeatType !== 'none') {
        triggerTime = new Date(reminder.nextReminderDate);
        console.log(`[Dominder-Debug] Using nextReminderDate: ${triggerTime.toISOString()}`);
      } else if (reminder.repeatType === 'none') {
        // For one-time reminders, use the date and time directly
        const dateParts = reminder.date.split('-');
        const year = parseInt(dateParts[0] || '0', 10);
        const month = parseInt(dateParts[1] || '1', 10);
        const day = parseInt(dateParts[2] || '1', 10);
        const timeParts = reminder.time.split(':');
        const hh = parseInt(timeParts[0] || '0', 10);
        const mm = parseInt(timeParts[1] || '0', 10);
        triggerTime = new Date(year, month - 1, day, hh, mm, 0, 0);
        console.log(`[Dominder-Debug] One-time reminder, using date/time: ${triggerTime.toISOString()}`);
      } else {
        // For repeating reminders, calculate next occurrence
        triggerTime = calculateNextReminderDate(reminder, now);
        console.log(`[Dominder-Debug] Calculated next trigger time: ${triggerTime?.toISOString()}`);
      }

      if (!triggerTime) {
        console.log(`[Dominder-Debug] Trigger time is null, skipping schedule for reminder ${reminder.id}`);
        return undefined;
      }

      // Allow scheduling if trigger time is within 5 seconds in the past (clock skew tolerance)
      const timeDiff = triggerTime.getTime() - now.getTime();
      if (timeDiff < -5000) {
        console.log(`[Dominder-Debug] Trigger time is too far in the past (${Math.abs(timeDiff)}ms), skipping schedule for reminder ${reminder.id}`);
        return undefined;
      }

      // If trigger time is slightly in the past or very soon, adjust it to be 1 second in the future
      if (timeDiff < 1000) {
        triggerTime = new Date(now.getTime() + 1000);
        console.log(`[Dominder-Debug] Adjusted trigger time to 1 second in the future: ${triggerTime.toISOString()}`);
      }

      const channelId = getPriorityChannelId(reminder.priority);
      console.log(`[Dominder-Debug] Using channel ID: ${channelId} for priority: ${reminder.priority}`);

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime.getTime(),
      };

      const actions = [];
      
      if (reminder.priority === 'high') {
        actions.push({
          title: 'Open Alarm',
          pressAction: { id: 'alarm' },
        });
      } else if (reminder.priority === 'medium') {
        actions.push({
          title: 'Done',
          pressAction: { id: 'done' },
        });
        actions.push({
          title: 'Snooze 5m',
          pressAction: { id: 'snooze_5' },
        });
      } else {
        actions.push({
          title: 'Done',
          pressAction: { id: 'done' },
        });
      }

      const notificationId = `reminder_${reminder.id}`;
      
      const notificationDetails: any = {
        id: notificationId,
        title: reminder.title,
        body: reminder.description || 'Reminder',
        data: {
          reminderId: reminder.id,
        },
        android: {
          channelId,
          importance: reminder.priority === 'high' ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
          category: reminder.priority === 'high' ? 'alarm' : undefined,
          pressAction: {
            id: reminder.priority === 'high' ? 'alarm' : 'default',
          },
          actions,
          sound: reminder.priority === 'low' ? undefined : 'default',
          vibrationPattern: reminder.priority === 'low' ? undefined : [300, 500],
          autoCancel: reminder.priority === 'low',
          ongoing: reminder.priority === 'high' || reminder.priority === 'medium',
          visibility: 1,
        },
      };

      if (reminder.priority === 'high') {
        notificationDetails.android.fullScreenAction = {
          id: 'alarm',
        };
      }

      console.log(`[Dominder-Debug] Creating trigger notification with ID: ${notificationId}`);
      console.log(`[Dominder-Debug] Trigger timestamp: ${new Date(trigger.timestamp).toISOString()} (in ${Math.round((trigger.timestamp - Date.now()) / 1000)}s)`);
      
      await notifee.createTriggerNotification(notificationDetails, trigger);
      console.log(`[Dominder-Debug] Successfully scheduled notification ${notificationId} for reminder ${reminder.id}`);
      
      // Verify the notification was actually scheduled
      const triggers = await notifee.getTriggerNotifications();
      const scheduled = triggers.find((t: any) => t.notification?.id === notificationId);
      if (scheduled) {
        console.log(`[Dominder-Debug] Verified notification ${notificationId} is in trigger queue`);
      } else {
        console.warn(`[Dominder-Debug] WARNING: Notification ${notificationId} not found in trigger queue after scheduling!`);
      }
      
      return notificationId;
    } catch (e: any) {
      console.error(`[Dominder-Debug] Failed to schedule reminder ${reminder.id}:`, e.message, e.stack);
      return undefined;
    }
  },

  cancelNotification: async (notificationId: string) => {
    try {
      console.log(`[Dominder-Debug] Cancelling notification: ${notificationId}`);
      await notifee.cancelNotification(notificationId);
    } catch (e) {
      console.error(`[Dominder-Debug] Failed to cancel notification ${notificationId}:`, e);
    }
  },

  cancelAllNotificationsForReminder: async (reminderId: string) => {
    try {
      console.log(`[Dominder-Debug] Cancelling all notifications for reminder: ${reminderId}`);
      const triggers = await notifee.getTriggerNotifications();
      const toCancel = triggers.filter((t: any) => t.notification?.data?.reminderId === reminderId);
      
      for (const trigger of toCancel) {
        if (trigger.notification?.id) {
          await notifee.cancelNotification(trigger.notification.id);
          console.log(`[Dominder-Debug] Cancelled notification ${trigger.notification.id} for reminder ${reminderId}`);
        }
      }
      
      const displayed = await notifee.getDisplayedNotifications();
      const displayedToCancel = displayed.filter((n: any) => n.notification?.data?.reminderId === reminderId);
      
      for (const notification of displayedToCancel) {
        if (notification.notification?.id) {
          await notifee.cancelNotification(notification.notification.id);
          console.log(`[Dominder-Debug] Cancelled displayed notification ${notification.notification.id} for reminder ${reminderId}`);
        }
      }
    } catch (e) {
      console.error(`[Dominder-Debug] Failed to cancel notifications for reminder ${reminderId}:`, e);
    }
  },

  hasScheduledForReminder: async (reminderId: string): Promise<boolean> => {
    try {
      const triggers = await notifee.getTriggerNotifications();
      const hasScheduled = triggers.some((t: any) => t.notification?.data?.reminderId === reminderId);
      console.log(`[Dominder-Debug] Reminder ${reminderId} has scheduled notification: ${hasScheduled}`);
      return hasScheduled;
    } catch (e) {
      console.error(`[Dominder-Debug] Failed to check scheduled notifications for reminder ${reminderId}:`, e);
      return false;
    }
  },

  cleanupOrphanedNotifications: async () => {
    try {
      console.log('[Dominder-Debug] Cleaning up orphaned notifications');
      const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
      const stored = await AsyncStorage.getItem('dominder_reminders');
      const reminders: Reminder[] = stored ? JSON.parse(stored) : [];
      const validReminderIds = new Set(reminders.map((r: Reminder) => r.id));
      
      const triggers = await notifee.getTriggerNotifications();
      let cancelledCount = 0;
      
      for (const trigger of triggers) {
        const reminderId = trigger.notification?.data?.reminderId;
        if (reminderId && typeof reminderId === 'string' && !validReminderIds.has(reminderId) && trigger.notification?.id) {
          await notifee.cancelNotification(trigger.notification.id);
          cancelledCount++;
          console.log(`[Dominder-Debug] Cancelled orphaned notification ${trigger.notification.id} for deleted reminder ${reminderId}`);
        }
      }
      
      console.log(`[Dominder-Debug] Cleaned up ${cancelledCount} orphaned notifications`);
    } catch (e) {
      console.error('[Dominder-Debug] Failed to cleanup orphaned notifications:', e);
    }
  },

  subscribeToEvents: (callback: (event: Event) => void) => {
    console.log('[Dominder-Debug] Subscribing to foreground notification events');
    return notifee.onForegroundEvent(callback);
  },

  displayInfoNotification: async (title: string, body: string) => {
    try {
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: CHANNEL_IDS.STANDARD,
          importance: AndroidImportance.DEFAULT,
        },
      });
    } catch (e) {
      console.error('[Dominder-Debug] Failed to display info notification:', e);
    }
  },

  scheduleNotification: async (reminder: Reminder): Promise<string | undefined> => {
    return notificationService.scheduleReminderByModel(reminder);
  },

  getAllScheduledNotifications: async () => {
    try {
      const triggers = await notifee.getTriggerNotifications();
      console.log(`[Dominder-Debug] Found ${triggers.length} scheduled notifications`);
      return triggers;
    } catch (e) {
      console.error('[Dominder-Debug] Failed to get scheduled notifications:', e);
      return [];
    }
  },
};
