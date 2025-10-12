import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  TriggerType,
  TimestampTrigger,
  AuthorizationStatus,
  AndroidNotificationSetting,
} from '@notifee/react-native';

type Reminder = {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  time: number; // epoch ms
};

function bodyWithTime(desc: string | undefined, when: number) {
  const formatted = new Date(when).toLocaleString([], {
    hour: '2-digit', minute: '2-digit', weekday: 'short', day: 'numeric', month: 'short',
  });
  return [desc?.trim(), `⏰ ${formatted}`].filter(Boolean).join('\n');
}

export async function scheduleReminderByModel(rem: Reminder) {
  const when = rem.time;

  // Permissions and exact alarm capability (fallback if denied)
  let s = await notifee.getNotificationSettings();
  if (s.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
    await notifee.requestPermission();
    s = await notifee.getNotificationSettings(); // Re-fetch after request
  }
  const exactEnabled = s?.android?.alarm === AndroidNotificationSetting.ENABLED;

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: when,
    ...(exactEnabled ? { alarmManager: { allowWhileIdle: true } } : {}),
  };

  const isRinger = rem.priority === 'high';
  const channelId = isRinger ? 'alarm-v2' : rem.priority === 'medium' ? 'standard-v2' : 'silent-v2';

  const body = bodyWithTime(rem.description, when);

  await notifee.createTriggerNotification({
    id: `rem-${rem.id}`,
    title: rem.title,
    body,
    data: { reminderId: rem.id },
    android: {
      channelId,
      importance: isRinger ? AndroidImportance.HIGH : undefined,
      category: isRinger ? AndroidCategory.ALARM : undefined,
      lightUpScreen: isRinger ? true : undefined,
      // Persistent until user action
      ongoing: true,
      autoCancel: false,
      // Body tap: open alarm for ringer, open app for others
      pressAction: { id: isRinger ? 'open_alarm' : 'default' },
      // Full-screen for locked/killed cases
      fullScreenAction: isRinger ? { id: 'alarm' } : undefined,
      showTimestamp: true,
      timestamp: when,
      style: { type: AndroidStyle.BIGTEXT, text: body },
      // Actions for both ringer and non-ringer to unify UX
      actions: [
        { title: 'Done',      pressAction: { id: 'done' } },
        { title: 'Snooze 5',  pressAction: { id: 'snooze_5' } },
        { title: 'Snooze 10', pressAction: { id: 'snooze_10' } },
        { title: 'Snooze 15', pressAction: { id: 'snooze_15' } },
        { title: 'Snooze 30', pressAction: { id: 'snooze_30' } },
      ],
    },
  }, trigger);
}