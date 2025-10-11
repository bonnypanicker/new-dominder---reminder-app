import notifee, {
  AndroidCategory, AndroidImportance, AndroidStyle,
  TriggerType, TimestampTrigger, AuthorizationStatus, AndroidNotificationSetting,
} from '@notifee/react-native';
import { Reminder } from '@/types/reminder';
import { ensureBaseChannels } from '@/services/channels';
import AsyncStorage from '@react-native-async-storage/async-storage';

function bodyWithTime(desc: string | undefined, when: number) {
  const formatted = new Date(when).toLocaleString([], {
    hour: '2-digit', minute: '2-digit', weekday: 'short', day: 'numeric', month: 'short',
  });
  return [desc?.trim(), `⏰ ${formatted}`].filter(Boolean).join('\n');
}

function computeNextFireTime(reminder: Reminder): number | null {
  const now = new Date();
  
  if (!reminder.isActive || reminder.isCompleted || reminder.isExpired || reminder.isPaused) {
    return null;
  }

  if (reminder.snoozeUntil) {
    const snoozeDate = new Date(reminder.snoozeUntil);
    if (snoozeDate > now) {
      console.log(`[Dominder-Debug] Reminder ${reminder.id} is snoozed until ${snoozeDate.toISOString()}`);
      return snoozeDate.getTime();
    }
  }

  if (reminder.nextReminderDate && reminder.repeatType !== 'none') {
    const nextDate = new Date(reminder.nextReminderDate);
    if (nextDate > now) {
      console.log(`[Dominder-Debug] Reminder ${reminder.id} has nextReminderDate: ${nextDate.toISOString()}`);
      return nextDate.getTime();
    }
  }

  const dateParts = reminder.date.split('-');
  const year = parseInt(dateParts[0] || '0', 10);
  const month = parseInt(dateParts[1] || '1', 10);
  const day = parseInt(dateParts[2] || '1', 10);
  const base = new Date(year, month - 1, day);

  const timeParts = reminder.time.split(':');
  const hh = parseInt(timeParts[0] || '0', 10);
  const mm = parseInt(timeParts[1] || '0', 10);

  const setTime = (d: Date): Date => {
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  const clone = (d: Date): Date => new Date(d.getTime());

  switch (reminder.repeatType) {
    case 'none': {
      const target = setTime(clone(base));
      if (target > now) {
        console.log(`[Dominder-Debug] Once reminder ${reminder.id} scheduled for ${target.toISOString()}`);
        return target.getTime();
      }
      console.log(`[Dominder-Debug] Once reminder ${reminder.id} time has passed`);
      return null;
    }
    case 'daily': {
      const selected = (reminder.repeatDays && reminder.repeatDays.length > 0)
        ? reminder.repeatDays
        : [0,1,2,3,4,5,6];
      for (let add = 0; add < 8; add++) {
        const check = setTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() + add));
        if (selected.includes(check.getDay()) && check > now) {
          console.log(`[Dominder-Debug] Daily reminder ${reminder.id} next fire: ${check.toISOString()}`);
          return check.getTime();
        }
      }
      return null;
    }
    case 'monthly': {
      const dayOfMonth = reminder.monthlyDay ?? base.getDate();
      let candidate = setTime(new Date(now.getFullYear(), now.getMonth(), dayOfMonth));
      if (candidate <= now) {
        candidate = setTime(new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth));
      }
      console.log(`[Dominder-Debug] Monthly reminder ${reminder.id} next fire: ${candidate.toISOString()}`);
      return candidate.getTime();
    }
    case 'yearly': {
      const target = setTime(new Date(now.getFullYear(), month - 1, day));
      if (target <= now) target.setFullYear(target.getFullYear() + 1);
      console.log(`[Dominder-Debug] Yearly reminder ${reminder.id} next fire: ${target.toISOString()}`);
      return target.getTime();
    }
    case 'every': {
      const interval = reminder.everyInterval;
      if (!interval || !interval.value || interval.value <= 0) return null;

      const start = new Date(reminder.date);
      start.setHours(hh, mm, 0, 0);
      if (isNaN(start.getTime())) return null;

      const addMs =
        interval.unit === 'minutes'
          ? interval.value * 60 * 1000
          : interval.unit === 'hours'
          ? interval.value * 60 * 60 * 1000
          : interval.value * 24 * 60 * 60 * 1000;

      let candidate = reminder.lastTriggeredAt ? new Date(reminder.lastTriggeredAt) : start;
      
      while (candidate.getTime() <= now.getTime()) {
        candidate = new Date(candidate.getTime() + addMs);
      }

      console.log(`[Dominder-Debug] Every reminder ${reminder.id} next fire: ${candidate.toISOString()}`);
      return candidate.getTime();
    }
    case 'weekly':
    case 'custom': {
      const selected = reminder.repeatDays ?? [];
      if (selected.length === 0) return null;
      for (let add = 0; add < 370; add++) {
        const check = setTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() + add));
        if (selected.includes(check.getDay()) && check > now) {
          console.log(`[Dominder-Debug] Weekly/Custom reminder ${reminder.id} next fire: ${check.toISOString()}`);
          return check.getTime();
        }
      }
      return null;
    }
    default:
      console.log(`[Dominder-Debug] Unknown repeat type: ${reminder.repeatType}`);
      return null;
  }
}

class NotificationService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    console.log('[Dominder-Debug] NotificationService: Initializing');
    await ensureBaseChannels();
    this.initialized = true;
    console.log('[Dominder-Debug] NotificationService: Initialized');
  }

  async checkPermissions(): Promise<boolean> {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  }

  async requestPermissions(): Promise<boolean> {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  }

  async scheduleReminderByModel(reminder: Reminder): Promise<string | null> {
    try {
      console.log(`[Dominder-Debug] scheduleReminderByModel called for reminder ${reminder.id}`);
      
      const when = computeNextFireTime(reminder);
      if (!when) {
        console.log(`[Dominder-Debug] No valid fire time for reminder ${reminder.id}`);
        return null;
      }

      const now = Date.now();
      const timeUntilFire = when - now;
      console.log(`[Dominder-Debug] Scheduling reminder ${reminder.id} for ${new Date(when).toISOString()} (in ${Math.round(timeUntilFire / 1000)}s)`);

      const settings = await notifee.getNotificationSettings();
      if (settings.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
        console.log('[Dominder-Debug] No notification permission, requesting...');
        await notifee.requestPermission();
      }
      const exactEnabled = settings?.android?.alarm === AndroidNotificationSetting.ENABLED;
      console.log(`[Dominder-Debug] Exact alarm enabled: ${exactEnabled}`);

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: when,
        alarmManager: {
          allowWhileIdle: true,
        },
      };

      const isRinger = reminder.priority === 'high';
      const channelId = isRinger ? 'alarm-v2' : reminder.priority === 'medium' ? 'standard-v2' : 'silent-v2';

      const body = bodyWithTime(reminder.description, when);
      const notificationId = `rem-${reminder.id}`;

      console.log(`[Dominder-Debug] Creating trigger notification with ID: ${notificationId}, channel: ${channelId}, isRinger: ${isRinger}`);

      await notifee.createTriggerNotification({
        id: notificationId,
        title: reminder.title,
        body,
        data: { reminderId: reminder.id },
        android: {
          channelId,
          importance: isRinger ? AndroidImportance.HIGH : AndroidImportance.DEFAULT,
          category: isRinger ? AndroidCategory.ALARM : AndroidCategory.REMINDER,
          lightUpScreen: isRinger,
          ongoing: true,
          autoCancel: false,
          pressAction: { id: isRinger ? 'open_alarm' : 'default' },
          fullScreenAction: isRinger ? { id: 'alarm', launchActivity: 'default' } : undefined,
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
      }, trigger);

      console.log(`[Dominder-Debug] Successfully scheduled notification ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error(`[Dominder-Debug] Error scheduling reminder ${reminder.id}:`, error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      console.log(`[Dominder-Debug] Cancelling notification: ${notificationId}`);
      await notifee.cancelNotification(notificationId);
    } catch (error) {
      console.error(`[Dominder-Debug] Error cancelling notification ${notificationId}:`, error);
    }
  }

  async cancelAllNotificationsForReminder(reminderId: string): Promise<void> {
    try {
      console.log(`[Dominder-Debug] Cancelling all notifications for reminder: ${reminderId}`);
      const triggers = await notifee.getTriggerNotifications();
      const toCancel = triggers.filter((t: any) => 
        t.notification?.data?.reminderId === reminderId
      );
      
      for (const trigger of toCancel) {
        if (trigger.notification?.id) {
          await notifee.cancelNotification(trigger.notification.id);
          console.log(`[Dominder-Debug] Cancelled notification ${trigger.notification.id}`);
        }
      }
    } catch (error) {
      console.error(`[Dominder-Debug] Error cancelling notifications for reminder ${reminderId}:`, error);
    }
  }

  async hasScheduledForReminder(reminderId: string): Promise<boolean> {
    try {
      const triggers = await notifee.getTriggerNotifications();
      return triggers.some((t: any) => t.notification?.data?.reminderId === reminderId);
    } catch (error) {
      console.error(`[Dominder-Debug] Error checking scheduled notifications:`, error);
      return false;
    }
  }

  async getAllScheduledNotifications(): Promise<any[]> {
    try {
      return await notifee.getTriggerNotifications();
    } catch (error) {
      console.error(`[Dominder-Debug] Error getting scheduled notifications:`, error);
      return [];
    }
  }

  async cleanupOrphanedNotifications(): Promise<void> {
    try {
      console.log('[Dominder-Debug] Cleaning up orphaned notifications');
      const stored = await AsyncStorage.getItem('dominder_reminders');
      const reminders: Reminder[] = stored ? JSON.parse(stored) : [];
      const validReminderIds = new Set(reminders.map(r => r.id));
      
      const triggers = await notifee.getTriggerNotifications();
      let cleanedCount = 0;
      
      for (const trigger of triggers) {
        const reminderId = trigger.notification?.data?.reminderId;
        if (typeof reminderId === 'string' && !validReminderIds.has(reminderId)) {
          if (trigger.notification?.id) {
            await notifee.cancelNotification(trigger.notification.id);
            cleanedCount++;
            console.log(`[Dominder-Debug] Cleaned orphaned notification for deleted reminder: ${reminderId}`);
          }
        }
      }
      
      console.log(`[Dominder-Debug] Cleaned ${cleanedCount} orphaned notifications`);
    } catch (error) {
      console.error('[Dominder-Debug] Error cleaning orphaned notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();
export const scheduleReminderByModel = (reminder: Reminder) => notificationService.scheduleReminderByModel(reminder);