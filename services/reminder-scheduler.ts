import { DeviceEventEmitter } from 'react-native';
import { notificationService } from '../hooks/notification-service';
import { calculateNextReminderDate } from '../services/reminder-utils';
import { getReminder, updateReminder } from './reminder-service';

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

    // Get the completed occurrence time
    const completedOccurrenceTime = triggerTimeMs 
      ? new Date(triggerTimeMs).toISOString()
      : reminder.lastTriggeredAt || new Date().toISOString();
    
    // Add to completedTimes array instead of creating history items
    const existingCompletedTimes = reminder.completedTimes || [];
    const updatedCompletedTimes = [...existingCompletedTimes, completedOccurrenceTime];
    console.log(`[Scheduler] Adding completed time: ${completedOccurrenceTime}, total: ${updatedCompletedTimes.length}`);

    if (!shouldIncrementOccurrence) {
      // Foreground Notifee action "Done": delivery handler already scheduled next occurrence
      // Check if the already-scheduled next occurrence is valid (not past end constraints)
      const hasCountCap = reminder.untilType === 'count' && typeof reminder.untilCount === 'number';
      const hasDateCap = reminder.untilType === 'endsAt' && reminder.untilDate;
      
      console.log(`[Scheduler] Standard Done - hasCountCap: ${hasCountCap}, hasDateCap: ${hasDateCap}, nextReminderDate: ${reminder.nextReminderDate}`);
      
      let nextIsValid = true;
      
      // For reminders without any end constraint, if nextReminderDate exists, it's valid
      if (!hasCountCap && !hasDateCap) {
        nextIsValid = !!reminder.nextReminderDate;
        console.log(`[Scheduler] No end constraints, nextIsValid based on nextReminderDate: ${nextIsValid}`);
      } else {
        // Check count cap: if occurrenceCount >= untilCount, no more occurrences
        if (hasCountCap && (reminder.occurrenceCount ?? 0) >= (reminder.untilCount as number)) {
          console.log(`[Scheduler] Count cap reached: ${reminder.occurrenceCount}/${reminder.untilCount}`);
          nextIsValid = false;
        }
        
        // Check date cap: if nextReminderDate is past the end boundary, no more occurrences
        if (nextIsValid && hasDateCap && reminder.nextReminderDate) {
          try {
            const [uy, um, ud] = (reminder.untilDate as string).split('-').map((v) => parseInt(v || '0', 10));
            const endBoundary = new Date(uy, (um || 1) - 1, ud || 1);
            const isTimeBound = reminder.repeatType === 'every' && (reminder.everyInterval?.unit === 'minutes' || reminder.everyInterval?.unit === 'hours');
            if (isTimeBound && reminder.untilTime) {
              const [eh, em] = reminder.untilTime.split(':').map((v) => parseInt(v || '0', 10));
              endBoundary.setHours(eh, em, 0, 0);
            } else {
              endBoundary.setHours(23, 59, 59, 999);
            }
            const nextDate = new Date(reminder.nextReminderDate);
            if (nextDate > endBoundary) {
              console.log(`[Scheduler] Date cap reached: next ${nextDate.toISOString()} > end ${endBoundary.toISOString()}`);
              nextIsValid = false;
            }
          } catch (e) {
            console.log(`[Scheduler] Error checking date cap:`, e);
          }
        }
        
        // Also check if nextReminderDate exists at all (for capped reminders)
        if (nextIsValid && !reminder.nextReminderDate) {
          console.log(`[Scheduler] No nextReminderDate set (final occurrence)`);
          nextIsValid = false;
        }
      }
      
      console.log(`[Scheduler] Notifee Done - nextIsValid: ${nextIsValid}`);

      if (!nextIsValid) {
        // Final occurrence reached - mark completed with all completed times
        console.log(`[Scheduler] Final occurrence - marking as completed`);
        
        // Cancel any scheduled notifications since this is the final occurrence
        await notificationService.cancelAllNotificationsForReminder(reminderId);
        
        const completed = {
          ...calcContext,
          isCompleted: true,
          isActive: false,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: completedOccurrenceTime,
          nextReminderDate: undefined,
          completedTimes: updatedCompletedTimes,
        };
        await updateReminder(completed as any);
        console.log(`[Scheduler] Marked reminder ${reminderId} as completed with ${updatedCompletedTimes.length} completed times`);
      } else {
        // Update reminder with new completed time, keep active
        const updated = {
          ...calcContext,
          nextReminderDate: reminder.nextReminderDate, // Explicitly preserve - delivery handler already set this
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          isActive: true,
          isCompleted: false,
          isPaused: false,
          completedTimes: updatedCompletedTimes,
        };
        await updateReminder(updated as any);
        console.log(`[Scheduler] Updated reminder ${reminderId} with ${updatedCompletedTimes.length} completed times, nextReminderDate preserved: ${updated.nextReminderDate}`);
      }
    } else {
      // Native alarm "Done" path
      console.log(`[Scheduler] Native Done - completedOccurrenceTime: ${completedOccurrenceTime}`);
      
      const nextDate = calculateNextReminderDate(calcContext as any, new Date());
      console.log(`[Scheduler] Native Done - nextDate: ${nextDate?.toISOString() || 'null'}`);

      if (nextDate) {
        console.log(`[Scheduler] Next occurrence for ${reminderId} is ${nextDate.toISOString()}`);

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
          completedTimes: updatedCompletedTimes,
        };
        await updateReminder(updated as any);
        console.log(`[Scheduler] Updated reminder ${reminderId} with ${updatedCompletedTimes.length} completed times`);
        
        // Schedule next occurrence - JS handles rescheduling for native alarms too
        await notificationService.scheduleReminderByModel(updated as any);
        console.log(`[Scheduler] Scheduled next native alarm for ${reminderId} at ${nextDate.toISOString()}`);
      } else {
        console.log(`[Scheduler] No next occurrence found for ${reminderId}, marking as complete.`);
        
        const completed = {
          ...calcContext,
          isCompleted: true,
          isActive: false,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: completedOccurrenceTime,
          completedTimes: updatedCompletedTimes,
        };
        await updateReminder(completed as any);
        console.log(`[Scheduler] Marked reminder ${reminderId} as completed with ${updatedCompletedTimes.length} completed times`);
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
