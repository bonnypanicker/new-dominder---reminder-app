import { Platform, Alert } from 'react-native';
import notifee, { AndroidStyle, AndroidCategory, AndroidImportance } from '@notifee/react-native';
import { Reminder } from '@/types/reminder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { currentRingerChannelId } from '@/services/channels';

const ANDROID_IMPORTANCE_HIGH = 4 as const;
const ANDROID_IMPORTANCE_DEFAULT = 3 as const;
const ANDROID_IMPORTANCE_LOW = 2 as const;
const ANDROID_VISIBILITY_PUBLIC = 1 as const;
const TRIGGER_TYPE_TIMESTAMP = 0 as const;
const EVENT_TYPE_PRESS = 1 as const;
const EVENT_TYPE_DISMISSED = 3 as const;

type TimestampTrigger = { type: number; timestamp: number; alarmManager?: { allowWhileIdle?: boolean } };

type NotifeeNotification = {
  id?: string;
  title?: string;
  body?: string;
  android?: any;
  data?: Record<string, any>;
};

type NotifeeModule = {
  requestPermission: () => Promise<any>;
  createChannel: (channel: any) => Promise<void>;
  createTriggerNotification: (notification: NotifeeNotification, trigger: TimestampTrigger) => Promise<string>;
  cancelNotification: (id: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  cancelDisplayedNotifications?: () => Promise<void>;
  getTriggerNotifications: () => Promise<any[]>;
  getDisplayedNotifications: () => Promise<any[]>;
  displayNotification: (notification: NotifeeNotification) => Promise<string>;
  getNotificationSettings: () => Promise<any>;
  openAlarmPermissionSettings: () => Promise<void>;
  onForegroundEvent: (handler: (event: any) => void) => () => void;
  onBackgroundEvent: (handler: (event: any) => Promise<void>) => () => void;
};


export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      if (Platform.OS !== 'android') {
        console.log('Notifications supported only on Android for this build.');
        return false;
      }

      if (!notifee) return false;

      console.log('Requesting POST_NOTIFICATIONS permission...');
      await notifee.requestPermission();

      await ensureBaseChannels();

      const hasExact = await this.checkExactAlarmPermission();
      if (!hasExact) {
        try {
          Alert.alert(
            'Exact alarms disabled',
            'To ring exactly on time, enable Exact alarms for DoMinder in system settings. We will still schedule reminders, but they may be delayed.',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Open settings', onPress: async () => { try { await notifee.openAlarmPermissionSettings(); } catch {} } },
            ],
          );
        } catch {}
        try {
          await this.displayInfoNotification(
            'Exact alarms disabled',
            'Open DoMinder and enable Exact alarms in system settings for precise reminders.'
          );
        } catch {}
      }

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  async scheduleReminderByModel(reminder: Reminder): Promise<string | null> {
    console.log(`[scheduleReminderByModel] for reminder: ${reminder.id}`);
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return null;
    }

    if (Platform.OS !== 'android') {
      console.log('Notifications not supported on this platform');
      return null;
    }

    if (!notifee) return null;

    const hasExactAlarmPerm = await this.checkExactAlarmPermission();
    if (!hasExactAlarmPerm) {
      console.log('Exact alarm permission not granted, notification may be delayed.');
    }

    const triggerDate = this.calculateTriggerDate(reminder);
    if (!triggerDate) {
      console.log(`Cannot schedule notification for reminder ${reminder.id}: no valid trigger date`);
      return null;
    }

    console.log(`Scheduling notification for reminder ${reminder.id} at ${triggerDate.toISOString()}`);

    const trigger: TimestampTrigger = {
      type: TRIGGER_TYPE_TIMESTAMP,
      timestamp: triggerDate.getTime(),
      alarmManager: hasExactAlarmPerm ? { allowWhileIdle: true } : undefined,
    };
    console.log(`[scheduleReminderByModel] trigger:`, trigger);

    const formattedReminderTime = triggerDate.toLocaleString([], {
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });

    try {
      let channelId = 'standard_v3';
      let androidConfig: any = {
        channelId: 'standard_v3',
        ongoing: reminder.priority === 'medium',
        autoCancel: reminder.priority !== 'medium',
        actions: [
          { title: 'Done', pressAction: { id: 'done' } },
          { title: 'Snooze 5m', pressAction: { id: 'snooze_5' } },
        ],
        pressAction: { id: 'default' },
        asForegroundService: false,
        timestamp: triggerDate.getTime(),
        showTimestamp: true,
        style: { type: AndroidStyle.BIGTEXT, text: `${reminder.description}\n⏰ Reminder: ${formattedReminderTime}` }
      };

      if (reminder.priority === 'high') {
        channelId = await currentRingerChannelId();
        androidConfig = {
          channelId,
          importance: AndroidImportance.HIGH,
          category: AndroidCategory.ALARM,
          ongoing: true,
          lightUpScreen: true,
          fullScreenAction: { id: 'alarm' },
          actions: [
            { title: 'Done', pressAction: { id: 'done' } },
            { title: 'Snooze 5m', pressAction: { id: 'snooze_5' } },
            { title: 'Snooze 10m', pressAction: { id: 'snooze_10' } },
            { title: 'Snooze 15m', pressAction: { id: 'snooze_15' } },
            { title: 'Snooze 30m', pressAction: { id: 'snooze_30' } },
          ],
          pressAction: { id: 'default' },
          asForegroundService: false,
          timestamp: triggerDate.getTime(),
          showTimestamp: true,
          style: { type: AndroidStyle.BIGTEXT, text: `${reminder.description}\n⏰ Reminder: ${formattedReminderTime}` }
        };
      } else if (reminder.priority === 'medium') {
        channelId = 'standard_v3';
      } else {
        channelId = 'silent_v3';
      }

      const notificationId = await notifee.createTriggerNotification(
        {
          title: reminder.title,
          body: `${reminder.description}\n⏰ Reminder: ${formattedReminderTime}`,
          android: androidConfig,
          data: { reminderId: reminder.id, title: reminder.title },
        },
        trigger,
      );
      console.log(`Notification scheduled: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (!notifee) return;
    try {
      await notifee.cancelNotification(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotificationsForReminder(reminderId: string): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (!notifee) return;
    try {
      const notifications = await notifee.getTriggerNotifications();
      for (const n of notifications) {
        const rid = n.notification?.data?.reminderId as string | undefined;
        if (rid === reminderId) {
          await notifee.cancelNotification(n.notification.id);
        }
      }
    } catch (error) {
      console.error(`Failed to cancel notifications for reminder ${reminderId}:`, error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (!notifee) return;
    try {
      await notifee.cancelAllNotifications();
      if (typeof notifee.cancelDisplayedNotifications === 'function') {
        await notifee.cancelDisplayedNotifications();
      }
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async hasScheduledForReminder(reminderId: string): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (!notifee) return false;
    try {
      const notifications = await notifee.getTriggerNotifications();
      return notifications.some((n: any) => n.notification?.data?.reminderId === reminderId);
    } catch (e) {
      console.error('Error checking scheduled notifications:', e);
      return false;
    }
  }

  async cleanupOrphanedNotifications(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (!notifee) return;
    try {
      const scheduledNotifications = await notifee.getTriggerNotifications();
      console.log(`Found ${scheduledNotifications.length} scheduled notifications`);

      const stored = await AsyncStorage.getItem('dominder_reminders');
      const currentReminders: any[] = stored ? JSON.parse(stored) : [];
      const activeReminderIds = new Set(
        currentReminders
          .filter((r) => r.isActive && !r.isCompleted && !r.isExpired && !r.isPaused)
          .map((r) => r.id),
      );

      for (const notification of scheduledNotifications) {
        const reminderId = notification.notification.data?.reminderId as string | undefined;
        if (!reminderId || !activeReminderIds.has(reminderId)) {
          await notifee.cancelNotification(notification.notification.id);
          console.log(`Cancelled orphaned notification ${notification.notification.id} for reminder ${reminderId}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned notifications:', error);
    }
  }

  async displayInfoNotification(title: string, body: string): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (!notifee) return;
    try {
      await notifee.displayNotification({
        title,
        body,
        android: { channelId: 'standard_v4', ongoing: true, pressAction: { id: 'default' } },
      });
    } catch (e) {
      console.error('Failed to display info notification:', e);
    }
  }

  async checkExactAlarmPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    if (!notifee) return false;

    const settings = await notifee.getNotificationSettings();
    if (settings.android.alarm === 1) {
      return true;
    }

    await notifee.openAlarmPermissionSettings();
    return false;
  }

  subscribeToEvents(handler: (event: any) => void | Promise<void>): () => void {
    if (Platform.OS !== 'android') return () => {};
    if (!notifee) return () => {};
    try {
      const unsub = notifee.onForegroundEvent(handler);
      return () => {
        try { unsub?.(); } catch {}
      };
    } catch (e) {
      console.error('Failed to subscribe to notifee events:', e);
      return () => {};
    }
  }

  private calculateTriggerDate(reminder: Reminder): Date | null {
    console.log(`[calculateTriggerDate] for reminder: ${reminder.id}`);
    try {
      const now = new Date();

      if (reminder.snoozeUntil) {
        const snoozeDate = new Date(reminder.snoozeUntil);
        if (snoozeDate > now) {
          return snoozeDate;
        }
      }

      if (reminder.repeatType !== 'none' && reminder.nextReminderDate) {
        const nextDate = new Date(reminder.nextReminderDate);
        if (nextDate > now) {
          return nextDate;
        }
      }

      const dateParts = reminder.date.split('-');
      const year = parseInt(dateParts[0] || '0', 10);
      const month = parseInt(dateParts[1] || '1', 10);
      const day = parseInt(dateParts[2] || '1', 10);

      const timeParts = reminder.time.split(':');
      const hh = parseInt(timeParts[0] || '0', 10);
      const mm = parseInt(timeParts[1] || '0', 10);

      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hh) || isNaN(mm)) {
        return null;
      }

      const triggerDate = new Date(year, month - 1, day, hh, mm, 0, 0);
      if (isNaN(triggerDate.getTime())) {
        return null;
      }

      if (reminder.repeatType === 'none') {
        if (triggerDate <= now) {
          return null;
        }
        return triggerDate;
      }

      const nextFire = this.computeNextFireForNotification(reminder, now);
      if (nextFire) return nextFire;
      return null;
    } catch (error) {
      console.error('Error calculating trigger date for reminder:', reminder.id, error);
      return null;
    }
  }

  private computeNextFireForNotification(reminder: Reminder, now: Date): Date | null {
    const timeParts = reminder.time.split(':');
    const hh = parseInt(timeParts[0] || '0', 10);
    const mm = parseInt(timeParts[1] || '0', 10);

    const setTime = (d: Date): Date => {
      d.setHours(hh, mm, 0, 0);
      return d;
    };

    switch (reminder.repeatType) {
      case 'daily': {
        const selected = reminder.repeatDays && reminder.repeatDays.length > 0 ? reminder.repeatDays : [0, 1, 2, 3, 4, 5, 6];
        for (let add = 0; add < 8; add++) {
          const check = setTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() + add));
          if (selected.includes(check.getDay()) && check > now) return check;
        }
        return null;
      }
      case 'monthly': {
        const dateParts = reminder.date.split('-');
        const day = parseInt(dateParts[2] || '1', 10);
        const dayOfMonth = reminder.monthlyDay ?? day;

        let target = setTime(new Date(now.getFullYear(), now.getMonth(), 1));
        const daysInThisMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        const dayToUse = Math.min(dayOfMonth, daysInThisMonth);
        target.setDate(dayToUse);

        if (target <= now) {
          target.setMonth(target.getMonth() + 1);
          const daysInNextMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
          const nextDayToUse = Math.min(dayOfMonth, daysInNextMonth);
          target.setDate(nextDayToUse);
        }
        return target;
      }
      case 'every': {
        const interval = reminder.everyInterval;
        if (!interval || !interval.value || interval.value <= 0) return null;
        const start = setTime(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
        const baseStart = new Date(reminder.date);
        baseStart.setHours(hh, mm, 0, 0);
        let candidate = baseStart > now ? baseStart : start;
        const addMs = interval.unit === 'minutes' ? interval.value * 60 * 1000 : interval.unit === 'hours' ? interval.value * 60 * 60 * 1000 : interval.value * 24 * 60 * 60 * 1000;
        if (candidate <= now) {
          const diff = now.getTime() - candidate.getTime();
          const steps = Math.floor(diff / addMs) + 1;
          candidate = new Date(candidate.getTime() + steps * addMs);
        }
        return candidate;
      }
      case 'yearly': {
        const dateParts = reminder.date.split('-');
        const month = parseInt(dateParts[1] || '1', 10);
        const day = parseInt(dateParts[2] || '1', 10);
        const target = setTime(new Date(now.getFullYear(), month - 1, day));
        if (target <= now) target.setFullYear(target.getFullYear() + 1);
        return target;
      }
      case 'weekly':
      case 'custom': {
        const selected = reminder.repeatDays ?? [];
        if (selected.length === 0) return null;
        for (let add = 0; add < 370; add++) {
          const check = setTime(new Date(now.getFullYear(), now.getMonth(), now.getDate() + add));
          if (selected.includes(check.getDay()) && check > now) return check;
        }
        return null;
      }
      default:
        return null;
    }
  }
}

export const notificationService = NotificationService.getInstance();