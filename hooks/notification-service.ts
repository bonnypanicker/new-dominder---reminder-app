import notifee, {
  AndroidImportance,
  AndroidVisibility,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { Reminder } from '@/types/reminder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '@/hooks/settings-store';

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
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web');
        return false;
      }

      await notifee.requestPermission();

      // Create a channel for high-priority notifications
      await notifee.createChannel({
        id: 'high_priority',
        name: 'High Priority Reminders',
        importance: AndroidImportance.HIGH,
        vibration: true,
        vibrationPattern: [300, 500],
        visibility: AndroidVisibility.PUBLIC,
      });

      // Create a channel for default priority notifications
      await notifee.createChannel({
        id: 'default_priority',
        name: 'Default Priority Reminders',
        importance: AndroidImportance.DEFAULT,
        vibration: true,
        vibrationPattern: [300, 500],
        visibility: AndroidVisibility.PUBLIC,
      });

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  async scheduleNotification(reminder: Reminder): Promise<string | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return null;
    }

    if (Platform.OS === 'web') {
      console.log('Notifications not supported on web');
      return null;
    }

    const triggerDate = this.calculateTriggerDate(reminder);
    if (!triggerDate) {
      return null;
    }

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
    };

    try {
      const notificationId = await notifee.createTriggerNotification(
        {
          title: reminder.title,
          body: reminder.description,
          android: {
            channelId:
              reminder.priority === 'high'
                ? 'high_priority'
                : 'default_priority',
            actions: [
              {
                title: 'Done',
                pressAction: {
                  id: 'done',
                },
              },
              {
                title: 'Snooze 5m',
                pressAction: {
                  id: 'snooze',
                },
              },
            ],
          },
          data: {
            reminderId: reminder.id,
          },
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
    if (Platform.OS === 'web') return;

    try {
      await notifee.cancelNotification(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotificationsForReminder(reminderId: string): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const notifications = await notifee.getTriggerNotificationIds();
      for (const notificationId of notifications) {
        const notification = await notifee.getTriggerNotification(
          notificationId,
        );
        if (notification?.data?.reminderId === reminderId) {
          await notifee.cancelNotification(notificationId);
        }
      }
    } catch (error) {
      console.error(
        `Failed to cancel notifications for reminder ${reminderId}:`,
        error,
      );
    }
  }

  async cleanupOrphanedNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const scheduledNotifications = await notifee.getTriggerNotifications();
      console.log(`Found ${scheduledNotifications.length} scheduled notifications`);

      const stored = await AsyncStorage.getItem('dominder_reminders');
      const currentReminders: any[] = stored ? JSON.parse(stored) : [];
      const activeReminderIds = new Set(
        currentReminders
          .filter(
            (r) => r.isActive && !r.isCompleted && !r.isExpired && !r.isPaused,
          )
          .map((r) => r.id),
      );

      for (const notification of scheduledNotifications) {
        const reminderId = notification.notification.data?.reminderId as
          | string
          | undefined;

        if (!reminderId || !activeReminderIds.has(reminderId)) {
          await notifee.cancelNotification(notification.notification.id);
          console.log(
            `Cancelled orphaned notification ${notification.notification.id} for reminder ${reminderId}`,
          );
        }
      }
    } catch (error) {
      console.error('Failed to cleanup orphaned notifications:', error);
    }
  }

  private calculateTriggerDate(reminder: Reminder): Date | null {
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

      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        isNaN(hh) ||
        isNaN(mm)
      ) {
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
      if (nextFire) {
        return nextFire;
      }
      return null;
    } catch (error) {
      console.error(
        'Error calculating trigger date for reminder:',
        reminder.id,
        error,
      );
      return null;
    }
  }

  private computeNextFireForNotification(
    reminder: Reminder,
    now: Date,
  ): Date | null {
    const timeParts = reminder.time.split(':');
    const hh = parseInt(timeParts[0] || '0', 10);
    const mm = parseInt(timeParts[1] || '0', 10);

    const setTime = (d: Date): Date => {
      d.setHours(hh, mm, 0, 0);
      return d;
    };

    switch (reminder.repeatType) {
      case 'daily': {
        const selected =
          reminder.repeatDays && reminder.repeatDays.length > 0
            ? reminder.repeatDays
            : [0, 1, 2, 3, 4, 5, 6];
        for (let add = 0; add < 8; add++) {
          const check = setTime(
            new Date(now.getFullYear(), now.getMonth(), now.getDate() + add),
          );
          if (selected.includes(check.getDay()) && check > now) return check;
        }
        return null;
      }
      case 'monthly': {
        const dateParts = reminder.date.split('-');
        const day = parseInt(dateParts[2] || '1', 10);
        const dayOfMonth = reminder.monthlyDay ?? day;

        let target = setTime(new Date(now.getFullYear(), now.getMonth(), 1));
        const daysInThisMonth = new Date(
          target.getFullYear(),
          target.getMonth() + 1,
          0,
        ).getDate();
        const dayToUse = Math.min(dayOfMonth, daysInThisMonth);
        target.setDate(dayToUse);

        if (target <= now) {
          target.setMonth(target.getMonth() + 1);
          const daysInNextMonth = new Date(
            target.getFullYear(),
            target.getMonth() + 1,
            0,
          ).getDate();
          const nextDayToUse = Math.min(dayOfMonth, daysInNextMonth);
          target.setDate(nextDayToUse);
        }

        return target;
      }
      case 'every': {
        const interval = reminder.everyInterval;
        if (!interval || !interval.value || interval.value <= 0) return null;
        const start = setTime(
          new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        );
        const baseStart = new Date(reminder.date);
        baseStart.setHours(hh, mm, 0, 0);
        let candidate = baseStart > now ? baseStart : start;
        const addMs =
          interval.unit === 'minutes'
            ? interval.value * 60 * 1000
            : interval.unit === 'hours'
            ? interval.value * 60 * 60 * 1000
            : interval.value * 24 * 60 * 60 * 1000;
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
          const check = setTime(
            new Date(now.getFullYear(), now.getMonth(), now.getDate() + add),
          );
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