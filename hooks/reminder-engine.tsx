import React, { useEffect, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useReminders, useUpdateReminder } from '@/hooks/reminder-store';
import { Reminder } from '@/types/reminder';
import { notificationService } from '@/hooks/notification-service';
import { calculateNextReminderDate } from '@/services/reminder-utils';

interface EngineContext {
  lastTick: number;
}

export const [ReminderEngineProvider, useReminderEngine] = createContextHook<EngineContext>(() => {
  const { data: reminders = [] } = useReminders();
  const updateReminder = useUpdateReminder();
  const [lastTick, setLastTick] = React.useState<number>(Date.now());
  const updateReminderRef = useRef(updateReminder);
  const processedReminders = useRef(new Map<string, number>());
  const schedulingInProgress = useRef(new Set<string>());
  
  updateReminderRef.current = updateReminder;
  
  useEffect(() => {
    const tick = setInterval(() => setLastTick(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    console.log('[ReminderEngine] Processing reminders, count:', reminders.length);
    
    const now = new Date();
    const nowTimestamp = now.getTime();
    
    for (const reminder of reminders) {
      // Check if reminder should be auto-resumed from pause-until-date
      if (reminder.isPaused && reminder.pauseUntilDate) {
        try {
          // Parse pause until date and set to end of that day (23:59:59.999)
          // This means the reminder is paused INCLUDING the selected date
          // and will auto-resume AFTER that date passes
          const pauseUntil = new Date(reminder.pauseUntilDate);
          pauseUntil.setHours(23, 59, 59, 999);
          
          if (now > pauseUntil) {
            // Pause period has ended - automatically resume the reminder
            console.log(`[ReminderEngine] Auto-resuming reminder ${reminder.id} - pause until ${reminder.pauseUntilDate} has passed`);
            updateReminderRef.current.mutate({
              ...reminder,
              isPaused: false,
              pauseUntilDate: undefined,
            });
            // Skip this iteration - will be processed on next tick when updates are reflected
            processedReminders.current.delete(reminder.id);
            continue;
          } else {
            // Still within pause period
            console.log(`[ReminderEngine] Reminder ${reminder.id} is paused until ${reminder.pauseUntilDate}`);
            processedReminders.current.delete(reminder.id);
            continue;
          }
        } catch (e) {
          console.error(`[ReminderEngine] Error parsing pauseUntilDate for ${reminder.id}:`, e);
          // If date parsing fails, treat as regular pause
        }
      }
      
      if (!reminder.isActive || reminder.isCompleted || reminder.isPaused) {
        processedReminders.current.delete(reminder.id);
        continue;
      }
      
      const reminderKey = `${reminder.id}-${reminder.date}-${reminder.time}-${reminder.priority}-${reminder.snoozeUntil || ''}-${reminder.nextReminderDate || ''}`;
      const lastProcessedHash = processedReminders.current.get(reminder.id);
      const currentHash = reminderKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      
      if (lastProcessedHash === currentHash && !schedulingInProgress.current.has(reminder.id)) {
        continue;
      }
      
      if (schedulingInProgress.current.has(reminder.id)) {
        console.log(`[ReminderEngine] Skipping ${reminder.id} - scheduling already in progress`);
        continue;
      }
      
      console.log(`[ReminderEngine] Processing reminder ${reminder.id}, repeatType: ${reminder.repeatType}`);
      
      let nextFireTime: Date | null = null;
      let reminderToSchedule: Reminder = reminder;
      
      if (reminder.snoozeUntil) {
        nextFireTime = new Date(reminder.snoozeUntil);
        console.log(`[ReminderEngine] Reminder ${reminder.id} is snoozed until ${nextFireTime.toISOString()}`);
      } else if (reminder.nextReminderDate) {
        nextFireTime = new Date(reminder.nextReminderDate);
        console.log(`[ReminderEngine] Reminder ${reminder.id} has nextReminderDate: ${nextFireTime.toISOString()}`);
      } else {
        nextFireTime = calculateNextReminderDate(reminder, now);
        
        if (nextFireTime && reminder.repeatType !== 'none') {
          console.log(`[ReminderEngine] Calculated next fire time for ${reminder.id}: ${nextFireTime.toISOString()}, updating reminder`);
          const updatedModel: Reminder = {
            ...reminder,
            nextReminderDate: nextFireTime.toISOString(),
            isActive: true,
            isCompleted: false,
            isExpired: false,
          };
          updateReminderRef.current.mutate(updatedModel);
          // Use updated model for immediate scheduling
          reminderToSchedule = updatedModel;
        }
      }
      
      if (nextFireTime && nextFireTime > now) {
        console.log(`[ReminderEngine] Scheduling notification for reminder ${reminder.id} at ${nextFireTime.toISOString()}`);
        
        schedulingInProgress.current.add(reminder.id);
        
        notificationService.scheduleReminderByModel(reminderToSchedule)
          .then(() => {
            const scheduledKey = `${reminderToSchedule.id}-${reminderToSchedule.date}-${reminderToSchedule.time}-${reminderToSchedule.priority}-${reminderToSchedule.snoozeUntil || ''}-${reminderToSchedule.nextReminderDate || ''}`;
            const scheduledHash = scheduledKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            processedReminders.current.set(reminder.id, scheduledHash);
            schedulingInProgress.current.delete(reminder.id);
            console.log(`[ReminderEngine] Successfully scheduled ${reminder.id}`);
          })
          .catch((error) => {
            console.error(`[ReminderEngine] Failed to schedule reminder ${reminder.id}:`, error);
            schedulingInProgress.current.delete(reminder.id);
          });
      } else if (nextFireTime && nextFireTime <= now) {
        console.log(`[ReminderEngine] Reminder ${reminder.id} fire time ${nextFireTime.toISOString()} is in the past`);
        
        if (reminder.repeatType === 'none' && !reminder.snoozeUntil) {
          console.log(`[ReminderEngine] Marking one-time reminder ${reminder.id} as expired`);
          updateReminderRef.current.mutate({
            ...reminder,
            isExpired: true,
            isActive: false,
          });
          processedReminders.current.delete(reminder.id);
        } else if (reminder.snoozeUntil) {
          // CRITICAL FIX: Do NOT auto-advance snoozed reminders
          // The snooze alarm should fire and clear snoozeUntil via markReminderDone/reschedule
          // If we auto-advance here, we cancel the snoozed native alarm prematurely
          console.log(`[ReminderEngine] Skipping auto-advance for snoozed reminder ${reminder.id} - letting snooze alarm fire`);
          processedReminders.current.delete(reminder.id);
        } else if (reminder.repeatType !== 'none') {
          // Auto-advance repeating reminders (e.g., Every X minutes)
          // For recurring reminders, we need to advance to the next occurrence automatically
          // This ensures that "every X minutes" reminders continue to fire even if user doesn't interact
          
          // Increment occurrence count when auto-advancing past occurrences
          // This ensures count-based "ends after X occurrences" works correctly
          const occurred = reminder.occurrenceCount ?? 0;
          const hasCountCap = reminder.untilType === 'count' && typeof reminder.untilCount === 'number';
          const nextOccurCount = hasCountCap && occurred >= (reminder.untilCount as number)
            ? occurred
            : occurred + 1;
          
          // IMPORTANT: Pretend the reminder just triggered at its scheduled time.
          // This tells calculateNextReminderDate to compute the *subsequent* interval
          // relative to the current trigger, preventing duplicate scheduling of the same time.
          const reminderForCalc = { 
            ...reminder, 
            occurrenceCount: nextOccurCount,
            lastTriggeredAt: reminder.nextReminderDate || now.toISOString()
          };
          
          const nextDate = calculateNextReminderDate(reminderForCalc, now);
          
          if (nextDate && nextDate > now) {
            const updated = {
              ...reminderForCalc,
              nextReminderDate: nextDate.toISOString(),
              lastTriggeredAt: new Date().toISOString(),
              snoozeUntil: undefined,
              isActive: true,
              isCompleted: false,
              isExpired: false,
            } as Reminder;

            console.log(`[ReminderEngine] Advancing ${reminder.id} to next occurrence at ${updated.nextReminderDate}`);
            updateReminderRef.current.mutate(updated);

            // Schedule immediately using the updated object so timestamp uses nextReminderDate
            schedulingInProgress.current.add(reminder.id);
            notificationService.scheduleReminderByModel(updated)
              .then(() => {
                const scheduledKey = `${updated.id}-${updated.date}-${updated.time}-${updated.priority}-${updated.snoozeUntil || ''}-${updated.nextReminderDate || ''}`;
                const scheduledHash = scheduledKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                processedReminders.current.set(reminder.id, scheduledHash);
                schedulingInProgress.current.delete(reminder.id);
                console.log(`[ReminderEngine] Auto-rescheduled ${reminder.id}`);
              })
              .catch((error) => {
                console.error(`[ReminderEngine] Failed to auto-reschedule ${reminder.id}:`, error);
                schedulingInProgress.current.delete(reminder.id);
              });
          } else {
            console.log(`[ReminderEngine] No valid future occurrence computed for ${reminder.id}`);
            processedReminders.current.delete(reminder.id);
          }
        }
      } else {
        console.log(`[ReminderEngine] No valid fire time for reminder ${reminder.id}`);
        console.log(`[ReminderEngine] Reminder details:`, {
          date: reminder.date,
          time: reminder.time,
          snoozeUntil: reminder.snoozeUntil,
          nextReminderDate: reminder.nextReminderDate,
          repeatType: reminder.repeatType
        });
        processedReminders.current.delete(reminder.id);
      }
    }
    
    const cleanupInterval = setInterval(() => {
      const staleKeys: string[] = [];
      processedReminders.current.forEach((_, key) => {
        if (!reminders.find(r => r.id === key)) {
          staleKeys.push(key);
        }
      });
      staleKeys.forEach(key => processedReminders.current.delete(key));
    }, 60000);
    
    return () => clearInterval(cleanupInterval);
  }, [reminders, lastTick]);

  return React.useMemo(() => ({ lastTick }), [lastTick]);
});

export default ReminderEngineProvider;