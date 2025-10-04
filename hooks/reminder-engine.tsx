import React, { useEffect, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useReminders, useUpdateReminder } from '@/hooks/reminder-store';
import { Reminder } from '@/types/reminder';
import { notificationService } from '@/hooks/notification-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { calculateNextReminderDate, nextMonthlyOccurrenceFrom } from '@/services/reminder-utils';
import notifee from '@notifee/react-native';

interface EngineContext {
  lastTick: number;
}

export const [ReminderEngineProvider, useReminderEngine] = createContextHook<EngineContext>(() => {
  const { data: reminders = [] } = useReminders();
  const updateReminder = useUpdateReminder();
  const [lastTick, setLastTick] = React.useState<number>(Date.now());
  const updateReminderRef = useRef(updateReminder);
  const queryClient = useQueryClient();
  
  // Keep the ref updated
  updateReminderRef.current = updateReminder;
  
  // Define computeNextFire inside the provider to access updateReminderRef
  const computeNextFireInternal = React.useCallback((reminder: Reminder, now: Date): Date | null => {
    if (!reminder.isActive || reminder.isCompleted || reminder.isPaused) return null;

    if (reminder.snoozeUntil) {
      const snoozeDate = new Date(reminder.snoozeUntil);
      if (snoozeDate > now) {
        return snoozeDate;
      } else {
        // Snooze time has passed, clear it and continue with normal scheduling
        console.log(`Snooze time has passed for reminder ${reminder.id}, clearing snooze`);
        // Use a flag to prevent multiple clears
        if (!reminder.snoozeClearing) {
          // Update the reminder to clear snooze with a flag to prevent loops
          setTimeout(() => {
            updateReminderRef.current.mutate({ 
              ...reminder, 
              snoozeUntil: undefined,
              snoozeClearing: true
            });
          }, 100);
        }
        // For now, return null to prevent immediate re-triggering
        return null;
      }
    }

    // Use nextReminderDate if available for repeating reminders
    if (reminder.nextReminderDate && reminder.repeatType !== 'none') {
      const nextDate = new Date(reminder.nextReminderDate);
      if (nextDate > now) return nextDate;
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
        return target > now ? target : null;
      }
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
        const dayOfMonth = reminder.monthlyDay ?? base.getDate();
        const target = nextMonthlyOccurrenceFrom(now, dayOfMonth, hh, mm);
        console.log(`Monthly computeNextFire -> desired=${dayOfMonth}, result=${target.toISOString()}`);
        return target;
      }
      case 'yearly': {
        const target = setTime(new Date(now.getFullYear(), month - 1, day));
        if (target <= now) target.setFullYear(target.getFullYear() + 1);
        return target;
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

        return candidate;
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
        console.log(`Unknown repeat type in computeNextFire: ${reminder.repeatType}`);
        return null;
    }
  }, []);
  
  // Initialize notification service and setup response handler (only once)
  useEffect(() => {
    const initNotifications = async () => {
      try {
        await notificationService.initialize();
        await notificationService.cleanupOrphanedNotifications();
      } catch (error) {
        console.error('Failed to initialize notifications in engine:', error);
      }
    };

    initNotifications();

    // Listen for app state changes to invalidate cache when coming from background
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[ReminderEngine] App became active, invalidating reminders cache');
        // Invalidate the reminders query to refetch from AsyncStorage
        // This ensures UI reflects any changes made by background handler
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
      }
    });

    const EVENT_TYPE_PRESS = 1 as const;
    const EVENT_TYPE_DISMISSED = 3 as const;

    const onEvent = async ({ type, detail }: any) => {
      const { notification, pressAction } = detail ?? {};
      if (!notification) return;
      if (type === EVENT_TYPE_PRESS) {
        const rid = notification.data?.reminderId as string;
        if (pressAction?.id === 'done') {
          handleNotificationDone(rid);
        } else {
          const snoozeMatch = /^snooze_(\d+)$/.exec(pressAction?.id || '');
          if (snoozeMatch) {
            const minutes = parseInt(snoozeMatch[1], 10);
            handleNotificationSnooze(rid, minutes);
          } else if (pressAction?.id === 'default') {
            handleNotificationOpen(rid);
          }        }
      } else if (type === EVENT_TYPE_DISMISSED) {
        handleNotificationDismissed(notification.data?.reminderId as string);
      }
    };

    const unsubscribe = notificationService.subscribeToEvents(onEvent);

    const handleNotificationOpen = (reminderId: string) => {
      try {
        router.push(`/alarm?reminderId=${reminderId}`);
      } catch (e) {
        console.error('Failed to open alarm screen from notification:', e);
      }
    };

    const handleNotificationDone = async (reminderId: string) => {
      console.log(`Notification Done action for reminder: ${reminderId}`);
      try {
        const displayedNotifications = await notifee.getDisplayedNotifications();
        const targetNotification = displayedNotifications.find((n: any) => n.notification?.data?.reminderId === reminderId);
        if (targetNotification?.notification?.id) {
          await notifee.cancelNotification(targetNotification.notification.id);
          console.log(`Dismissed notification ${targetNotification.notification.id} after Done action`);
        }
      } catch (e) {
        console.log('Could not dismiss notification:', e);
      }

      setTimeout(async () => {
        try {
          const stored = await AsyncStorage.getItem('dominder_reminders');
          const currentReminders: Reminder[] = stored ? JSON.parse(stored) : [];
          const reminder = currentReminders.find((r: Reminder) => r.id === reminderId);
          if (reminder) {
            const now = new Date();
            if (reminder.repeatType === 'none' && reminder.lastTriggeredAt) {
              const triggeredTime = new Date(reminder.lastTriggeredAt);
              const timeSinceTrigger = now.getTime() - triggeredTime.getTime();
              if (timeSinceTrigger > 30 * 60 * 1000) {
                console.log(`Reminder ${reminderId} has expired (triggered ${Math.floor(timeSinceTrigger / 60000)} minutes ago)`);
                await notificationService.displayInfoNotification('Reminder Expired', 'This reminder has expired and cannot be marked as done.');
                return;
              }
            }
            console.log(`Marking reminder as completed from notification: ${reminderId}`);
            if (reminder.repeatType === 'none') {
              updateReminderRef.current.mutate({ 
                ...reminder, 
                isCompleted: true, 
                lastTriggeredAt: reminder.lastTriggeredAt || now.toISOString(),
                snoozeUntil: undefined
              });
            } else {
              const nextDate = calculateNextReminderDate(reminder, now);
              console.log(`Updating repeating reminder ${reminderId} - type: ${reminder.repeatType}, next date: ${nextDate?.toISOString()}`);
              updateReminderRef.current.mutate({ 
                ...reminder, 
                lastTriggeredAt: now.toISOString(),
                nextReminderDate: nextDate ? nextDate.toISOString() : undefined,
                snoozeUntil: undefined
              });
            }
          }
        } catch (error) {
          console.error('Error getting fresh reminder data:', error);
        }
      }, 100);
    };

    const handleNotificationSnooze = async (reminderId: string, minutes: number = 5) => {
      console.log(`Notification Snooze action for reminder: ${reminderId} for ${minutes} minutes`);
      try {
        const displayedNotifications = await notifee.getDisplayedNotifications();
        const targetNotification = displayedNotifications.find((n: any) => n.notification?.data?.reminderId === reminderId);
        if (targetNotification?.notification?.id) {
          await notifee.cancelNotification(targetNotification.notification.id);
          console.log(`Dismissed notification ${targetNotification.notification.id} after Snooze action`);
        }
      } catch (e) {
        console.log('Could not dismiss notification:', e);
      }

      setTimeout(async () => {
        try {
          const stored = await AsyncStorage.getItem('dominder_reminders');
          const currentReminders: Reminder[] = stored ? JSON.parse(stored) : [];
          const reminder = currentReminders.find((r: Reminder) => r.id === reminderId);
          if (reminder) {
            console.log(`Snoozing reminder for ${minutes} minutes: ${reminderId}`);
            const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
            
            if (reminder.isExpired) {
              updateReminderRef.current.mutate({ 
                ...reminder, 
                snoozeUntil,
                isExpired: false,
                lastTriggeredAt: new Date().toISOString()
              });
            } else {
              updateReminderRef.current.mutate({ 
                ...reminder, 
                snoozeUntil,
                lastTriggeredAt: reminder.lastTriggeredAt || new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error('Error getting fresh reminder data:', error);
        }
      }, 100);
    };

    const handleNotificationDismissed = (reminderId: string) => {
      console.log(`Notification Dismissed (swiped away) for reminder: ${reminderId}`);
      // Use a callback to get fresh reminders data
      setTimeout(async () => {
        try {
          const stored = await AsyncStorage.getItem('dominder_reminders');
          const currentReminders: Reminder[] = stored ? JSON.parse(stored) : [];
          const reminder = currentReminders.find((r: Reminder) => r.id === reminderId);
          if (reminder) {
            // For "Once" reminders, mark as expired when notification is dismissed without action
            // Exception: Medium priority "Once" reminders should NOT be marked as expired
            if (reminder.repeatType === 'none' && reminder.priority !== 'medium') {
              console.log(`Marking "Once" reminder as expired due to dismissed notification: ${reminderId}`);
              updateReminderRef.current.mutate({ 
                ...reminder, 
                isExpired: true,
                lastTriggeredAt: new Date().toISOString()
              });
            } else if (reminder.repeatType === 'none' && reminder.priority === 'medium') {
              console.log(`Medium priority "Once" reminder dismissed - not marking as expired: ${reminderId}`);
            } else {
              // For repeating reminders, just log that it was dismissed
              console.log(`Repeating reminder notification dismissed: ${reminderId}`);
            }
          }
        } catch (error) {
          console.error('Error getting fresh reminder data:', error);
        }
      }, 100);
    };
    return () => {
      try { unsubscribe(); } catch {}
      appStateSubscription?.remove();
    };
  }, [queryClient]); // Add queryClient to dependencies

  // Schedule notifications for low priority reminders
  const scheduledNotifications = useRef(new Map<string, string>());
  
  // Track reminder configurations to detect changes
  const reminderConfigsRef = useRef(new Map<string, string>());
  // Track last update time to prevent rapid updates
  const lastUpdateTimeRef = useRef(new Map<string, number>());
  
  useEffect(() => {
    console.log('[ReminderEngine] Reminders updated:', reminders);
    const processNotifications = async () => {
      const now = Date.now();
      
      for (const reminder of reminders) {
        // Skip reminders with internal flags to prevent loops
        if (reminder.snoozeClearing || reminder.notificationUpdating) {
          console.log(`Skipping reminder ${reminder.id} - has internal flags`);
          continue;
        }
        
        // Check if we recently updated this reminder (within last 5 seconds)
        const lastUpdateTime = lastUpdateTimeRef.current.get(reminder.id) || 0;
        const timeSinceLastUpdate = now - lastUpdateTime;
        if (timeSinceLastUpdate < 5000) {
          console.log(`Skipping notification processing for reminder ${reminder.id} - recently updated ${timeSinceLastUpdate}ms ago`);
          continue;
        }
        const shouldSchedule = (reminder.priority === 'low' || reminder.priority === 'medium' || reminder.priority === 'high') && reminder.isActive && !reminder.isCompleted && !reminder.isExpired && !reminder.isPaused;
        const existingNotificationId = scheduledNotifications.current.get(reminder.id);
        
        // Create a config string to detect changes in reminder settings
        // Don't include notificationId, snoozeClearing, lastTriggeredAt, or nextReminderDate in the config to avoid infinite loops
        const configString = `${reminder.date}_${reminder.time}_${reminder.snoozeUntil || ''}_${reminder.repeatType}_${JSON.stringify(reminder.repeatDays || [])}_${reminder.monthlyDay || ''}_${JSON.stringify(reminder.everyInterval || {})}_${reminder.isActive}_${reminder.isPaused}_${reminder.priority}`;
        const previousConfig = reminderConfigsRef.current.get(reminder.id);
        const configChanged = previousConfig && previousConfig !== configString && !reminder.snoozeClearing;
        
        if (shouldSchedule) {
          console.log(`[processNotifications] Reminder ${reminder.id} should be scheduled.`);
          let needsReschedule = false;
          
          // Check if reminder configuration changed (date, time, repeat settings, etc.)
          if (configChanged) {
            console.log(`Reminder ${reminder.id} configuration changed, needs rescheduling`);
            console.log(`Previous config: ${previousConfig}`);
            console.log(`New config: ${configString}`);
            needsReschedule = true;
            
            // Cancel ALL notifications for this reminder (including any duplicates or orphaned ones)
            console.log(`Cancelling all notifications for rescheduled reminder: ${reminder.id}`);
            await notificationService.cancelAllNotificationsForReminder(reminder.id);
            scheduledNotifications.current.delete(reminder.id);
            // Add a delay to prevent immediate re-scheduling
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          if (!existingNotificationId && !needsReschedule) {
            const osHasScheduled = await notificationService.hasScheduledForReminder(reminder.id);
            needsReschedule = !osHasScheduled;
          }
          if (reminder.snoozeUntil) {
            needsReschedule = true;
          }
          
          // For repeating reminders, check if we need to reschedule based on nextReminderDate
          if (reminder.repeatType !== 'none' && reminder.lastTriggeredAt && !configChanged && !needsReschedule) {
            const lastTriggered = new Date(reminder.lastTriggeredAt);
            const now = new Date();
            const timeSinceLastTrigger = now.getTime() - lastTriggered.getTime();
            
            // If triggered recently (within 2 minutes), check if notification needs update
            if (timeSinceLastTrigger < 2 * 60 * 1000) {
              console.log(`Recently triggered ${reminder.repeatType} reminder ${reminder.id}, checking if reschedule needed`);
              // Cancel existing notification and reschedule for next occurrence
              if (existingNotificationId) {
                await notificationService.cancelNotification(existingNotificationId);
                scheduledNotifications.current.delete(reminder.id);
              }
              needsReschedule = true;
            }
          }
          
          // If the reminder's stored notificationId changed, simply sync our map without re-scheduling
          if (reminder.notificationId && !existingNotificationId && !configChanged) {
            // Sync the notificationId if we don't have it tracked yet
            scheduledNotifications.current.set(reminder.id, reminder.notificationId);
            needsReschedule = false;
          } else if (reminder.notificationId && existingNotificationId && reminder.notificationId !== existingNotificationId && !configChanged) {
            // If notificationId changed but config didn't, just update our tracking
            scheduledNotifications.current.set(reminder.id, reminder.notificationId);
            needsReschedule = false;
          }
          
          if (needsReschedule) {
            if (existingNotificationId) {
              console.log(`Cancelling old notification for reminder: ${reminder.id}`);
              await notificationService.cancelNotification(existingNotificationId);
              scheduledNotifications.current.delete(reminder.id);
            }
            
            console.log(`Scheduling notification for ${reminder.repeatType} reminder: ${reminder.id}`);
            const notificationId = await notificationService.scheduleReminderByModel(reminder);
            if (notificationId) {
              scheduledNotifications.current.set(reminder.id, notificationId);
              reminderConfigsRef.current.set(reminder.id, configString); // Store the config
              lastUpdateTimeRef.current.set(reminder.id, Date.now()); // Track update time
              // Only update notificationId if it actually changed and we're not already in an update cycle
              if (notificationId !== reminder.notificationId && !configChanged && !reminder.notificationUpdating) {
                // Use setTimeout to avoid triggering immediate re-render and add flag to prevent loops
                setTimeout(() => {
                  // Double-check the reminder still needs this update
                  const currentUpdateTime = lastUpdateTimeRef.current.get(reminder.id) || 0;
                  if (Date.now() - currentUpdateTime < 1000) {
                    updateReminderRef.current.mutate({ 
                      ...reminder, 
                      notificationId,
                      notificationUpdating: true
                    });
                  }
                }, 500);
              }
            }
          } else if (!needsReschedule) {
            // Update stored config even if no reschedule needed
            reminderConfigsRef.current.set(reminder.id, configString);
          }
        } else if (!shouldSchedule && existingNotificationId) {
          console.log(`[processNotifications] Reminder ${reminder.id} should NOT be scheduled, cancelling notification.`);
          console.log(`Cancelling notification for reminder: ${reminder.id}`);
          await notificationService.cancelNotification(existingNotificationId);
          scheduledNotifications.current.delete(reminder.id);
          reminderConfigsRef.current.delete(reminder.id); // Remove config tracking
          lastUpdateTimeRef.current.delete(reminder.id); // Remove update time tracking
          if (reminder.notificationId) {
            updateReminderRef.current.mutate({ ...reminder, notificationId: undefined });
          }
        } else if (!shouldSchedule) {
          // Clean up config tracking for inactive reminders
          reminderConfigsRef.current.delete(reminder.id);
          lastUpdateTimeRef.current.delete(reminder.id);
        }
      }
      
      const currentReminderIds = new Set(reminders.map(r => r.id));
      for (const [scheduledId, notificationId] of scheduledNotifications.current) {
        if (!currentReminderIds.has(scheduledId)) {
          await notificationService.cancelNotification(notificationId);
          scheduledNotifications.current.delete(scheduledId);
          reminderConfigsRef.current.delete(scheduledId); // Clean up config tracking
          lastUpdateTimeRef.current.delete(scheduledId); // Clean up update time tracking
        }
      }
    };
    
    processNotifications();
  }, [reminders]);

  useEffect(() => {
    const checkReminders = async () => {
      const now = new Date();
      setLastTick(now.getTime());
      
      // Double-check reminders exist in storage to prevent deleted reminders from executing
      let currentReminders: Reminder[] = [];
      try {
        const stored = await AsyncStorage.getItem('dominder_reminders');
        currentReminders = stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Error loading current reminders for safety check:', error);
        return;
      }
      
      reminders.forEach((r) => {
          // SAFETY CHECK: Ensure reminder still exists in storage (not deleted)
          const reminderExists = currentReminders.some(stored => stored.id === r.id);
          if (!reminderExists) {
            console.log(`Skipping deleted reminder: ${r.id}`);
            return;
          }
          
          // Skip if already completed or expired
          if (r.isCompleted || r.isExpired) return;
          
          // Check for expiration of "once" reminders (30 minutes after trigger)
          if (r.repeatType === 'none' && r.lastTriggeredAt && !r.snoozeUntil) {
            const triggeredTime = new Date(r.lastTriggeredAt);
            const timeSinceTrigger = now.getTime() - triggeredTime.getTime();
            if (timeSinceTrigger > 30 * 60 * 1000) { // 30 minutes
              console.log(`Marking "once" reminder ${r.id} as expired (triggered ${Math.floor(timeSinceTrigger / 60000)} minutes ago)`);
              updateReminderRef.current.mutate({ 
                ...r, 
                isExpired: true
              });
              return;
            }
          }
          
          if (!r.isActive || r.isPaused) return;
          
          // Skip low and medium priority reminders as they are handled by notifications
          if (r.priority === 'low' || r.priority === 'medium') return;
          
          const next = computeNextFireInternal(r, now);
          if (!next) return;
          
          // Check if we've already triggered this reminder recently (within last 2 minutes)
          if (r.lastTriggeredAt) {
            const lastTriggered = new Date(r.lastTriggeredAt);
            const timeSinceLastTrigger = now.getTime() - lastTriggered.getTime();
            if (timeSinceLastTrigger < 2 * 60 * 1000) {
              return; // Skip if triggered recently
            }
          }
          
          const diff = next.getTime() - now.getTime();
          // Only trigger if the time is within the next 30 seconds (not in the past)
          if (diff >= 0 && diff < 30 * 1000) {
            // For high priority reminders, open the alarm screen
            if (r.priority === 'high') {
              console.log(`High priority reminder triggered: ${r.id} - opening alarm screen at ${next.toISOString()}`);
              router.push(`/alarm?reminderId=${r.id}`);
              
              // Update the last triggered time
              updateReminderRef.current.mutate({ ...r, lastTriggeredAt: now.toISOString() });
            } else {
              // For other priorities (if any), handle normally
              if (r.repeatType === 'none') {
                updateReminderRef.current.mutate({ ...r, isCompleted: true, lastTriggeredAt: now.toISOString() });
              } else {
                updateReminderRef.current.mutate({ ...r, lastTriggeredAt: now.toISOString() });
              }
            }
          }
      });
    };

    // Check immediately on mount with a small delay to ensure everything is initialized
    const initialTimeout = setTimeout(checkReminders, 500);
    
    // Then check every 30 seconds
    const interval = setInterval(checkReminders, 30 * 1000);
    
    // Periodic cleanup of orphaned notifications every 5 minutes
    const cleanupInterval = setInterval(async () => {
      try {
        await notificationService.cleanupOrphanedNotifications();
      } catch (error) {
        console.error('Error during periodic notification cleanup:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, [reminders, computeNextFireInternal]);

  return React.useMemo(() => ({ lastTick }), [lastTick]);
});

export default ReminderEngineProvider;
