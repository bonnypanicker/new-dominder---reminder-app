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
  scheduleAlarm?: (reminderId: string, title: string, triggerTimeMillis: number) => void;
  cancelAlarm?: (reminderId: string) => void;
} | null = Platform.OS === 'android' ? (NativeModules as any)?.AlarmModule ?? null : null;

if (Platform.OS === 'android') {
  const available = !!(AlarmModule && (typeof AlarmModule.scheduleAlarm === 'function'));
  console.log('[NotificationService] AlarmModule availability:', available ? 'Available' : 'NULL');
  if (available && AlarmModule) {
    console.log('[NotificationService] AlarmModule methods:', Object.keys(AlarmModule));
  }
}

function bodyWithTime(desc: string | undefined, when: number) {
  const formatted = new Date(when).toLocaleString([], {
    hour: '2-digit', minute: '2-digit', weekday: 'short', day: 'numeric', month: 'short',
  });
  return [desc?.trim(), `⏰ ${formatted}`].filter(Boolean).join('\n');
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
  console.log(`[NotificationService] Scheduling reminder ${reminder.id}, priority: ${reminder.priority}, repeatType: ${reminder.repeatType}`);
  
  const when = reminderToTimestamp(reminder);
  const now = Date.now();
  
  if (when <= now) {
    console.log(`[NotificationService] Reminder ${reminder.id} time ${new Date(when).toISOString()} is in the past, skipping`);
    return;
  }
  
  console.log(`[NotificationService] Scheduling for ${new Date(when).toISOString()}`);

  const isRinger = reminder.priority === 'high';

  if (isRinger) {
    const canUseNative = !!(AlarmModule && typeof AlarmModule.scheduleAlarm === 'function');
    if (!canUseNative) {
      console.warn('[NotificationService] AlarmModule.scheduleAlarm unavailable (Expo Go or not linked). Falling back to notifee.');
    } else {
      try {
        AlarmModule?.scheduleAlarm?.(reminder.id, reminder.title, when);
        console.log(`[NotificationService] Scheduled native alarm for rem-${reminder.id}`);
        return;
      } catch (e) {
        console.error('[NotificationService] Native scheduleAlarm threw, falling back to notifee:', e);
      }
    }
  }
  
  {
    // Use notifee for medium/low priority OR as fallback for high priority
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

    const notificationConfig: any = {
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
        importance: AndroidImportance.DEFAULT,
        category: AndroidCategory.REMINDER,
        lightUpScreen: false,
        ongoing: true,
        autoCancel: false,
        pressAction: { 
          id: 'default',
          launchActivity: 'default'
        },
        showTimestamp: true,
        timestamp: when,
        style: { type: AndroidStyle.BIGTEXT, text: body },
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
    await notifee.cancelNotification(notificationId);
    const remId = notificationId.replace('rem-', '');
    if (AlarmModule && typeof AlarmModule.cancelAlarm === 'function') {
      try {
        AlarmModule.cancelAlarm(remId);
      } catch (e) {
        console.warn('[NotificationService] Native cancelAlarm failed, continuing:', e);
      }
    }
    console.log(`[NotificationService] Cancelled notification ${notificationId}`);
  } catch (error) {
    console.error(`[NotificationService] Error cancelling notification ${notificationId}:`, error);
  }
}

export async function cancelAllNotificationsForReminder(reminderId: string) {
  try {
    await notifee.cancelNotification(`rem-${reminderId}`);
    if (AlarmModule && typeof AlarmModule.cancelAlarm === 'function') {
      try {
        AlarmModule.cancelAlarm(reminderId);
      } catch (e) {
        console.warn('[NotificationService] Native cancelAlarm failed, continuing:', e);
      }
    }
    console.log(`[NotificationService] Cancelled all notifications for reminder ${reminderId}`);
  } catch (error) {
    console.error(`[NotificationService] Error cancelling notifications for reminder ${reminderId}:`, error);
  }
}

export async function cleanupOrphanedNotifications() {
  try {
    const displayed = await notifee.getDisplayedNotifications();
    const triggered = await notifee.getTriggerNotifications();
    console.log(`[NotificationService] Cleanup: ${displayed.length} displayed, ${triggered.length} triggered`);
  } catch (error) {
    console.error('[NotificationService] Error during cleanup:', error);
  }
}

export async function initialize() {
  try {
    const { ensureBaseChannels } = require('@/services/channels');
    await ensureBaseChannels();
    console.log('[NotificationService] Initialized');
  } catch (error) {
    console.error('[NotificationService] Initialization error:', error);
  }
}

export const notificationService = {
  scheduleReminderByModel,
  cancelNotification,
  cancelAllNotificationsForReminder,
  cleanupOrphanedNotifications,
  initialize,
};