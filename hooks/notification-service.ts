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
  initialize: async () => {
    console.log('[Dominder-Debug] Initializing notification service and channels');
    await ensureBaseChannels();
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
      } else {
        triggerTime = calculateNextReminderDate(reminder, now);
        console.log(`[Dominder-Debug] Calculated next trigger time: ${triggerTime?.toISOString()}`);
      }

      if (!triggerTime || triggerTime <= now) {
        console.log(`[Dominder-Debug] Trigger time is in the past or null, skipping schedule for reminder ${reminder.id}`);
        return undefined;
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
          title: 'Done',
          pressAction: { id: 'done' },
        });
        actions.push({
          title: 'Snooze 5m',
          pressAction: { id: 'snooze_5' },
        });
        actions.push({
          title: 'Snooze 10m',
          pressAction: { id: 'snooze_10' },
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
          pressAction: {
            id: 'alarm',
          },
          actions,
          sound: reminder.priority === 'low' ? undefined : 'default',
          vibrationPattern: reminder.priority === 'low' ? undefined : [300, 500],
          autoCancel: reminder.priority !== 'medium',
          ongoing: reminder.priority === 'medium',
        },
      };

      if (reminder.priority === 'high') {
        notificationDetails.android.fullScreenAction = {
          id: 'alarm',
        };
      }

      console.log(`[Dominder-Debug] Creating trigger notification with ID: ${notificationId}`);
      await notifee.createTriggerNotification(notificationDetails, trigger);
      console.log(`[Dominder-Debug] Successfully scheduled notification ${notificationId} for reminder ${reminder.id}`);
      
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
};
