import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  TriggerType,
  TimestampTrigger,
  AndroidNotificationSetting,
} from '@notifee/react-native';
import { ensureBaseChannels, currentRingerChannelId, standardChannelId, silentChannelId } from '../services/channels';
import { getPermissionState } from '../services/permission-gate';

type Reminder = {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  time: number | string; // epoch ms or ISO
};

export async function scheduleReminderByModel(reminder: Reminder) {
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

  await notifee.createTriggerNotification({
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
        ?
            {
              title: 'Done',
              pressAction: { id: 'done' },
            },
            {
              title: 'Snooze 5',
              pressAction: { id: 'snooze_5' },
            },
            {
              title: 'Snooze 10',
              pressAction: { id: 'snooze_10' },
            },
            {
              title: 'Snooze 15',
              pressAction: { id: 'snooze_15' },
            },
            {
              title: 'Snooze 30',
              pressAction: { id: 'snooze_30' },
            },
          ]
        :
            {
              title: 'Done',
              pressAction: { id: 'done' },
            },
            {
              title: 'Snooze 5',
              pressAction: { id: 'snooze_5' },
            },
          ],
      pressAction: { id: 'default' },
    },
  }, trigger);
}
