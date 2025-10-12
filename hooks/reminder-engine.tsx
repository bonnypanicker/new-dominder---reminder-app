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
  const processedReminders = useRef(new Set<string>());
  
  updateReminderRef.current = updateReminder;
  
  useEffect(() => {
    console.log('[ReminderEngine] Processing reminders, count:', reminders.length);
    
    const now = new Date();
    
    for (const reminder of reminders) {
      if (!reminder.isActive || reminder.isCompleted || reminder.isPaused) {
        continue;
      }
      
      const reminderKey = `${reminder.id}-${reminder.date}-${reminder.time}-${reminder.snoozeUntil || ''}-${reminder.nextReminderDate || ''}`;
      
      if (processedReminders.current.has(reminderKey)) {
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
        
        notificationService.scheduleReminderByModel(reminder).catch((error) => {
          console.error(`[ReminderEngine] Failed to schedule reminder ${reminder.id}:`, error);
        });
        
        processedReminders.current.add(reminderKey);
      } else if (nextFireTime && nextFireTime <= now) {
        console.log(`[ReminderEngine] Reminder ${reminder.id} fire time ${nextFireTime.toISOString()} is in the past`);
        
        if (reminder.repeatType === 'none' && !reminder.snoozeUntil) {
          console.log(`[ReminderEngine] Marking one-time reminder ${reminder.id} as expired`);
          updateReminderRef.current.mutate({
            ...reminder,
            isExpired: true,
            isActive: false,
          });
        }
      } else {
        console.log(`[ReminderEngine] No valid fire time for reminder ${reminder.id}`);
      }
    }
    
    const cleanupInterval = setInterval(() => {
      processedReminders.current.clear();
    }, 60000);
    
    return () => clearInterval(cleanupInterval);
  }, [reminders]);

  return React.useMemo(() => ({ lastTick }), [lastTick]);
});

export default ReminderEngineProvider;
