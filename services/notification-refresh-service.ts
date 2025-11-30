import notifee, { TriggerType, TimestampTrigger, AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';
import { getReminder } from './reminder-service';
import { createNotificationConfig } from '../hooks/notification-service';

/**
 * Service to refresh displayed notifications at midnight
 * Updates "Today" to "Yesterday" and refreshes date displays
 */

// Format time for notification display
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

/**
 * Refresh all displayed notifications with updated time text
 * Called at midnight to update "Today" -> "Yesterday" etc.
 */
export async function refreshDisplayedNotifications() {
  if (Platform.OS !== 'android') return;

  try {
    console.log('[NotificationRefresh] Starting midnight refresh of displayed notifications');
    
    // Get all currently displayed notifications
    const displayedNotifications = await notifee.getDisplayedNotifications();
    
    if (displayedNotifications.length === 0) {
      console.log('[NotificationRefresh] No displayed notifications to refresh');
      return;
    }

    console.log(`[NotificationRefresh] Found ${displayedNotifications.length} displayed notifications`);

    // Update each notification with refreshed time text
    for (const displayed of displayedNotifications) {
      try {
        const { notification } = displayed;
        if (!notification || !notification.id || !notification.data?.reminderId) continue;

        const reminderId = notification.data.reminderId as string;
        
        // Only update reminder notifications (those with timestamp in android config)
        const timestamp = notification.android?.timestamp;
        if (!timestamp) continue;

        // Fetch full reminder data to ensure we have all config (actions, channel, etc.)
        const reminder = await getReminder(reminderId);
        if (!reminder) {
            console.log(`[NotificationRefresh] Reminder ${reminderId} not found, skipping update`);
            continue;
        }

        // Re-generate full notification config with current time text logic
        // The timestamp remains the same (when it was scheduled/due), but the body text will
        // be re-evaluated by createNotificationConfig -> bodyWithTime -> formatSmartDateTime
        // which uses 'new Date()' inside formatSmartDateTime to determine 'Today' vs 'Yesterday'.
        const config = createNotificationConfig(reminder, timestamp);

        // Update the notification
        await notifee.displayNotification(config);

        console.log(`[NotificationRefresh] Updated notification ${notification.id} for reminder ${reminderId}`);
      } catch (err) {
        console.error('[NotificationRefresh] Error updating individual notification:', err);
      }
    }

    console.log('[NotificationRefresh] Midnight refresh completed');
  } catch (error) {
    console.error('[NotificationRefresh] Error refreshing displayed notifications:', error);
  }
}

/**
 * Schedule the next midnight refresh
 * Sets up an alarm to trigger at the next midnight (12:00 AM)
 */
export async function scheduleMidnightRefresh() {
  if (Platform.OS !== 'android') return;

  try {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // Next day
      0, 0, 0, 0 // 12:00:00 AM
    );

    const timeUntilMidnight = midnight.getTime() - now.getTime();
    
    console.log(`[NotificationRefresh] Scheduling midnight refresh in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);

    // Use notifee's trigger notification as a silent alarm
    // This will wake the app at midnight to refresh notifications
    await notifee.createTriggerNotification(
      {
        id: 'midnight-refresh-trigger',
        title: ' ', // Minimal title, will be cancelled immediately
        body: '',
        data: { type: 'midnight-refresh' },
        android: {
          channelId: 'silent-v2',
          autoCancel: true,
          smallIcon: 'small_icon_noti', // Ensure icon is set
          importance: AndroidImportance.MIN, // MIN importance for least intrusion
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: midnight.getTime(),
        alarmManager: {
          allowWhileIdle: true, // CRITICAL: Trigger even in Doze mode
        },
      } as TimestampTrigger
    );

    console.log('[NotificationRefresh] Midnight refresh scheduled for:', midnight.toISOString());
  } catch (error) {
    console.error('[NotificationRefresh] Error scheduling midnight refresh:', error);
  }
}

/**
 * Initialize the notification refresh service
 * Call this on app startup
 */
export async function initializeNotificationRefresh() {
  if (Platform.OS !== 'android') return;

  console.log('[NotificationRefresh] Initializing notification refresh service');
  
  // Schedule the first midnight refresh
  await scheduleMidnightRefresh();
}
