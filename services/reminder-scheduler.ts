import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import { notificationService } from '../hooks/notification-service';
import { calculateNextReminderDate } from '../services/reminder-utils';
import { getReminder, updateReminder, addReminder } from './reminder-service';

const AlarmModule = Platform.OS === 'android' ? (NativeModules as any)?.AlarmModule ?? null : null;

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

  // Helpers
  const { getReminders, deleteReminder } = require('./reminder-service');

  // Logic to find existing history item for this reminder
  const historyId = `${reminderId}_hist`;

  const getHistoryItem = async () => {
    const allReminders = await getReminders();
    return allReminders.find((r: any) => r.id === historyId);
  };

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

    if (!shouldIncrementOccurrence) {
      const nextTime = reminder.nextReminderDate ? new Date(reminder.nextReminderDate).getTime() : 0;
      const nowTime = Date.now();

      if (!reminder.nextReminderDate || nextTime <= nowTime) {
        console.log(`[Scheduler] Reminder ${reminderId} appears not rescheduled (next=${reminder.nextReminderDate}), forcing occurrence increment.`);
        shouldIncrementOccurrence = true;
      }
    }

    const occurred = reminder.occurrenceCount ?? 0;
    const calcContext = shouldIncrementOccurrence
      ? { ...reminder, occurrenceCount: occurred + 1 }
      : reminder;

    console.log(`[Scheduler] occurred=${occurred}, calcContext.occurrenceCount=${calcContext.occurrenceCount}`);

    const completedOccurrenceTime = triggerTimeMs
      ? new Date(triggerTimeMs).toISOString()
      : reminder.lastTriggeredAt || new Date().toISOString();

    if (!shouldIncrementOccurrence) {
      // Foreground Notifee Done (Standard)
      const hasCountCap = reminder.untilType === 'count' && typeof reminder.untilCount === 'number';
      const hasDateCap = reminder.untilType === 'endsAt' && reminder.untilDate;

      let nextIsValid = true;

      if (!hasCountCap && !hasDateCap) {
        nextIsValid = !!reminder.nextReminderDate;
      } else {
        if (hasCountCap && (reminder.occurrenceCount ?? 0) >= (reminder.untilCount as number)) {
          nextIsValid = false;
        }
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
              nextIsValid = false;
            }
          } catch (e) {
            console.log(`[Scheduler] Error checking date cap:`, e);
          }
        }
        if (nextIsValid && !reminder.nextReminderDate) {
          nextIsValid = false;
        }
      }

      if (!nextIsValid) {
        // FINAL OCCURRENCE - MERGE HISTORY
        console.log(`[Scheduler] Final occurrence - converting active reminder ${reminderId} to completed.`);

        const existingHistory = await getHistoryItem();
        let historyTimes = existingHistory?.completionHistory || [];
        historyTimes.push(completedOccurrenceTime);

        if (existingHistory) {
          await deleteReminder(existingHistory.id);
        }

        const completed = {
          ...calcContext,
          isCompleted: true,
          isActive: false,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: completedOccurrenceTime,
          nextReminderDate: undefined,
          completionHistory: historyTimes,
          parentId: undefined
        };
        await updateReminder(completed as any);
        await notificationService.cancelAllNotificationsForReminder(reminderId);
        
        // Clear native metadata since reminder is complete
        if (AlarmModule?.clearReminderMetadata) {
          try {
            await AlarmModule.clearReminderMetadata(reminderId);
            console.log(`[Scheduler] Cleared native metadata for completed reminder ${reminderId}`);
          } catch (e) {
            console.log(`[Scheduler] Failed to clear native metadata:`, e);
          }
        }

      } else {
        // INTERMEDIATE OCCURRENCE
        console.log(`[Scheduler] Intermediate occurrence for ${reminderId} at ${completedOccurrenceTime}`);

        const existingHistory = await getHistoryItem();

        if (existingHistory) {
          const updatedHistory = {
            ...existingHistory,
            lastTriggeredAt: completedOccurrenceTime,
            completionHistory: [...(existingHistory.completionHistory || []), completedOccurrenceTime],
            title: reminder.title,
            priority: reminder.priority
          };
          await updateReminder(updatedHistory as any);
        } else {
          const historyItem = {
            ...calcContext,
            id: historyId,
            parentId: reminderId,
            isCompleted: true,
            isActive: false,
            snoozeUntil: undefined,
            wasSnoozed: undefined,
            lastTriggeredAt: completedOccurrenceTime,
            completionHistory: [completedOccurrenceTime],
            createdAt: new Date().toISOString(),
            nextReminderDate: undefined,
            notificationId: undefined
          };
          await addReminder(historyItem as any);
        }

        // Ensure Main Reminder stays active
        const updated = {
          ...calcContext,
          nextReminderDate: reminder.nextReminderDate,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          isActive: true,
          isCompleted: false,
          isPaused: false,
        };
        await updateReminder(updated as any);
        await notificationService.scheduleReminderByModel(updated as any);
      }
    } else {
      // Native Done (manual calculation needed)
      const nextDate = calculateNextReminderDate(calcContext as any, new Date());

      if (nextDate) {
        // Intermediate (Native)
        const existingHistory = await getHistoryItem();
        if (existingHistory) {
          const updatedHistory = {
            ...existingHistory,
            lastTriggeredAt: completedOccurrenceTime,
            completionHistory: [...(existingHistory.completionHistory || []), completedOccurrenceTime],
            title: reminder.title,
            priority: reminder.priority
          };
          await updateReminder(updatedHistory as any);
        } else {
          const historyItem = {
            ...calcContext,
            id: historyId,
            parentId: reminderId,
            isCompleted: true,
            isActive: false,
            snoozeUntil: undefined,
            wasSnoozed: undefined,
            lastTriggeredAt: completedOccurrenceTime,
            completionHistory: [completedOccurrenceTime],
            createdAt: new Date().toISOString(),
            nextReminderDate: undefined,
            notificationId: undefined
          };
          await addReminder(historyItem as any);
        }

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
        
        // Sync occurrence count to native for background scheduling
        if (AlarmModule?.updateOccurrenceCount && calcContext.occurrenceCount !== undefined) {
          try {
            await AlarmModule.updateOccurrenceCount(reminderId, calcContext.occurrenceCount);
            console.log(`[Scheduler] Synced occurrenceCount ${calcContext.occurrenceCount} to native for ${reminderId}`);
          } catch (e) {
            console.log(`[Scheduler] Failed to sync occurrenceCount to native:`, e);
          }
        }
        
        await notificationService.scheduleReminderByModel(updated as any);
      } else {
        // Final (Native)
        const existingHistory = await getHistoryItem();
        let historyTimes = existingHistory?.completionHistory || [];
        historyTimes.push(completedOccurrenceTime);

        if (existingHistory) {
          await deleteReminder(existingHistory.id);
        }

        const completed = {
          ...calcContext,
          isCompleted: true,
          isActive: false,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: completedOccurrenceTime,
          completionHistory: historyTimes,
          parentId: undefined
        };
        await updateReminder(completed as any);
        
        // Clear native metadata since reminder is complete
        if (AlarmModule?.clearReminderMetadata) {
          try {
            await AlarmModule.clearReminderMetadata(reminderId);
            console.log(`[Scheduler] Cleared native metadata for completed reminder ${reminderId}`);
          } catch (e) {
            console.log(`[Scheduler] Failed to clear native metadata:`, e);
          }
        }
      }
    }
  } else {
    console.log(`[Scheduler] Marking one-time reminder ${reminderId} as complete.`);
    reminder.isCompleted = true;
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
    reminder.lastTriggeredAt = new Date().toISOString();
    await updateReminder(reminder);
    
    // Clear native metadata for one-time reminders
    if (AlarmModule?.clearReminderMetadata) {
      try {
        await AlarmModule.clearReminderMetadata(reminderId);
      } catch (e) {
        console.log(`[Scheduler] Failed to clear native metadata:`, e);
      }
    }
  }

  console.log(`[Scheduler] ========== markReminderDone END ==========`);
  DeviceEventEmitter.emit('remindersChanged');
}
