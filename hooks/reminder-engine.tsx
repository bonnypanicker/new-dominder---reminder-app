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
          // For ringer mode (high priority), open alarm screen
          console.log('[Dominder-Debug] Alarm action pressed, opening alarm screen');
          handleNotificationOpen(reminderId);
        } else if (pressAction?.id === 'done') {
          handleNotificationDone(reminderId);
        } else {
          const snoozeMatch = /^snooze_(\d+)$/.exec(pressAction?.id || '');
          if (snoozeMatch) {
            const minutes = parseInt(snoozeMatch[1], 10);
            handleNotificationSnooze(reminderId, minutes);
          } else if (pressAction?.id === 'default') {
            // For ringer mode (high priority), open alarm screen
            if (priority === 'high') {
              console.log('[Dominder-Debug] High priority notification pressed, opening alarm screen');
              handleNotificationOpen(reminderId);
            } else {
              // For standard and silent modes, open the app (navigate to home)
              console.log('[Dominder-Debug] Notification body pressed for standard/silent mode, opening app');
              try {
                router.push('/');
              } catch (e) {
                console.error('[Dominder-Debug] Failed to navigate to home:', e);
              }
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
    console.log('[Dominder-Debug] Old reminder engine processing loop disabled to prevent conflicts.');
  }, [reminders]);



  return React.useMemo(() => ({ lastTick }), [lastTick]);
});

export default ReminderEngineProvider;
