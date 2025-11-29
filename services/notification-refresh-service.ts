import notifee, { TriggerType, TimestampTrigger } from '@notifee/react-native';
import { Platform } from 'react-native';

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
        if (!notification || !notification.id) continue;

        // Only update reminder notifications (those with timestamp in android config)
        const timestamp = notification.android?.timestamp;
        if (!timestamp) continue;

        // Get current body text and extract description (everything before the time line)
        const currentBody = notification.body || '';
        const lines = currentBody.split('\n');
        const description = lines.length > 1 ? lines.slice(0, -1).join('\n') : '';

        // Generate new time text based on current date
        const newTimeText = formatSmartDateTime(timestamp);
        const newBody = [description.trim(), newTimeText].filter(Boolean).join('\n');

        // Update the notification with new body text
        await notifee.displayNotification({
          id: notification.id,
          title: notification.title,
          subtitle: notification.subtitle,
          body: newBody,
          data: notification.data,
          android: {
            ...notification.android,
            // Don't use showTimestamp - our formatted time in body is more accurate
            // showTimestamp would show Android's native format which conflicts with our "Yesterday" text
            showTimestamp: false,
          },
        });

        console.log(`[NotificationRefresh] Updated notification ${notification.id} with new time: ${newTimeText}`);
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
 * Schedule the next midnight refresh using native AlarmManager
 * More reliable than notifee triggers - survives app restarts and Doze mode
 */
export async function scheduleMidnightRefresh() {
  if (Platform.OS !== 'android') return;

  try {
    const { NativeModules } = require('react-native');
    const { AlarmModule } = NativeModules;
    
    if (AlarmModule && AlarmModule.scheduleMidnightRefresh) {
      await AlarmModule.scheduleMidnightRefresh();
      console.log('[NotificationRefresh] Midnight refresh scheduled via native AlarmManager');
    } else {
      console.warn('[NotificationRefresh] AlarmModule.scheduleMidnightRefresh not available');
    }
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
