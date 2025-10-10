import React, { useEffect, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useReminders, useUpdateReminder } from '@/hooks/reminder-store';
import { Reminder } from '@/types/reminder';
import { notificationService } from '@/hooks/notification-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { calculateNextReminderDate } from '@/services/reminder-utils';

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
        console.log(`[Dominder-Debug] Snooze time has passed for reminder ${reminder.id}, clearing snooze, repeatType: ${reminder.repeatType}`);
        // Use a flag to prevent multiple clears
        if (!reminder.snoozeClearing) {
          // For "once" reminders that were snoozed, mark as completed after snooze fires
          if (reminder.repeatType === 'none' && reminder.wasSnoozed) {
            console.log(`[Dominder-Debug] Once reminder ${reminder.id} snooze expired, marking as completed`);
            setTimeout(() => {
              updateReminderRef.current.mutate({ 
                ...reminder, 
                snoozeUntil: undefined,
                isCompleted: true,
                wasSnoozed: undefined,
                snoozeClearing: true
              });
            }, 100);
            return null;
          }
          // For repeating reminders, just clear snooze
          setTimeout(() => {
            updateReminderRef.current.mutate({ 
              ...reminder, 
              snoozeUntil: undefined,
              wasSnoozed: undefined,
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
        let candidate = setTime(new Date(now.getFullYear(), now.getMonth(), dayOfMonth));
        if (candidate <= now) {
          candidate = setTime(new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth));
        }
        console.log(`[Dominder-Debug] Monthly computeNextFire -> desired=${dayOfMonth}, result=${candidate.toISOString()}`);
        return candidate;
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
        console.log(`[Dominder-Debug] Unknown repeat type in computeNextFire: ${reminder.repeatType}`);
        return null;
    }
  }, []);
  
  // Initialize notification service and setup response handler (only once)
  useEffect(() => {
    const initNotifications = async () => {
      try {
        console.log('[Dominder-Debug] ReminderEngine: Initializing notifications');
        
        // Check and request permissions first
        const hasPermission = await notificationService.checkPermissions();
        if (!hasPermission) {
          console.log('[Dominder-Debug] No notification permission, requesting...');
          const granted = await notificationService.requestPermissions();
          if (!granted) {
            console.error('[Dominder-Debug] Notification permission denied by user');
            return;
          }
        }
        
        await notificationService.initialize();
        await notificationService.cleanupOrphanedNotifications();
        
        // Log all currently scheduled notifications for debugging
        const scheduled = await notificationService.getAllScheduledNotifications();
        console.log(`[Dominder-Debug] Currently scheduled notifications: ${scheduled.length}`);
        scheduled.forEach((trigger: any) => {
          const timestamp = trigger.trigger?.timestamp;
          const id = trigger.notification?.id;
          const reminderId = trigger.notification?.data?.reminderId;
          if (timestamp) {
            const date = new Date(timestamp);
            const inSeconds = Math.round((timestamp - Date.now()) / 1000);
            console.log(`[Dominder-Debug]   - ${id} (reminder: ${reminderId}) scheduled for ${date.toISOString()} (in ${inSeconds}s)`);
          }
        });
      } catch (error) {
        console.error('[Dominder-Debug] Failed to initialize notifications in engine:', error);
      }
    };

    initNotifications();

    // Listen for app state changes to invalidate cache when coming from background
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[Dominder-Debug] App became active, invalidating reminders cache');
        // Invalidate the reminders query to refetch from AsyncStorage
        // This ensures UI reflects any changes made by background handler
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
      }
    });

    const EVENT_TYPE_PRESS = 1 as const;
    const EVENT_TYPE_DISMISSED = 3 as const;

    const onEvent = async ({ type, detail }: any) => {
      console.log(`[Dominder-Debug] Received notifee event: type=${type}, detail=${JSON.stringify(detail)}`);
      const { notification, pressAction } = detail ?? {};
      if (!notification) return;
      const reminderId = notification.data?.reminderId;

      if (typeof reminderId !== 'string') {
        return;
      }

      if (type === EVENT_TYPE_PRESS) {
        const priority = notification.data?.priority;
        
        if (pressAction?.id === 'alarm') {
          handleNotificationOpen(reminderId);
        } else if (pressAction?.id === 'done') {
          handleNotificationDone(reminderId);
        } else {
          const snoozeMatch = /^snooze_(\d+)$/.exec(pressAction?.id || '');
          if (snoozeMatch) {
            const minutes = parseInt(snoozeMatch[1], 10);
            handleNotificationSnooze(reminderId, minutes);
          } else if (pressAction?.id === 'default') {
            // Only open alarm screen for ringer mode (high priority)
            if (priority === 'high') {
              handleNotificationOpen(reminderId);
            } else {
              console.log('[Dominder-Debug] Notification pressed but not ringer mode, priority:', priority);
            }
          }
        }
      } else if (type === EVENT_TYPE_DISMISSED) {
        handleNotificationDismissed(reminderId);
      }
    };

    const unsubscribe = notificationService.subscribeToEvents(onEvent);

    const handleNotificationOpen = (reminderId: string) => {
      try {
        console.log(`[Dominder-Debug] Handling notification open for reminder: ${reminderId}`);
        router.push(`/alarm?reminderId=${reminderId}`);
      } catch (e) {
        console.error('[Dominder-Debug] Failed to open alarm screen from notification:', e);
      }
    };

    const handleNotificationDone = async (reminderId: string) => {
      console.log(`[Dominder-Debug] Handling notification 'Done' action for reminder: ${reminderId}`);
      try {
        const notifeeModule = await import('@notifee/react-native');
        const notifee = notifeeModule.default;
        const displayedNotifications = await notifee.getDisplayedNotifications();
        const targetNotification = displayedNotifications.find((n: any) => n.notification?.data?.reminderId === reminderId);
        if (targetNotification?.notification?.id) {
          await notifee.cancelNotification(targetNotification.notification.id);
          console.log(`[Dominder-Debug] Dismissed notification ${targetNotification.notification.id} after Done action`);
        }
      } catch (e) {
        console.log('[Dominder-Debug] Could not dismiss notification:', e);
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
                console.log(`[Dominder-Debug] Reminder ${reminderId} has expired (triggered ${Math.floor(timeSinceTrigger / 60000)} minutes ago)`);
                await notificationService.displayInfoNotification('Reminder Expired', 'This reminder has expired and cannot be marked as done.');
                return;
              }
            }
            console.log(`[Dominder-Debug] Marking reminder as completed from notification: ${reminderId}`);
            if (reminder.repeatType === 'none') {
              updateReminderRef.current.mutate({ 
                ...reminder, 
                isCompleted: true, 
                lastTriggeredAt: reminder.lastTriggeredAt || now.toISOString(),
                snoozeUntil: undefined,
                wasSnoozed: undefined
              });
            } else {
              const nextDate = calculateNextReminderDate(reminder, now);
              console.log(`[Dominder-Debug] Updating repeating reminder ${reminderId} - type: ${reminder.repeatType}, next date: ${nextDate?.toISOString()}`);
              updateReminderRef.current.mutate({ 
                ...reminder, 
                lastTriggeredAt: now.toISOString(),
                nextReminderDate: nextDate ? nextDate.toISOString() : undefined,
                snoozeUntil: undefined,
                wasSnoozed: undefined
              });
            }
          }
        } catch (error) {
          console.error('[Dominder-Debug] Error getting fresh reminder data:', error);
        }
      }, 100);
    };

    const handleNotificationSnooze = async (reminderId: string, minutes: number = 5) => {
      console.log(`[Dominder-Debug] Handling notification 'Snooze' action for reminder: ${reminderId} for ${minutes} minutes`);
      try {
        const notifeeModule = await import('@notifee/react-native');
        const notifee = notifeeModule.default;
        const displayedNotifications = await notifee.getDisplayedNotifications();
        const targetNotification = displayedNotifications.find((n: any) => n.notification?.data?.reminderId === reminderId);
        if (targetNotification?.notification?.id) {
          await notifee.cancelNotification(targetNotification.notification.id);
          console.log(`[Dominder-Debug] Dismissed notification ${targetNotification.notification.id} after Snooze action`);
        }
      } catch (e) {
        console.log('[Dominder-Debug] Could not dismiss notification:', e);
      }

      setTimeout(async () => {
        try {
          const stored = await AsyncStorage.getItem('dominder_reminders');
          const currentReminders: Reminder[] = stored ? JSON.parse(stored) : [];
          const reminder = currentReminders.find((r: Reminder) => r.id === reminderId);
          if (reminder) {
            console.log(`[Dominder-Debug] Snoozing reminder for ${minutes} minutes: ${reminderId}, repeatType: ${reminder.repeatType}`);
            const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
            
            if (reminder.isExpired) {
              updateReminderRef.current.mutate({ 
                ...reminder, 
                snoozeUntil,
                isExpired: false,
                lastTriggeredAt: new Date().toISOString(),
                wasSnoozed: true
              });
            } else {
              updateReminderRef.current.mutate({ 
                ...reminder, 
                snoozeUntil,
                lastTriggeredAt: reminder.lastTriggeredAt || new Date().toISOString(),
                wasSnoozed: true
              });
            }
          }
        } catch (error) {
          console.error('[Dominder-Debug] Error getting fresh reminder data:', error);
        }
      }, 100);
    };

    const handleNotificationDismissed = (reminderId: string) => {
      console.log(`[Dominder-Debug] Notification Dismissed (swiped away) for reminder: ${reminderId}`);
      setTimeout(async () => {
        try {
          const stored = await AsyncStorage.getItem('dominder_reminders');
          const currentReminders: Reminder[] = stored ? JSON.parse(stored) : [];
          const reminder = currentReminders.find((r: Reminder) => r.id === reminderId);
          if (reminder) {
            if (reminder.repeatType === 'none' && reminder.priority === 'low') {
              console.log(`[Dominder-Debug] Marking "Once" low priority reminder as expired due to dismissed notification: ${reminderId}`);
              updateReminderRef.current.mutate({ 
                ...reminder, 
                isExpired: true,
                lastTriggeredAt: new Date().toISOString()
              });
            } else {
              console.log(`[Dominder-Debug] Notification dismissed for reminder ${reminderId} (priority: ${reminder.priority}, repeat: ${reminder.repeatType})`);
            }
          }
        } catch (error) {
          console.error('[Dominder-Debug] Error getting fresh reminder data:', error);
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
    console.log('[Dominder-Debug] Reminder engine processing reminders...', reminders.length, 'reminders found.');
    const processNotifications = async () => {
      const now = Date.now();
      
      for (const reminder of reminders) {
        console.log(`[Dominder-Debug] Processing reminder: ${reminder.id} (${reminder.title}), repeatType: ${reminder.repeatType}, priority: ${reminder.priority}`);
        // Skip reminders with internal flags to prevent loops
        if (reminder.snoozeClearing || reminder.notificationUpdating) {
          console.log(`[Dominder-Debug] Skipping reminder ${reminder.id} - has internal flags`);
          continue;
        }
        
        // Check if we recently updated this reminder (within last 5 seconds)
        const lastUpdateTime = lastUpdateTimeRef.current.get(reminder.id) || 0;
        const timeSinceLastUpdate = now - lastUpdateTime;
        if (timeSinceLastUpdate < 5000) {
          console.log(`[Dominder-Debug] Skipping notification processing for reminder ${reminder.id} - recently updated ${timeSinceLastUpdate}ms ago`);
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
          console.log(`[Dominder-Debug] Reminder ${reminder.id} should be scheduled. Has existing notification: ${existingNotificationId}`);
          let needsReschedule = false;
          
          // Check if reminder configuration changed (date, time, repeat settings, etc.)
          if (configChanged) {
            console.log(`[Dominder-Debug] Reminder ${reminder.id} configuration changed, needs rescheduling`);
            console.log(`[Dominder-Debug] Previous config: ${previousConfig}`);
            console.log(`[Dominder-Debug] New config: ${configString}`);
            needsReschedule = true;
            
            // Cancel ALL notifications for this reminder (including any duplicates or orphaned ones)
            console.log(`[Dominder-Debug] Cancelling all notifications for rescheduled reminder: ${reminder.id}`);
            await notificationService.cancelAllNotificationsForReminder(reminder.id);
            scheduledNotifications.current.delete(reminder.id);
            // Add a delay to prevent immediate re-scheduling
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          if (!existingNotificationId && !needsReschedule) {
            const osHasScheduled = await notificationService.hasScheduledForReminder(reminder.id);
            console.log(`[Dominder-Debug] Reminder ${reminder.id} has no tracked notification. OS has scheduled: ${osHasScheduled}`);
            needsReschedule = !osHasScheduled;
          }
          if (reminder.snoozeUntil) {
            console.log(`[Dominder-Debug] Reminder ${reminder.id} is snoozed. Needs reschedule.`);
            needsReschedule = true;
          }
          
          // For repeating reminders, check if we need to reschedule based on nextReminderDate
          if (reminder.repeatType !== 'none' && !configChanged && !needsReschedule) {
            // Check if the scheduled notification is for the correct date
            if (existingNotificationId && reminder.nextReminderDate) {
              const triggers = await notificationService.getAllScheduledNotifications();
              const scheduledTrigger = triggers.find((t: any) => t.notification?.id === existingNotificationId);
              
              const triggerTimestamp = (scheduledTrigger?.trigger as any)?.timestamp;
              if (triggerTimestamp) {
                const scheduledTime = new Date(triggerTimestamp);
                const expectedTime = new Date(reminder.nextReminderDate);
                const timeDiff = Math.abs(scheduledTime.getTime() - expectedTime.getTime());
                
                // If scheduled time differs from expected by more than 10 seconds, reschedule
                if (timeDiff > 10000) {
                  console.log(`[Dominder-Debug] Repeating reminder ${reminder.id} scheduled for wrong time. Expected: ${expectedTime.toISOString()}, Scheduled: ${scheduledTime.toISOString()}`);
                  await notificationService.cancelNotification(existingNotificationId);
                  scheduledNotifications.current.delete(reminder.id);
                  needsReschedule = true;
                }
              }
            } else if (!existingNotificationId && reminder.nextReminderDate) {
              // No notification scheduled but we have a next date - need to schedule
              console.log(`[Dominder-Debug] Repeating reminder ${reminder.id} has nextReminderDate but no scheduled notification`);
              needsReschedule = true;
            }
          }
          
          // If the reminder's stored notificationId changed, simply sync our map without re-scheduling
          if (reminder.notificationId && !existingNotificationId && !configChanged) {
            // Sync the notificationId if we don't have it tracked yet
            console.log(`[Dominder-Debug] Syncing notification ID ${reminder.notificationId} for reminder ${reminder.id}`);
            scheduledNotifications.current.set(reminder.id, reminder.notificationId);
            needsReschedule = false;
          } else if (reminder.notificationId && existingNotificationId && reminder.notificationId !== existingNotificationId && !configChanged) {
            // If notificationId changed but config didn't, just update our tracking
            console.log(`[Dominder-Debug] Updating tracked notification ID for reminder ${reminder.id} to ${reminder.notificationId}`);
            scheduledNotifications.current.set(reminder.id, reminder.notificationId);
            needsReschedule = false;
          }
          
          if (needsReschedule) {
            if (existingNotificationId && !configChanged) {
              console.log(`[Dominder-Debug] Cancelling old notification ${existingNotificationId} for reminder: ${reminder.id}`);
              await notificationService.cancelNotification(existingNotificationId);
              scheduledNotifications.current.delete(reminder.id);
            }
            
            console.log(`[Dominder-Debug] Scheduling notification for ${reminder.repeatType} reminder: ${reminder.id}`);
            const notificationId = await notificationService.scheduleReminderByModel(reminder);
            if (notificationId) {
              console.log(`[Dominder-Debug] Scheduled notification ${notificationId} for reminder ${reminder.id}`);
              scheduledNotifications.current.set(reminder.id, notificationId);
              reminderConfigsRef.current.set(reminder.id, configString);
              lastUpdateTimeRef.current.set(reminder.id, Date.now());
              
              if (notificationId !== reminder.notificationId) {
                setTimeout(() => {
                  const currentUpdateTime = lastUpdateTimeRef.current.get(reminder.id) || 0;
                  if (Date.now() - currentUpdateTime < 2000) {
                    updateReminderRef.current.mutate({ 
                      ...reminder, 
                      notificationId
                    });
                  }
                }, 500);
              }
            } else {
              console.error(`[Dominder-Debug] Failed to schedule notification for reminder ${reminder.id}`);
            }
          } else if (!needsReschedule) {
            reminderConfigsRef.current.set(reminder.id, configString);
          }
        } else if (!shouldSchedule && existingNotificationId) {
          console.log(`[Dominder-Debug] Reminder ${reminder.id} should NOT be scheduled, cancelling notification ${existingNotificationId}.`);
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
          console.log(`[Dominder-Debug] Cleaning up orphaned notification ${notificationId} for deleted reminder ${scheduledId}`);
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
      console.log('[Dominder-Debug] ReminderEngine: Running periodic checkReminders');
      const now = new Date();
      setLastTick(now.getTime());
      
      // Double-check reminders exist in storage to prevent deleted reminders from executing
      let currentReminders: Reminder[] = [];
      try {
        const stored = await AsyncStorage.getItem('dominder_reminders');
        currentReminders = stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('[Dominder-Debug] Error loading current reminders for safety check:', error);
        return;
      }
      
      reminders.forEach((r) => {
          // SAFETY CHECK: Ensure reminder still exists in storage (not deleted)
          const reminderExists = currentReminders.some(stored => stored.id === r.id);
          if (!reminderExists) {
            console.log(`[Dominder-Debug] Skipping deleted reminder in checkReminders: ${r.id}`);
            return;
          }
          
          // Skip if already completed or expired
          if (r.isCompleted || r.isExpired) return;
          
          // Check for expiration of "once" reminders (30 minutes after trigger)
          if (r.repeatType === 'none' && r.lastTriggeredAt && !r.snoozeUntil) {
            const triggeredTime = new Date(r.lastTriggeredAt);
            const timeSinceTrigger = now.getTime() - triggeredTime.getTime();
            if (timeSinceTrigger > 30 * 60 * 1000) { // 30 minutes
              console.log(`[Dominder-Debug] Marking "once" reminder ${r.id} as expired (triggered ${Math.floor(timeSinceTrigger / 60000)} minutes ago)`);
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
              console.log(`[Dominder-Debug] High priority reminder triggered: ${r.id} - opening alarm screen at ${next.toISOString()}`);
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
        console.log('[Dominder-Debug] Running periodic cleanup of orphaned notifications');
        await notificationService.cleanupOrphanedNotifications();
      } catch (error) {
        console.error('[Dominder-Debug] Error during periodic notification cleanup:', error);
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
