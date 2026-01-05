import { DeviceEventEmitter } from 'react-native';
import { notificationService } from '../hooks/notification-service';
import { calculateNextReminderDate } from '../services/reminder-utils';
import { getReminder, updateReminder, addReminder } from './reminder-service';

export async function rescheduleReminderById(reminderId: string, minutes: number) {
  console.log(`[Scheduler] Snoozing reminder ${reminderId} for ${minutes} minutes`);

  const reminder = await getReminder(reminderId);

  if (!reminder) {
    console.log(`[Scheduler] Reminder ${reminderId} not found for snooze.`);
    return;
  }

  if (reminder.isCompleted) {
    console.log(`[Scheduler] Reminder ${reminderId} is already completed, skipping snooze.`);
    return;
  }

  const nextTime = Date.now() + minutes * 60 * 1000;

  await notificationService.cancelAllNotificationsForReminder(reminderId);

  reminder.snoozeUntil = new Date(nextTime).toISOString();
  reminder.wasSnoozed = true;
  reminder.lastTriggeredAt = new Date().toISOString();

  await updateReminder(reminder);
  console.log(`[Scheduler] Snoozed reminder ${reminderId} until ${new Date(nextTime).toISOString()}`);

  // Refetch to get latest priority and other fields that may have changed
  const updatedReminder = await getReminder(reminderId);
  if (!updatedReminder) {
    console.error(`[Scheduler] Failed to refetch reminder ${reminderId} after snooze update`);
    return;
  }

  await notificationService.scheduleReminderByModel(updatedReminder);

  DeviceEventEmitter.emit('remindersChanged');
}

export async function markReminderDone(reminderId: string, shouldIncrementOccurrence: boolean = true, triggerTimeMs?: number) {
  console.log(`[Scheduler] ========== markReminderDone START ==========`);
  console.log(`[Scheduler] reminderId: ${reminderId}, shouldIncrementOccurrence: ${shouldIncrementOccurrence}, triggerTimeMs: ${triggerTimeMs}`);

  const reminder = await getReminder(reminderId);

  if (!reminder) {
    console.log(`[Scheduler] Reminder ${reminderId} not found for marking done.`);
    return;
  }

  console.log(`[Scheduler] Reminder state: repeatType=${reminder.repeatType}, untilType=${reminder.untilType}, untilCount=${reminder.untilCount}, occurrenceCount=${reminder.occurrenceCount}, nextReminderDate=${reminder.nextReminderDate}`);

  // Only cancel notifications for one-time reminders; for repeating reminders
  // the current notification is cancelled by the action handler/native UI,
  // and we should not cancel the next scheduled occurrence.
  if (reminder.repeatType === 'none') {
    await notificationService.cancelAllNotificationsForReminder(reminderId);
  }

  if (reminder.snoozeUntil && reminder.repeatType === 'none') {
    console.log(`[Scheduler] Snoozed 'once' reminder ${reminderId} marked as done - completing it`);
    reminder.isCompleted = true;
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
    reminder.lastTriggeredAt = new Date().toISOString();
    await updateReminder(reminder);
  } else if (reminder.repeatType && reminder.repeatType !== 'none') {
    console.log(`[Scheduler] Processing 'Done' for repeating reminder ${reminderId}`);
    const occurred = reminder.occurrenceCount ?? 0;
    const calcContext = shouldIncrementOccurrence
      ? { ...reminder, occurrenceCount: occurred + 1 }
      : reminder;

    console.log(`[Scheduler] occurred=${occurred}, calcContext.occurrenceCount=${calcContext.occurrenceCount}`);

    if (!shouldIncrementOccurrence) {
      // Foreground Notifee action "Done": delivery handler already scheduled next occurrence
      const maybeNext = calculateNextReminderDate(calcContext as any, new Date());
      console.log(`[Scheduler] Notifee Done - maybeNext: ${maybeNext?.toISOString() || 'null'}`);

      if (!maybeNext) {
        // Final occurrence reached - create history and mark completed
        console.log(`[Scheduler] Final occurrence - marking as completed`);
        
        const completedOccurrenceTime = triggerTimeMs 
          ? new Date(triggerTimeMs).toISOString()
          : reminder.nextReminderDate || new Date().toISOString();
        
        const historyItem = {
          ...calcContext,
          id: `${reminderId}_${Date.now()}_hist`,
          parentId: reminderId,
          isCompleted: true,
          isActive: false,
          repeatType: 'none',
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: completedOccurrenceTime,
          createdAt: new Date().toISOString(),
          nextReminderDate: undefined,
          notificationId: undefined
        };
        await addReminder(historyItem as any);
        console.log(`[Scheduler] Created final history item ${historyItem.id} at ${completedOccurrenceTime}`);
        
        const completed = {
          ...calcContext,
          isCompleted: true,
          isActive: false,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: new Date().toISOString(),
        };
        await updateReminder(completed as any);
      } else {
        // Create history item for this occurrence
        const scheduledTime = triggerTimeMs 
          ? new Date(triggerTimeMs).toISOString()
          : reminder.nextReminderDate || new Date().toISOString();
        const historyItem = {
          ...calcContext,
          id: `${reminderId}_${Date.now()}_hist`,
          parentId: reminderId,
          isCompleted: true,
          isActive: false,
          repeatType: 'none',
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: scheduledTime,
          createdAt: new Date().toISOString(),
          nextReminderDate: undefined,
          notificationId: undefined
        };
        await addReminder(historyItem as any);
        console.log(`[Scheduler] Created history item ${historyItem.id} for occurrence (Standard/Silent) at ${scheduledTime}`);

        const updated = {
          ...calcContext,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          isActive: true,
          isCompleted: false,
          isPaused: false,
        };
        await updateReminder(updated as any);
      }
    } else {
      // Native alarm "Done" path
      const completedOccurrenceTime = triggerTimeMs 
        ? new Date(triggerTimeMs).toISOString()
        : reminder.nextReminderDate || new Date().toISOString();
      
      console.log(`[Scheduler] Native Done - completedOccurrenceTime: ${completedOccurrenceTime}`);
      
      const nextDate = calculateNextReminderDate(calcContext as any, new Date());
      console.log(`[Scheduler] Native Done - nextDate: ${nextDate?.toISOString() || 'null'}`);

      if (nextDate) {
        console.log(`[Scheduler] Next occurrence for ${reminderId} is ${nextDate.toISOString()}`);

        const historyItem = {
          ...calcContext,
          id: `${reminderId}_${Date.now()}_hist`,
          parentId: reminderId,
          isCompleted: true,
          isActive: false,
          repeatType: 'none',
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: completedOccurrenceTime,
          createdAt: new Date().toISOString(),
          nextReminderDate: undefined,
          notificationId: undefined
        };

        await addReminder(historyItem as any);
        console.log(`[Scheduler] Created history item ${historyItem.id} for occurrence at ${completedOccurrenceTime}`);

        const updated = {
          ...calcContext,
          nextReminderDate: nextDate.toISOString(),
          lastTriggeredAt: new Date().toISOString(),
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          isActive: true,
          isCompleted: false,
          isPaused: false,
          isExpired: false,
        };
        await updateReminder(updated as any);
        // NOTE: For native alarms, native side already scheduled next alarm
        // DO NOT call scheduleReminderByModel here to avoid double scheduling
        console.log(`[Scheduler] Updated reminder state (native side handles rescheduling)`);
      } else {
        console.log(`[Scheduler] No next occurrence found for ${reminderId}, marking as complete.`);
        
        const historyItem = {
          ...calcContext,
          id: `${reminderId}_${Date.now()}_hist`,
          parentId: reminderId,
          isCompleted: true,
          isActive: false,
          repeatType: 'none',
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: completedOccurrenceTime,
          createdAt: new Date().toISOString(),
          nextReminderDate: undefined,
          notificationId: undefined
        };
        await addReminder(historyItem as any);
        console.log(`[Scheduler] Created final history item ${historyItem.id} at ${completedOccurrenceTime}`);
        
        const completed = {
          ...calcContext,
          isCompleted: true,
          isActive: false,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: new Date().toISOString(),
        };
        await updateReminder(completed as any);
      }
    }
  } else {
    console.log(`[Scheduler] Marking one-time reminder ${reminderId} as complete.`);
    reminder.isCompleted = true;
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
    reminder.lastTriggeredAt = new Date().toISOString();
    await updateReminder(reminder);
  }

  console.log(`[Scheduler] ========== markReminderDone END ==========`);
  DeviceEventEmitter.emit('remindersChanged');
}
