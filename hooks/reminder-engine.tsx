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
    console.log('[ReminderEngine] Processing reminders, count:', reminders.length);
    
    const now = new Date();
    const nowTimestamp = now.getTime();
    
    for (const reminder of reminders) {
      if (!reminder.isActive || reminder.isCompleted || reminder.isPaused) {
        processedReminders.current.delete(reminder.id);
        continue;
      }
      
      const reminderKey = `${reminder.id}-${reminder.date}-${reminder.time}-${reminder.snoozeUntil || ''}-${reminder.nextReminderDate || ''}`;
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
          updateReminderRef.current.mutate({
            ...reminder,
            nextReminderDate: nextFireTime.toISOString(),
          });
        }
      }
      
      if (nextFireTime && nextFireTime > now) {
        console.log(`[ReminderEngine] Scheduling notification for reminder ${reminder.id} at ${nextFireTime.toISOString()}`);
        
        schedulingInProgress.current.add(reminder.id);
        
        notificationService.scheduleReminderByModel(reminder)
          .then(() => {
            processedReminders.current.set(reminder.id, currentHash);
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
  }, [reminders]);

  return React.useMemo(() => ({ lastTick }), [lastTick]);
});

export default ReminderEngineProvider;
