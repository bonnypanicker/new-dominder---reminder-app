import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  TriggerType,
  TimestampTrigger,
  EventType,
} from '@notifee/react-native';
import { ensureBaseChannels, currentRingerChannelId, standardChannelId, silentChannelId } from '../services/channels';
import { getPermissionState } from '../services/permission-gate';
import { Reminder } from '@/types/reminder';

async function scheduleReminderByModel(reminder: Reminder): Promise<string> {
  await ensureBaseChannels();

  const when = typeof reminder.time === 'number' ? reminder.time : new Date(reminder.time).getTime();
  const { exact } = await getPermissionState();

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: when,
    ...(exact ? { alarmManager: { allowWhileIdle: true } } : {}),
  };

  const now = new Date();
  const reminderDate = new Date(when);

  let formattedDatePart;
  if (reminderDate.toDateString() === now.toDateString()) {
    formattedDatePart = 'Today';
  } else {
    formattedDatePart = reminderDate.toLocaleString([], {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  }

  const formattedTimePart = reminderDate.toLocaleString([], {
    hour: '2-digit', minute: '2-digit',
  });

  const formattedDateTime = `${formattedDatePart}, ${formattedTimePart}`;

  const isRinger = reminder.priority === 'high';
  const channelId = isRinger
    ? await currentRingerChannelId()
    : reminder.priority === 'medium' ? standardChannelId() : silentChannelId();

  const notificationId = await notifee.createTriggerNotification({
    id: `rem-${reminder.id}`,
    title: reminder.title,
    body: `${reminder.description ?? ''}\n${formattedDateTime}`.trim(),
    data: { reminderId: reminder.id },
    android: {
      channelId,
      importance: isRinger ? AndroidImportance.HIGH : undefined,
      category: isRinger ? AndroidCategory.ALARM : undefined,
      lightUpScreen: isRinger || undefined,
      fullScreenAction: isRinger ? { id: 'alarm' } : undefined,
      showTimestamp: true,
      timestamp: when,
      style: { type: AndroidStyle.BIGTEXT, text: `${reminder.description ?? ''}\n${formattedDateTime}`.trim() },
      actions: isRinger
        ? [
            { title: 'Done', pressAction: { id: 'done' } },
            { title: 'Snooze 5', pressAction: { id: 'snooze_5' } },
            { title: 'Snooze 10', pressAction: { id: 'snooze_10' } },
            { title: 'Snooze 15', pressAction: { id: 'snooze_15' } },
            { title: 'Snooze 30', pressAction: { id: 'snooze_30' } },
          ]
        : [
            { title: 'Done', pressAction: { id: 'done' } },
            { title: 'Snooze 5', pressAction: { id: 'snooze_5' } },
          ],
      pressAction: { id: 'default' },
    },
  }, trigger);
  return notificationId;
}

export const notificationService = {
  initialize: async () => {
    await notifee.requestPermission();
    await ensureBaseChannels();
  },
  scheduleReminderByModel,
  cancelNotification: async (notificationId: string) => {
    await notifee.cancelNotification(notificationId);
  },
  cancelAllNotificationsForReminder: async (reminderId: string) => {
    const notifications = await notifee.getTriggerNotificationIds();
    const reminderNotifications = notifications.filter(id => id.startsWith(`rem-${reminderId}`));
    await notifee.cancelTriggerNotifications(reminderNotifications);
  },
  cleanupOrphanedNotifications: async () => {
    // This logic might need to be more sophisticated depending on how reminders are stored
    console.log('[Native] cleanupOrphanedNotifications not fully implemented');
  },
  hasScheduledForReminder: async (reminderId: string): Promise<boolean> => {
    const notifications = await notifee.getTriggerNotificationIds();
    return notifications.some(id => id.startsWith(`rem-${reminderId}`));
  },
  displayInfoNotification: async (title: string, body: string) => {
    const channelId = await standardChannelId();
    return notifee.displayNotification({ title, body, android: { channelId } });
  },
  subscribeToEvents: (onEvent: (event: any) => void) => {
    const foregroundSubscription = notifee.onForegroundEvent(onEvent);
    return () => {
      foregroundSubscription();
    };
  },
};