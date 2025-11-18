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
import type { Priority, RepeatType, EveryUnit } from '@/types/reminder';

const AlarmModule: {
  scheduleAlarm?: (reminderId: string, title: string, triggerTimeMillis: number, priority?: string) => void;
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

// Track scheduled timestamps to prevent collisions and add sequential delays
const scheduledTimestamps = new Map<number, string[]>(); // timestamp -> array of reminder IDs

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

// Apply sequential delay if multiple reminders are scheduled at the same time
function applySequentialDelay(baseTimestamp: number, reminderId: string): number {
  // Round to nearest second to group reminders
  const baseSecond = Math.floor(baseTimestamp / 1000) * 1000;
  
  // First, remove any existing entries for this reminder ID from all timestamps
  // This prevents stale entries when rescheduling repeating reminders
  for (const [timestamp, ids] of Array.from(scheduledTimestamps.entries())) {
    const index = ids.indexOf(reminderId);
    if (index !== -1) {
      ids.splice(index, 1);
      if (ids.length === 0) {
        scheduledTimestamps.delete(timestamp);
      }
    }
  }
  
  // Clean up old entries (older than 5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [timestamp, ids] of Array.from(scheduledTimestamps.entries())) {
    if (timestamp < fiveMinutesAgo) {
      scheduledTimestamps.delete(timestamp);
    }
  }
  
  // Find available slot starting from base timestamp
  let candidateTimestamp = baseSecond;
  let delayCount = 0;
  
  while (scheduledTimestamps.has(candidateTimestamp)) {
    // Slot taken by another reminder, try next second
    candidateTimestamp += 1000;
    delayCount++;
    
    // Limit to 60 seconds of delay
    if (delayCount >= 60) {
      console.warn(`[NotificationService] Max delay reached for ${reminderId}, using ${delayCount}s delay`);
      break;
    }
  }
  
  // Register this timestamp
  if (!scheduledTimestamps.has(candidateTimestamp)) {
    scheduledTimestamps.set(candidateTimestamp, []);
  }
  scheduledTimestamps.get(candidateTimestamp)!.push(reminderId);
  
  if (delayCount > 0) {
    console.log(`[NotificationService] Applied ${delayCount}s sequential delay to ${reminderId} (${new Date(baseSecond).toISOString()} -> ${new Date(candidateTimestamp).toISOString()})`);
  }
  
  return candidateTimestamp;
}

export async function scheduleReminderByModel(reminder: Reminder) {
  // Check if notifications are enabled in settings
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  try {
    const settingsStr = await AsyncStorage.getItem('dominder_settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      if (settings.notificationsEnabled === false) {
        console.log('[NotificationService] Notifications disabled in settings, skipping schedule');
        return;
      }
    }
  } catch (e) {
    console.log('[NotificationService] Error checking settings, proceeding with schedule');
  }

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

  // Check exact alarm permission for precise timing
  const exactAlarmEnabled = permissionSettings?.android?.alarm === AndroidNotificationSetting.ENABLED;
  if (!exactAlarmEnabled) {
    console.warn('[NotificationService] SCHEDULE_EXACT_ALARM permission not granted - notifications may be delayed');
    console.warn('[NotificationService] User should grant exact alarm permission in system settings');
    // Continue scheduling but notifications may be delayed
  } else {
    console.log('[NotificationService] SCHEDULE_EXACT_ALARM permission granted - using exact timing');
  }

  console.log(`[NotificationService] Scheduling reminder ${reminder.id}, priority: ${reminder.priority}, repeatType: ${reminder.repeatType}`);
  
  let when = reminderToTimestamp(reminder);
  const now = Date.now();
  
  if (when <= now) {
    console.log(`[NotificationService] Reminder ${reminder.id} time ${new Date(when).toISOString()} is in the past`);
    
    // For 'every' reminders, recalculate from current time instead of skipping
     if (reminder.repeatType === 'every') {
      console.log(`[NotificationService] Recalculating 'every' reminder from current time`);
      const { calculateNextReminderDate } = require('../services/reminder-utils');
      const newWhen = calculateNextReminderDate(reminder, new Date(now));
      
      if (newWhen) {
        when = newWhen.getTime();
        console.log(`[NotificationService] Rescheduled to: ${new Date(when).toISOString()}`);
      } else {
        // Graceful fallback: if we are within the configured endsAt window, deliver immediately
        // This avoids missing the final occurrence due to millisecond drift
        const withinEndsWindow = ((): boolean => {
          try {
            if (reminder.untilType !== 'endsAt' || !reminder.untilDate) return false;
            const [uy, um, ud] = reminder.untilDate.split('-').map((v) => parseInt(v || '0', 10));
            const endBoundary = new Date(uy, (um || 1) - 1, ud || 1);
            const isTimeBound = reminder.everyInterval?.unit === 'minutes' || reminder.everyInterval?.unit === 'hours';
            if (isTimeBound && reminder.untilTime) {
              const [eh, em] = reminder.untilTime.split(':').map((v) => parseInt(v || '0', 10));
              endBoundary.setHours(eh, em, 0, 0);
            } else {
              endBoundary.setHours(23, 59, 59, 999);
            }
            return now <= endBoundary.getTime();
          } catch (_) {
            return false;
          }
        })();

        if (withinEndsWindow) {
          const graceMs = 1500; // small delay to ensure future timestamp
          when = now + graceMs;
          console.log(`[NotificationService] Within endsAt window; delivering immediately with grace ${graceMs}ms at ${new Date(when).toISOString()}`);
        } else {
          console.log(`[NotificationService] Failed to recalculate reminder time and outside endsAt window, skipping`);
          return;
        }
      }
    } else {
      console.log(`[NotificationService] Non-repeating reminder in past, skipping`);
      return;
    }
  }
  
  // Apply sequential delay to prevent multiple reminders from firing simultaneously
  when = applySequentialDelay(when, reminder.id);
  
  console.log(`[NotificationService] Scheduling for ${new Date(when).toISOString()}`);

  const isRinger = reminder.priority === 'high';

  if (isRinger) {
    const canUseNative = !!(AlarmModule && typeof AlarmModule.scheduleAlarm === 'function');
    if (!canUseNative) {
      console.warn('[NotificationService] AlarmModule.scheduleAlarm unavailable (Expo Go or not linked). Falling back to notifee.');
    } else {
      try {
        AlarmModule?.scheduleAlarm?.(reminder.id, reminder.title, when, reminder.priority);
        console.log(`[NotificationService] Scheduled native alarm for rem-${reminder.id} with priority ${reminder.priority}`);
        return;
      } catch (e) {
        console.error('[NotificationService] Native scheduleAlarm threw, falling back to notifee:', e);
      }
    }
  }
  
  {
    // Use notifee for medium/low priority OR as fallback for high priority
    // CRITICAL: Always use alarmManager with allowWhileIdle for exact timing
    // Even if SCHEDULE_EXACT_ALARM permission is not granted, this gives best-effort exact delivery
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: when,
      alarmManager: {
        allowWhileIdle: true, // Ensures notification fires even in Doze mode
      },
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
        timestamp: when,
        showTimestamp: true, // Show relative duration next to app name (e.g., 5m)
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
    console.log(`[NotificationService] Cancelled notification (scheduled + displayed) ${notificationId}`);
  } catch (error) {
    console.error(`[NotificationService] Error cancelling notification ${notificationId}:`, error);
  }
}

export async function cancelAllNotificationsForReminder(reminderId: string) {
  try {
    // Cancel scheduled (trigger) notifications
    await notifee.cancelNotification(`rem-${reminderId}`);
    
    // Cancel displayed notifications (notifications already showing in notification center)
    await notifee.cancelDisplayedNotification(`rem-${reminderId}`);
    
    // Cancel native alarms
    if (AlarmModule && typeof AlarmModule.cancelAlarm === 'function') {
      try {
        AlarmModule.cancelAlarm(reminderId);
      } catch (e) {
        console.warn('[NotificationService] Native cancelAlarm failed, continuing:', e);
      }
    }
    
    // Clean up from scheduledTimestamps map
    for (const [timestamp, ids] of Array.from(scheduledTimestamps.entries())) {
      const index = ids.indexOf(reminderId);
      if (index !== -1) {
        ids.splice(index, 1);
        if (ids.length === 0) {
          scheduledTimestamps.delete(timestamp);
        }
      }
    }
    
    console.log(`[NotificationService] Cancelled all notifications (scheduled + displayed) for reminder ${reminderId}`);
  } catch (error) {
    console.error(`[NotificationService] Error cancelling notifications for reminder ${reminderId}:`, error);
  }
}

export async function cancelAllNotifications() {
  try {
    // Cancel all scheduled notifications
    await notifee.cancelAllNotifications();
    
    // Cancel all displayed notifications
    await notifee.cancelDisplayedNotifications();
    
    // Clear the scheduledTimestamps map
    scheduledTimestamps.clear();
    
    console.log('[NotificationService] Cancelled all notifications');
  } catch (error) {
    console.error('[NotificationService] Error cancelling all notifications:', error);
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

export async function initialize(): Promise<boolean> {
  try {
    const { ensureBaseChannels } = require('@/services/channels');
    await ensureBaseChannels();
    console.log('[NotificationService] Initialized');
    return true;
  } catch (error) {
    console.error('[NotificationService] Initialization error:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<boolean> {
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  } catch (error) {
    console.error('[NotificationService] checkPermissions error:', error);
    return false;
  }
}

export async function requestPermissions(): Promise<boolean> {
  try {
    await notifee.requestPermission();
    const settings = await notifee.getNotificationSettings();
    return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
  } catch (error) {
    console.error('[NotificationService] requestPermissions error:', error);
    return false;
  }
}

export async function getAllScheduledNotifications() {
  try {
    const triggers = await notifee.getTriggerNotifications();
    return triggers;
  } catch (error) {
    console.error('[NotificationService] getAllScheduledNotifications error:', error);
    return [];
  }
}

export async function displayInfoNotification(title: string, body: string) {
  try {
    await notifee.displayNotification({
      id: `info-${Date.now()}`,
      title,
      body,
      android: {
        channelId: 'standard-v2',
        smallIcon: 'small_icon_noti',
        importance: AndroidImportance.DEFAULT,
      },
    });
  } catch (error) {
    console.error('[NotificationService] displayInfoNotification error:', error);
  }
}

// Convenience adapter used by debug screen to schedule a simple reminder-like notification
export async function scheduleNotification(input: {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  priority: Priority;
  repeatType: RepeatType;
  isActive: boolean;
  isCompleted: boolean;
  isExpired?: boolean;
  isPaused?: boolean;
  everyInterval?: { value: number; unit: EveryUnit };
}) {
  const reminder: Reminder = {
    id: input.id,
    title: input.title,
    description: input.description ?? '',
    date: input.date,
    time: input.time,
    priority: input.priority,
    isActive: input.isActive,
    isPaused: input.isPaused ?? false,
    repeatType: input.repeatType,
    everyInterval: input.everyInterval,
    isCompleted: input.isCompleted,
    isExpired: input.isExpired ?? false,
    createdAt: new Date().toISOString(),
  };
  await scheduleReminderByModel(reminder);
  return `rem-${reminder.id}`;
}

export const notificationService = {
  scheduleReminderByModel,
  cancelNotification,
  cancelAllNotifications,
  cancelAllNotificationsForReminder,
  cleanupOrphanedNotifications,
  initialize,
  checkPermissions,
  requestPermissions,
  getAllScheduledNotifications,
  displayInfoNotification,
  scheduleNotification,
};
