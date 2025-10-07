

import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  TriggerType,
  TimestampTrigger,
  EventType,
} from '@notifee/react-native';
import { ensureBaseChannels, CHANNEL_IDS } from '../services/channels';
import { getPermissionState, requestInteractive, openAlarmSettings } from '../services/permission-gate';
import { Reminder } from '@/types/reminder';
import { Alert } from 'react-native';

async function scheduleReminderByModel(reminder: Reminder): Promise<string> {
  await ensureBaseChannels();

  let when: number;
  if (typeof reminder.time === 'number') {
    when = reminder.time;
  } else {
    const [year, month, day] = reminder.date.split('-').map(Number);
    const [hours, minutes] = reminder.time.split(':').map(Number);
    when = new Date(year, month - 1, day, hours, minutes).getTime();
  }

  const { authorized, exact } = await getPermissionState();

  if (!authorized) {
    const { authorized: newAuthorized } = await requestInteractive();
    if (!newAuthorized) {
      Alert.alert(
        'Permission Required',
        'To schedule reminders, you need to grant notification permissions.',
        [{ text: 'OK' }]
      );
      return '';
    }
  }

  if (!exact) {
    Alert.alert(
      'Exact Alarm Permission Required',
      'To ensure your reminders fire at the exact time, please grant the Alarms & Reminders permission.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openAlarmSettings },
      ]
    );
    return '';
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: when,
    alarmManager: {
      allowWhileIdle: true,
    },
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
    ? CHANNEL_IDS.ALARM
    : reminder.priority === 'medium' ? CHANNEL_IDS.STANDARD : CHANNEL_IDS.SILENT;

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
  cleanupOrphanedNotifications: async () => {
    // This logic might need to be more sophisticated depending on how reminders are stored
    console.log('[Native] cleanupOrphanedNotifications not fully implemented');
  },
  hasScheduledForReminder: async (reminderId: string): Promise<boolean> => {
    const notifications = await notifee.getTriggerNotificationIds();
    return notifications.some(id => id.startsWith(`rem-${reminderId}`));
  },
  displayInfoNotification: async (title: string, body: string) => {
    const channelId = CHANNEL_IDS.STANDARD;
    return notifee.displayNotification({ title, body, android: { channelId } });
  },
  subscribeToEvents: (onEvent: (event: any) => void) => {
    const foregroundSubscription = notifee.onForegroundEvent(onEvent);
    return () => {
      foregroundSubscription();
    };
  },
};
