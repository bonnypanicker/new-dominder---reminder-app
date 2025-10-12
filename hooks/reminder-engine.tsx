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
