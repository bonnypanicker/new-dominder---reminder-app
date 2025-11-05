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
        } else if (reminder.repeatType !== 'none') {
          // Auto-advance repeating reminders (e.g., Every X minutes)
          // For recurring reminders, we need to advance to the next occurrence automatically
          // This ensures that "every X minutes" reminders continue to fire even if user doesn't interact
          
          let nextDate = calculateNextReminderDate(reminder, now);
          
          // For 'every' type reminders, if the calculated next date is still in the past,
          // we need to keep advancing until we get a future date
          if (reminder.repeatType === 'every' && reminder.everyInterval && nextDate && nextDate <= now) {
            console.log(`[ReminderEngine] Next calculated date ${nextDate.toISOString()} is still in past, advancing further`);
            
            const interval = reminder.everyInterval;
            const addMs = interval.unit === 'minutes' 
              ? interval.value * 60 * 1000 
              : interval.unit === 'hours' 
              ? interval.value * 60 * 60 * 1000 
              : interval.value * 24 * 60 * 60 * 1000;
            
            // Calculate how many intervals we need to skip to get to the future
            const timeDiff = now.getTime() - nextDate.getTime();
            const intervalsToSkip = Math.ceil(timeDiff / addMs);
            nextDate = new Date(nextDate.getTime() + (intervalsToSkip * addMs));
            
            console.log(`[ReminderEngine] Advanced ${reminder.id} by ${intervalsToSkip} intervals to ${nextDate.toISOString()}`);
          }
          
          if (nextDate && nextDate > now) {
            const updated = {
              ...reminder,
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