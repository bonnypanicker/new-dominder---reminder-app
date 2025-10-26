import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidStyle,
  TriggerType,
  TimestampTrigger,
  AuthorizationStatus,
  AndroidNotificationSetting,
} from '@notifee/react-native';
import { Reminder } from '@/types/reminder';
import { NativeModules, Platform } from 'react-native';

const AlarmModule: {
  scheduleAlarm?: (reminderId: string, title: string, triggerTimeMillis: number, priority?: string) => void;
  scheduleRepeatingAlarm?: (
    reminderId: string,
    title: string,
    triggerTimeMillis: number,
    priority: string,
    repeatType: string,
    everyValue: number,
    everyUnit: string,
  ) => void;
  cancelAlarm?: (reminderId: string) => void;
} | null = Platform.OS === 'android' ? (NativeModules as any)?.AlarmModule ?? null : null;

if (Platform.OS === 'android') {
  const available = !!(AlarmModule && (typeof AlarmModule.scheduleAlarm === 'function'));
  console.log('[NotificationService] AlarmModule availability:', available ? 'Available' : 'NULL');
  if (available && AlarmModule) {
    console.log('[NotificationService] AlarmModule methods:', Object.keys(AlarmModule));
  }
}

function formatSmartDateTime(when: number): string {
  const reminderDate = new Date(when);
  const now = new Date();
  
  // Reset time to start of day for date comparison
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
    // Full date and time
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

function formatRepeatType(repeatType: string, everyInterval?: { value: number; unit: string }): string {
  switch (repeatType) {
    case 'none': return 'Once';
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'yearly': return 'Yearly';
    case 'every':
      if (everyInterval) {
        return `Every ${everyInterval.value} ${everyInterval.unit}`;
      }
      return 'Every';
    case 'custom': return 'Custom';
    default: return 'Once';
  }
}

function bodyWithTime(desc: string | undefined, when: number) {
  const formatted = formatSmartDateTime(when);
  return [desc?.trim(), formatted].filter(Boolean).join('\n');
}

function reminderToTimestamp(reminder: Reminder): number {
  if (reminder.snoozeUntil) {
    return new Date(reminder.snoozeUntil).getTime();
  }
  
  if (reminder.nextReminderDate) {
    return new Date(reminder.nextReminderDate).getTime();
  }
  
  const [year, month, day] = reminder.date.split('-').map(Number);
  const [hours, minutes] = reminder.time.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return date.getTime();
}

export async function scheduleReminderByModel(reminder: Reminder) {
  // At the start of scheduleReminderByModel
  let permissionSettings = await notifee.getNotificationSettings();
  if (permissionSettings.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
    console.log('[NotificationService] Requesting notification permission...');
    await notifee.requestPermission();
    permissionSettings = await notifee.getNotificationSettings();
  }

  if (permissionSettings.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
    console.error('[NotificationService] Notification permission denied');
    throw new Error('Notification permission denied');
  }

  console.log(`[NotificationService] Scheduling reminder ${reminder.id}, priority: ${reminder.priority}, repeatType: ${reminder.repeatType}`);
  
  const when = reminderToTimestamp(reminder);
  const now = Date.now();
  
  if (when <= now) {
    console.log(`[NotificationService] Reminder ${reminder.id} time ${new Date(when).toISOString()} is in the past, skipping`);
    return;
  }
  
  console.log(`[NotificationService] Scheduling for ${new Date(when).toISOString()}`);

  const isRinger = reminder.priority === 'high';
  const isEveryRepeat = reminder.repeatType === 'every' && reminder.everyInterval && reminder.everyInterval.value > 0;

  // Prefer native scheduling for 'every' repeats (all priorities) and for high-priority alarms
  const canUseNative = !!(AlarmModule && (typeof AlarmModule.scheduleAlarm === 'function'));
  if (!canUseNative) {
    console.warn('[NotificationService] AlarmModule unavailable (Expo Go or not linked). Using notifee for scheduling.');
  }

  if (canUseNative && (isEveryRepeat || isRinger)) {
    try {
      if (isEveryRepeat && typeof AlarmModule?.scheduleRepeatingAlarm === 'function') {
        const interval = reminder.everyInterval!;
        AlarmModule?.scheduleRepeatingAlarm?.(
          reminder.id,
          reminder.title,
          when,
          reminder.priority,
          'every',
          interval.value,
          interval.unit,
        );
        console.log(`[NotificationService] Scheduled native repeating alarm for rem-${reminder.id} every ${interval.value} ${interval.unit}`);
        return;
      } else {
        AlarmModule?.scheduleAlarm?.(reminder.id, reminder.title, when, reminder.priority);
        console.log(`[NotificationService] Scheduled native alarm for rem-${reminder.id} with priority ${reminder.priority}`);
        return;
      }
    } catch (e) {
      console.error('[NotificationService] Native scheduling threw, falling back to notifee:', e);
    }
  }
  
  {
    // Use notifee for medium/low priority OR when native module is unavailable
    let s = await notifee.getNotificationSettings();
    if (s.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
      await notifee.requestPermission();
      s = await notifee.getNotificationSettings();
    }
    const exactEnabled = s?.android?.alarm === AndroidNotificationSetting.ENABLED;

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: when,
      alarmManager: exactEnabled ? { allowWhileIdle: true } : undefined,
    };

    const channelId = reminder.priority === 'high' ? 'alarm-v2' : 
                      reminder.priority === 'medium' ? 'standard-v2' : 'silent-v2';

    const body = bodyWithTime(reminder.description, when);
    const repeatTypeLabel = formatRepeatType(reminder.repeatType, reminder.everyInterval);

    const notificationConfig: any = {
      id: `rem-${reminder.id}`,
      title: reminder.title,
      subtitle: repeatTypeLabel, // Add repeat type next to app name
      body,
      data: { 
        reminderId: reminder.id, 
        priority: reminder.priority,
        title: reminder.title,
        route: 'index'
      },
      android: {
        channelId,
        importance: reminder.priority === 'high' ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
        category: reminder.priority === 'high' ? AndroidCategory.ALARM : AndroidCategory.REMINDER,
        smallIcon: 'small_icon_noti',
        color: '#6750A4',
        lightUpScreen: reminder.priority === 'high',
        ongoing: true,
        autoCancel: false,
        pressAction: { 
          id: 'default',
          launchActivity: 'default'
        },
        showTimestamp: false, // Remove clock icon by disabling timestamp
        style: { 
          type: AndroidStyle.BIGTEXT, 
          text: body 
        },
        actions: [
          { title: 'Done',      pressAction: { id: 'done' } },
          { title: 'Snooze 5',  pressAction: { id: 'snooze_5' } },
          { title: 'Snooze 10', pressAction: { id: 'snooze_10' } },
          { title: 'Snooze 15', pressAction: { id: 'snooze_15' } },
          { title: 'Snooze 30', pressAction: { id: 'snooze_30' } },
        ],
      },
    };

    await notifee.createTriggerNotification(notificationConfig, trigger);
    
    console.log(`[NotificationService] Successfully scheduled notification rem-${reminder.id}`);
  }
}

export async function cancelNotification(notificationId: string) {
  try {
    // Cancel scheduled (trigger) notification
    await notifee.cancelNotification(notificationId);
    
    // Cancel displayed notification (if showing in notification center)
    await notifee.cancelDisplayedNotification(notificationId);
    
    // Cancel native alarm
    const remId = notificationId.replace('rem-', '');
    if (AlarmModule && typeof AlarmModule.cancelAlarm === 'function') {
      try {
        AlarmModule.cancelAlarm(remId);
      } catch (e) {
        console.warn('[NotificationService] Native cancelAlarm failed, continuing:', e);
      }
    }
  } catch (e) {
    console.error('[NotificationService] cancelNotification failed:', e);
  }
}

export async function cancelAllNotificationsForReminder(reminderId: string) {
  try {
    await notifee.cancelNotification(`rem-${reminderId}`);
    await notifee.cancelDisplayedNotification(`rem-${reminderId}`);
    if (AlarmModule && typeof AlarmModule.cancelAlarm === 'function') {
      try { AlarmModule.cancelAlarm(reminderId); } catch {}
    }
  } catch (e) {
    console.error('[NotificationService] cancelAllNotificationsForReminder failed:', e);
  }
}

export async function cleanupOrphanedNotifications() {
  try {
    await notifee.cancelAllNotifications();
  } catch (e) {
    console.error('[NotificationService] cleanupOrphanedNotifications failed:', e);
  }
}

export async function initialize() {
  try {
    // Any initialization required for notifee channels can be done here
    console.log('[NotificationService] initialize called');
  } catch (e) {
    console.error('[NotificationService] initialize failed:', e);
  }
}

export const notificationService = {
  scheduleReminderByModel,
  cancelNotification,
  cancelAllNotificationsForReminder,
  cleanupOrphanedNotifications,
  initialize,
};