import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Reminder } from '@/types/reminder';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '@/hooks/settings-store';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as { type?: string } | undefined;
    const isLowPriority = data?.type === 'low_priority_reminder';

    let settings: AppSettings | null = null;
    try {
      const stored = await AsyncStorage.getItem('dominder_settings');
      settings = stored ? (JSON.parse(stored) as AppSettings) : null;
    } catch (e) {
      console.log('Failed to read settings in handler');
    }

    const notificationsEnabled = settings?.notificationsEnabled ?? true;
    const soundEnabled = settings?.soundEnabled ?? true;

    return {
      shouldShowAlert: notificationsEnabled,
      shouldPlaySound: notificationsEnabled && soundEnabled && !isLowPriority,
      shouldSetBadge: false,
      shouldShowBanner: notificationsEnabled,
      shouldShowList: notificationsEnabled,
    };
  },
});

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private responseHandlerSet = false;
  private mediumPriorityRepeats = new Map<string, ReturnType<typeof setTimeout>>();
  private notificationQueue: { reminder: Reminder; resolve: (value: string | null) => void; originalTriggerTime: Date }[] = [];
  private isProcessingQueue = false;
  private notificationDelay = 2000; // 2 second delay between notifications
  private lastScheduledTime = new Map<string, Date>(); // Track last scheduled time for each trigger time
  private schedulingInProgress = new Set<string>(); // Track reminders currently being scheduled

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

      // Respect settings: if notifications disabled, skip permission flow
      try {
        const stored = await AsyncStorage.getItem('dominder_settings');
        const settings = stored ? (JSON.parse(stored) as AppSettings) : null;
        if (settings && settings.notificationsEnabled === false) {
          console.log('Notifications disabled in settings; skipping initialization');
          this.isInitialized = true;
          return true;
        }
      } catch {}

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Set up notification categories with action buttons
      await this.setupNotificationCategories();
      
      // Clear all existing notifications on startup to prevent accumulation
      await this.cancelAllNotifications();
      console.log('Cleared all existing notifications on startup');

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  private async setupNotificationCategories(): Promise<void> {
    try {
      // Category for low priority reminders
      await Notifications.setNotificationCategoryAsync('reminder', [
        {
          identifier: 'done',
          buttonTitle: 'Done',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'snooze',
          buttonTitle: 'Snooze 5m',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);
      
      // Category for medium priority reminders (locked notification)
      await Notifications.setNotificationCategoryAsync('medium_reminder', [
        {
          identifier: 'done',
          buttonTitle: 'Done',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'snooze',
          buttonTitle: 'Snooze 5m',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ], {
        allowInCarPlay: false,
        allowAnnouncement: true,
        categorySummaryFormat: '%u more reminders',
        customDismissAction: false, // This helps prevent swipe to dismiss
      });
      
      // Category for HIGH priority ringer alarm
      await Notifications.setNotificationCategoryAsync('ringer_alarm', [
        {
          identifier: 'done',
          buttonTitle: 'Done',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'snooze',
          buttonTitle: 'Snooze 5m',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);

      // Android: create/update ALARM channel with max importance and alarm audio usage
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('alarm', {
            name: 'Alarms',
            description: 'Rings with maximum priority using the system alarm stream',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
            vibrationPattern: [0, 500, 500, 500],
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            audioAttributes: {
              usage: Notifications.AndroidAudioUsage.ALARM,
              contentType: Notifications.AndroidAudioContentType.SONIFICATION,
              flags: {
                enforceAudibility: true,
                requestHardwareAudioVideoSynchronization: false,
              },
            },
          });
          console.log('Alarm channel created/updated with MAX importance and ALARM usage');
        } catch (e) {
          console.error('Failed to create alarm channel:', e);
        }
      }

      console.log('Notification categories set up successfully');
    } catch (error) {
      console.error('Failed to set up notification categories:', error);
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

    // Prevent duplicate scheduling for the same reminder
    if (this.schedulingInProgress.has(reminder.id)) {
      console.log(`Skipping duplicate scheduling request for reminder: ${reminder.id}`);
      return null;
    }

    // Allow scheduling for low, medium, and high (ringer) priority
    if (reminder.priority !== 'low' && reminder.priority !== 'medium' && reminder.priority !== 'high') {
      return null;
    }

    // Don't schedule notifications for completed or expired reminders
    if (reminder.isCompleted || reminder.isExpired) {
      console.log(`Skipping notification for completed/expired reminder: ${reminder.id}`);
      return null;
    }

    // Don't schedule if reminder is in a clearing state
    if (reminder.snoozeClearing || reminder.notificationUpdating) {
      console.log(`Skipping notification for reminder in clearing state: ${reminder.id}`);
      return null;
    }

    // Calculate the original trigger time for this reminder
    const originalTriggerTime = this.calculateTriggerDate(reminder);
    if (!originalTriggerTime) {
      return null;
    }

    // Mark as being scheduled
    this.schedulingInProgress.add(reminder.id);

    // Add to queue for sequential processing
    return new Promise((resolve) => {
      this.notificationQueue.push({ reminder, resolve, originalTriggerTime });
      this.processNotificationQueue();
    });
  }

  private async processNotificationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Sort queue by original trigger time to process in chronological order
    this.notificationQueue.sort((a, b) => a.originalTriggerTime.getTime() - b.originalTriggerTime.getTime());

    while (this.notificationQueue.length > 0) {
      const item = this.notificationQueue.shift();
      if (!item) continue;

      const { reminder, resolve, originalTriggerTime } = item;
      
      // Check if we need to add extra delay for notifications with same trigger time
      const triggerTimeKey = Math.floor(originalTriggerTime.getTime() / 60000) * 60000; // Round to nearest minute
      const lastScheduledForThisTime = this.lastScheduledTime.get(triggerTimeKey.toString());
      
      let adjustedTriggerTime = originalTriggerTime;
      if (lastScheduledForThisTime) {
        // Add sequential delay for notifications with same original trigger time
        adjustedTriggerTime = new Date(lastScheduledForThisTime.getTime() + this.notificationDelay);
        console.log(`Adjusting trigger time for reminder ${reminder.id} from ${originalTriggerTime.toISOString()} to ${adjustedTriggerTime.toISOString()} to prevent simultaneous firing`);
      }
      
      // Update the last scheduled time for this trigger time
      this.lastScheduledTime.set(triggerTimeKey.toString(), adjustedTriggerTime);
      
      const result = await this.scheduleNotificationInternal(reminder, adjustedTriggerTime);
      // Remove from scheduling progress
      this.schedulingInProgress.delete(reminder.id);
      resolve(result);

      // Add delay between processing notifications
      if (this.notificationQueue.length > 0) {
        await new Promise(r => setTimeout(r, 100)); // Small processing delay
      }
    }

    this.isProcessingQueue = false;
  }

  private async scheduleNotificationInternal(reminder: Reminder, adjustedTriggerTime?: Date): Promise<string | null> {
    try {
      // Load settings for toggle behavior
      let settings: AppSettings | null = null;
      try {
        const stored = await AsyncStorage.getItem('dominder_settings');
        settings = stored ? (JSON.parse(stored) as AppSettings) : null;
      } catch {}

      if (settings && settings.notificationsEnabled === false) {
        console.log('Notifications disabled, skipping scheduling');
        return null;
      }

      // Use adjusted trigger time if provided, otherwise calculate it
      const triggerDate = adjustedTriggerTime || this.calculateTriggerDate(reminder);
      const now = new Date();
      
      console.log(`\n=== Scheduling Notification for Reminder ${reminder.id} ===`);
      console.log(`Reminder date: ${reminder.date}, time: ${reminder.time}`);
      console.log(`Reminder repeatType: ${reminder.repeatType}`);
      console.log(`Current time: ${now.toISOString()}`);
      console.log(`Current time (local): ${now.toLocaleString()}`);
      
      if (!triggerDate) {
        console.log('Could not calculate trigger date for reminder:', reminder.id);
        return null;
      }
      
      console.log(`Calculated trigger date: ${triggerDate.toISOString()}`);
      console.log(`Calculated trigger date (local): ${triggerDate.toLocaleString()}`);
      
      // Ensure the trigger date is in the future (at least 1 second from now)
      const timeDiff = triggerDate.getTime() - now.getTime();
      if (timeDiff <= 1000) {
        console.log(`Trigger date is in the past or too soon for reminder ${reminder.id}: ${triggerDate.toISOString()} (now: ${now.toISOString()})`);
        return null;
      }

      // Calculate seconds until trigger (ensure it's at least 1 second)
      const secondsUntilTrigger = Math.max(1, Math.floor(timeDiff / 1000));
      
      console.log(`Scheduling notification in ${secondsUntilTrigger} seconds (${Math.floor(secondsUntilTrigger / 60)} minutes ${secondsUntilTrigger % 60} seconds)`);
      console.log(`Expected trigger time: ${new Date(now.getTime() + secondsUntilTrigger * 1000).toLocaleString()}`);
      
      // Configure notification based on priority
      const isLowPriority = reminder.priority === 'low';
      const isMediumPriority = reminder.priority === 'medium';
      const isHighPriority = reminder.priority === 'high';
      
      const soundEnabled = settings?.soundEnabled ?? true;
      const vibrationEnabled = settings?.vibrationEnabled ?? true;

      const notificationContent: Notifications.NotificationContentInput = {
        title: 'Reminder',
        body: reminder.description || reminder.title,
        data: {
          reminderId: reminder.id,
          type: isHighPriority
            ? 'ringer_alarm'
            : isLowPriority
              ? 'low_priority_reminder'
              : 'medium_priority_reminder',
        },
        categoryIdentifier: isHighPriority ? 'ringer_alarm' : isLowPriority ? 'reminder' : 'medium_reminder',
        sound: !soundEnabled || isLowPriority ? false : 'default',
        vibrate: vibrationEnabled
          ? (isHighPriority
            ? ([0, 600, 300, 600] as unknown as number[])
            : isMediumPriority
              ? ([0, 250, 250, 250] as unknown as number[])
              : undefined)
          : undefined,
        priority: (isHighPriority ? Notifications.AndroidNotificationPriority.MAX : isMediumPriority ? Notifications.AndroidNotificationPriority.HIGH : undefined) as any,
        sticky: isMediumPriority || isHighPriority,
        android: Platform.OS === 'android' ? {
          channelId: isHighPriority && soundEnabled ? 'alarm' : undefined,
          category: 'alarm',
        } : undefined,
      } as Notifications.NotificationContentInput;
      
      // Use date trigger instead of seconds for more accurate scheduling
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: {
          type: 'date',
          date: triggerDate,
        } as any,
      });
      
      // For "once" reminders, update lastTriggeredAt when notification is scheduled to fire
      // This ensures the 30-minute expiration timer starts from the scheduled time
      if (reminder.repeatType === 'none' && !reminder.snoozeUntil) {
        // Set up a timer to mark the reminder as triggered when the notification fires
        const timeUntilTrigger = triggerDate.getTime() - now.getTime();
        setTimeout(async () => {
          try {
            const stored = await AsyncStorage.getItem('dominder_reminders');
            const currentReminders: Reminder[] = stored ? JSON.parse(stored) : [];
            const currentReminder = currentReminders.find(r => r.id === reminder.id);
            if (currentReminder && !currentReminder.lastTriggeredAt && !currentReminder.isCompleted && !currentReminder.isExpired) {
              console.log(`Marking "once" reminder ${reminder.id} as triggered at scheduled time`);
              // Note: We don't update the reminder here, just log it
              // The actual update happens when the notification is interacted with
            }
          } catch (error) {
            console.error('Error checking reminder trigger status:', error);
          }
        }, Math.max(0, timeUntilTrigger));
      }

      console.log(`✅ Successfully scheduled ${reminder.priority} priority notification ${notificationId} for reminder ${reminder.id}`);
      console.log(`Will trigger at: ${triggerDate.toISOString()}`);
      console.log(`Will trigger at (local): ${triggerDate.toLocaleString()}`);
      console.log(`=== End Scheduling ===\n`);
      
      // Medium priority notifications no longer repeat - removed repeat mechanism
      
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotificationsForReminder(reminderId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      // Remove from scheduling queue if present
      this.notificationQueue = this.notificationQueue.filter(item => item.reminder.id !== reminderId);
      this.schedulingInProgress.delete(reminderId);
      
      // Clear time tracking for this reminder
      for (const [key, _] of this.lastScheduledTime) {
        if (key.includes(reminderId)) {
          this.lastScheduledTime.delete(key);
        }
      }
      
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Find and cancel all scheduled notifications for this reminder
      const scheduledToCancel = scheduledNotifications.filter(notification => {
        const data = notification.content.data as { reminderId?: string } | undefined;
        return data?.reminderId === reminderId;
      });
      
      console.log(`Found ${scheduledToCancel.length} scheduled notifications to cancel for reminder ${reminderId}`);
      
      for (const notification of scheduledToCancel) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`Cancelled scheduled notification ${notification.identifier} for reminder ${reminderId}`);
      }
      
      // Get all presented (visible) notifications in the system tray
      const presentedNotifications = await Notifications.getPresentedNotificationsAsync();
      
      // Find and dismiss all presented notifications for this reminder
      const presentedToCancel = presentedNotifications.filter(notification => {
        const data = notification.request.content.data as { reminderId?: string } | undefined;
        return data?.reminderId === reminderId;
      });
      
      console.log(`Found ${presentedToCancel.length} presented notifications to dismiss for reminder ${reminderId}`);
      
      for (const notification of presentedToCancel) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
        console.log(`Dismissed presented notification ${notification.request.identifier} for reminder ${reminderId}`);
      }
      
      // Also cancel any medium priority repeats
      this.cancelMediumPriorityRepeat(reminderId);
      
      console.log(`Total cancelled for reminder ${reminderId}: ${scheduledToCancel.length} scheduled, ${presentedToCancel.length} presented`);
      
    } catch (error) {
      console.error(`Failed to cancel notifications for reminder ${reminderId}:`, error);
    }
  }
  
  cancelMediumPriorityRepeat(reminderId: string): void {
    const timeout = this.mediumPriorityRepeats.get(reminderId);
    if (timeout) {
      clearTimeout(timeout);
      this.mediumPriorityRepeats.delete(reminderId);
      console.log(`Cancelled medium priority repeat for reminder: ${reminderId}`);
    }
  }
  
  private async getReminderById(reminderId: string): Promise<Reminder | null> {
    try {
      const stored = await AsyncStorage.getItem('dominder_reminders');
      if (!stored) return null;
      
      const reminders: Reminder[] = JSON.parse(stored);
      return reminders.find(r => r.id === reminderId) || null;
    } catch (error) {
      console.error('Error fetching reminder:', error);
      return null;
    }
  }

  private setupMediumPriorityRepeat(reminderId: string, originalNotificationId: string): void {
    // Clear any existing repeat for this reminder
    this.cancelMediumPriorityRepeat(reminderId);
    
    // Set up 5-minute repeat
    const timeout = setTimeout(async () => {
      try {
        console.log(`Repeating medium priority notification for reminder: ${reminderId}`);
        
        // Fetch the reminder details to include notes
        const reminder = await this.getReminderById(reminderId);
        if (!reminder) {
          console.log(`Reminder ${reminderId} not found, cancelling repeat`);
          this.cancelMediumPriorityRepeat(reminderId);
          return;
        }
        
        // Check if reminder is still active and not completed
        if (!reminder.isActive || reminder.isCompleted || reminder.isPaused) {
          console.log(`Reminder ${reminderId} is no longer active/completed/paused, cancelling repeat`);
          this.cancelMediumPriorityRepeat(reminderId);
          return;
        }
        
        // For "once" reminders, don't repeat - remove the repeat mechanism
        if (reminder.repeatType === 'none') {
          console.log(`"Once" reminder ${reminderId} - not repeating notification, cancelling repeat mechanism`);
          this.cancelMediumPriorityRepeat(reminderId);
          return;
        }
        
        // For daily, monthly, yearly reminders, don't repeat - remove the repeat mechanism
        if (reminder.repeatType === 'daily' || reminder.repeatType === 'monthly' || reminder.repeatType === 'yearly') {
          console.log(`${reminder.repeatType} reminder ${reminderId} - not repeating notification, cancelling repeat mechanism`);
          this.cancelMediumPriorityRepeat(reminderId);
          return;
        }
        
        // For all other repeat types, also don't repeat - remove the repeat mechanism
        console.log(`${reminder.repeatType} reminder ${reminderId} - not repeating notification, cancelling repeat mechanism`);
        this.cancelMediumPriorityRepeat(reminderId);
        return;
      } catch (error) {
        console.error('Failed to repeat medium priority notification:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    this.mediumPriorityRepeats.set(reminderId, timeout);
    console.log(`Set up medium priority repeat for reminder: ${reminderId}`);
  }

  async hasScheduledForReminder(reminderId: string): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return scheduled.some(n => {
        const data = (n.content?.data ?? {}) as any;
        return data?.reminderId === reminderId;
      });
    } catch (error) {
      console.error('Failed to check scheduled notifications:', error);
      return false;
    }
  }

  async cancelAllNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      // Clear the notification queue and tracking maps
      this.notificationQueue = [];
      this.isProcessingQueue = false;
      this.lastScheduledTime.clear();
      this.schedulingInProgress.clear();
      
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all notifications, cleared queue and time tracking');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async cleanupOrphanedNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`Found ${scheduledNotifications.length} scheduled notifications`);
      
      // Get current reminders from storage
      const stored = await AsyncStorage.getItem('dominder_reminders');
      const currentReminders: any[] = stored ? JSON.parse(stored) : [];
      const activeReminderIds = new Set(currentReminders
        .filter(r => r.isActive && !r.isCompleted && !r.isExpired && !r.isPaused)
        .map(r => r.id));
      
      // Group notifications by trigger time to detect duplicates
      const notificationsByTime = new Map<string, typeof scheduledNotifications>();
      
      for (const notification of scheduledNotifications) {
        const trigger = notification.trigger as any;
        const triggerTime = trigger?.date || trigger?.value || 'unknown';
        const key = `${triggerTime}_${notification.content.data?.reminderId}`;
        
        if (!notificationsByTime.has(key)) {
          notificationsByTime.set(key, []);
        }
        notificationsByTime.get(key)?.push(notification);
      }
      
      // Cancel duplicate notifications and orphaned ones
      let cancelledCount = 0;
      for (const [, notifications] of notificationsByTime) {
        // Keep only the first notification for each time/reminder combo
        for (let i = 1; i < notifications.length; i++) {
          await Notifications.cancelScheduledNotificationAsync(notifications[i].identifier);
          cancelledCount++;
          console.log(`Cancelled duplicate notification ${notifications[i].identifier}`);
        }
        
        // Check if the first notification is orphaned
        const notification = notifications[0];
        const data = notification.content.data as { reminderId?: string } | undefined;
        const reminderId = data?.reminderId;
        
        if (!reminderId || !activeReminderIds.has(reminderId)) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          cancelledCount++;
          console.log(`Cancelled orphaned notification ${notification.identifier} for reminder ${reminderId}`);
        }
      }
      
      console.log(`Cleaned up ${cancelledCount} orphaned/duplicate notifications`);
    } catch (error) {
      console.error('Failed to cleanup orphaned notifications:', error);
    }
  }

  private calculateTriggerDate(reminder: Reminder): Date | null {
    try {
      const now = new Date();
      
      console.log(`\nCalculating trigger date for reminder ${reminder.id}`);
      console.log(`Reminder details - date: ${reminder.date}, time: ${reminder.time}, repeatType: ${reminder.repeatType}`);
      console.log(`Snooze until: ${reminder.snoozeUntil || 'none'}`);
      
      // If reminder is snoozed, use snooze time
      if (reminder.snoozeUntil) {
        const snoozeDate = new Date(reminder.snoozeUntil);
        if (!isNaN(snoozeDate.getTime())) {
          if (snoozeDate > now) {
            console.log(`Using snooze date for reminder ${reminder.id}: ${snoozeDate.toISOString()}`);
            return snoozeDate;
          } else {
            console.log(`Snooze time has passed for reminder ${reminder.id} in notification service, should be cleared`);
            // Don't schedule notification if snooze time has passed - let the engine handle clearing it
            return null;
          }
        }
      }
      
      // For repeating reminders, use nextReminderDate if available
      if (reminder.repeatType !== 'none' && reminder.nextReminderDate) {
        const nextDate = new Date(reminder.nextReminderDate);
        // Validate the date and ensure it's in the future
        if (!isNaN(nextDate.getTime()) && nextDate > now) {
          console.log(`Using nextReminderDate for reminder ${reminder.id}: ${nextDate.toISOString()}`);
          return nextDate;
        }
      }
      
      // Parse date components from the reminder's date field
      const dateParts = reminder.date.split('-');
      const year = parseInt(dateParts[0] || '0', 10);
      const month = parseInt(dateParts[1] || '1', 10);
      const day = parseInt(dateParts[2] || '1', 10);
      
      // Parse time components (time is in 24-hour format HH:MM)
      const timeParts = reminder.time.split(':');
      const hh = parseInt(timeParts[0] || '0', 10);
      const mm = parseInt(timeParts[1] || '0', 10);
      
      console.log(`Parsed components - year: ${year}, month: ${month}, day: ${day}, hour: ${hh}, minute: ${mm}`);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hh) || isNaN(mm)) {
        console.error('Invalid date/time components for reminder:', reminder.id, { year, month, day, hh, mm });
        return null;
      }
      
      // Create the trigger date
      // Note: month is 0-indexed in JavaScript Date constructor
      const triggerDate = new Date(year, month - 1, day, hh, mm, 0, 0);
      
      console.log(`Created trigger date: ${triggerDate.toISOString()} (local: ${triggerDate.toLocaleString()})`);
      console.log(`Current time: ${now.toISOString()} (local: ${now.toLocaleString()})`);
      
      // Validate the created date
      if (isNaN(triggerDate.getTime())) {
        console.error('Invalid trigger date created for reminder:', reminder.id);
        return null;
      }
      
      // For non-repeating reminders, check if the date is in the future
      if (reminder.repeatType === 'none') {
        // If the trigger date is in the past, don't schedule
        if (triggerDate <= now) {
          console.log(`Trigger date is in the past for non-repeating reminder ${reminder.id}: ${triggerDate.toISOString()}`);
          return null;
        }
        console.log(`Non-repeating reminder will trigger at: ${triggerDate.toLocaleString()}`);
        return triggerDate;
      }
      
      // For repeating reminders, always compute the next occurrence from 'now'
      // This ensures "Daily" honors unchecked days and avoids firing on excluded days
      const nextFire = this.computeNextFireForNotification(reminder, now);
      if (nextFire) {
        console.log(`Next occurrence for repeating reminder: ${nextFire.toLocaleString()}`);
        return nextFire;
      }
      console.log(`No valid next occurrence found for repeating reminder ${reminder.id}`);
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
        const selected = (reminder.repeatDays && reminder.repeatDays.length > 0)
          ? reminder.repeatDays
          : [0,1,2,3,4,5,6];
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
        
        console.log(`computeNextFireForNotification - Monthly: dayOfMonth=${dayOfMonth}, now=${now.toISOString()}`);
        
        // Start with current month
        let target = setTime(new Date(now.getFullYear(), now.getMonth(), 1));
        const daysInThisMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        const dayToUse = Math.min(dayOfMonth, daysInThisMonth);
        target.setDate(dayToUse);
        
        console.log(`computeNextFireForNotification - Monthly this month: ${target.toISOString()}`);
        
        // If the target time for this month has passed, move to next month
        if (target <= now) {
          target.setMonth(target.getMonth() + 1);
          const daysInNextMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
          const nextDayToUse = Math.min(dayOfMonth, daysInNextMonth);
          target.setDate(nextDayToUse);
          console.log(`computeNextFireForNotification - Monthly next month: ${target.toISOString()}`);
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

  // Handle notification responses (when user taps "Done" or "Snooze" button)
  setupNotificationResponseHandler(
    onDone: (reminderId: string) => void,
    onSnooze: (reminderId: string) => void,
    onDismissed: (reminderId: string) => void,
    onOpen?: (reminderId: string) => void
  ): void {
    if (Platform.OS === 'web') return;
    
    // Only set up the listener once
    if (this.responseHandlerSet) return;
    this.responseHandlerSet = true;
    
    // Track active notifications to detect dismissals
    const activeNotifications = new Map<string, string>(); // notificationId -> reminderId
    
    // Listen for when notifications are presented
    Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data as { reminderId?: string; type?: string } | undefined;
      if (data?.reminderId && (data.type === 'low_priority_reminder' || data.type === 'medium_priority_reminder' || data.type === 'ringer_alarm')) {
        activeNotifications.set(notification.request.identifier, data.reminderId);
        console.log(`Tracking notification ${notification.request.identifier} for reminder ${data.reminderId}`);
        
        // Mark "once" reminders as triggered when notification is presented
        try {
          const stored = await AsyncStorage.getItem('dominder_reminders');
          const currentReminders: Reminder[] = stored ? JSON.parse(stored) : [];
          const reminder = currentReminders.find(r => r.id === data.reminderId);
          if (reminder && reminder.repeatType === 'none' && !reminder.lastTriggeredAt) {
            console.log(`Marking "once" reminder ${data.reminderId} as triggered (notification presented)`);
            // Update the reminder with lastTriggeredAt to start the 30-minute expiration timer
            const updatedReminder = { ...reminder, lastTriggeredAt: new Date().toISOString() };
            const updatedReminders = currentReminders.map(r => r.id === data.reminderId ? updatedReminder : r);
            await AsyncStorage.setItem('dominder_reminders', JSON.stringify(updatedReminders));
          }
        } catch (error) {
          console.error('Error updating reminder trigger time:', error);
        }
      }
    });
    
    // Handle notification responses
    const handleResponse = async (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as { reminderId?: string; type?: string; isRepeat?: boolean } | undefined;
      const { reminderId, type } = data || {};
      const actionIdentifier = response.actionIdentifier;
      
      if ((type === 'low_priority_reminder' || type === 'medium_priority_reminder' || type === 'ringer_alarm') && reminderId) {
        console.log(`Notification response received for ${type} reminder: ${reminderId}, action: ${actionIdentifier}`);
        
        // Remove from active notifications
        activeNotifications.delete(response.notification.request.identifier);
        
        // For medium priority, cancel the repeat mechanism
        if (type === 'medium_priority_reminder') {
          this.cancelMediumPriorityRepeat(reminderId);
          console.log(`Cancelled medium priority repeat mechanism for reminder: ${reminderId}`);
        }
        
        // Dismiss the notification immediately
        try {
          await Notifications.dismissNotificationAsync(response.notification.request.identifier);
          console.log(`Dismissed notification: ${response.notification.request.identifier}`);
        } catch (error) {
          console.error('Failed to dismiss notification:', error);
        }
        
        // Handle different actions
        if (actionIdentifier === 'done') {
          console.log(`Marking reminder as done: ${reminderId}`);
          onDone(reminderId);
        } else if (actionIdentifier === 'snooze') {
          console.log(`Snoozing reminder: ${reminderId}`);
          onSnooze(reminderId);
        } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          console.log(`User tapped notification body for reminder: ${reminderId} - opening app/alarm screen`);
          if (onOpen) onOpen(reminderId);
        }
      }
    };

    Notifications.addNotificationResponseReceivedListener(handleResponse);

    // If the app was launched from a notification while it was closed, process that last response
    (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) {
          console.log('Processing last notification response on app start');
          await handleResponse(last);
        }
      } catch (e) {
        console.error('Failed to process last notification response:', e);
      }
    })();
    
    // Periodically check for dismissed notifications
    const dismissalCheckInterval = setInterval(async () => {
      try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        const presentedIds = new Set(presented.map(n => n.request.identifier));
        
        // Check which tracked notifications are no longer presented
        for (const [notificationId, reminderId] of activeNotifications) {
          if (!presentedIds.has(notificationId)) {
            console.log(`Detected dismissed notification ${notificationId} for reminder ${reminderId}`);
            activeNotifications.delete(notificationId);
            onDismissed(reminderId);
          }
        }
      } catch (error) {
        console.error('Error checking for dismissed notifications:', error);
      }
    }, 5000); // Check every 5 seconds
    
    // Store interval ID for cleanup if needed
    (global as any).__notificationDismissalInterval = dismissalCheckInterval;
  }
}

export const notificationService = NotificationService.getInstance();