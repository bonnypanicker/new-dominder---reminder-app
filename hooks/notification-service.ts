

import notifee, {
  TimestampTrigger,
  TriggerType,
  RepeatFrequency,
  AndroidImportance,
} from '@notifee/react-native';
import { Reminder } from '@/types/reminder';
import { CHANNEL_IDS, ensureBaseChannels } from '@/services/channels';

const getChannelId = (priority: 'standard' | 'silent' | 'ringer') => {
  switch (priority) {
    case 'ringer':
      return CHANNEL_IDS.ALARM;
    case 'silent':
      return CHANNEL_IDS.SILENT;
    default:r
      return CHANNEL_IDS.STANDARD;
  }
};

export const notificationService = {
  initialize: async () => {
    console.log('[Dominder-Debug] Initializing notification service and channels');
    await ensureBaseChannels();
  },

  scheduleReminderByModel: async (reminder: Reminder) => {
    try {
      console.log(`[Dominder-Debug] Scheduling reminder by model: ${JSON.stringify(reminder)}`);
      const { id, title, time, repeat, priority, message } = reminder;

      if (time < Date.now() && repeat === 'none') {
        console.log(`[Dominder-Debug] Reminder ${id} is in the past and does not repeat. Skipping schedule.`);
        return;
      }

      const channelId = getChannelId(priority);
      console.log(`[Dominder-Debug] Using channel ID: ${channelId} for priority: ${priority}`);

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: time,
      };

      if (repeat !== 'none') {
        trigger.repeatFrequency = RepeatFrequency[repeat.toUpperCase() as keyof typeof RepeatFrequency];
        console.log(`[Dominder-Debug] Reminder ${id} set to repeat with frequency: ${trigger.repeatFrequency}`);
      }

      const notificationDetails = {
        id,
        title,
        body: message,
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          sound: priority === 'silent' ? undefined : 'default',
          vibration: priority !== 'silent',
        },
      };

      console.log(`[Dominder-Debug] Creating trigger notification with details: ${JSON.stringify(notificationDetails)} and trigger: ${JSON.stringify(trigger)}`);
      await notifee.createTriggerNotification(notificationDetails, trigger);
      console.log(`[Dominder-Debug] Successfully scheduled notification for reminder ${id}`);
    } catch (e: any) {
      console.error(`[Dominder-Debug] Failed to schedule reminder ${reminder.id}:`, e.message, e.stack);
    }
  },

  cancelAllNotificationsForReminder: async (reminderId: string) => {
    console.log(`[Dominder-Debug] Cancelling all notifications for reminder ID: ${reminderId}`);
    await notifee.cancelNotification(reminderId);
  },

  cancelAllNotifications: async () => {
    console.log('[Dominder-Debug] Cancelling all notifications');
    await notifee.cancelAllNotifications();
  },
};
