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

  let reminder = await getReminder(reminderId);

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

  // Determine the completion time for history
  const completedOccurrenceTime = triggerTimeMs
    ? new Date(triggerTimeMs).toISOString()
    : reminder.lastTriggeredAt || new Date().toISOString();

  if (reminder.snoozeUntil && reminder.repeatType === 'none') {
    console.log(`[Scheduler] Snoozed 'once' reminder ${reminderId} marked as done - completing it`);
    reminder.isCompleted = true;
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
    reminder.lastTriggeredAt = completedOccurrenceTime;
    await updateReminder(reminder);
  } else if (reminder.repeatType && reminder.repeatType !== 'none') {
    console.log(`[Scheduler] Processing 'Done' for repeating reminder ${reminderId}`);

    // Get the current occurrence count from JS
    let currentOccurred = reminder.occurrenceCount ?? 0;
    
    // If not incrementing (native already did), sync from native to ensure accuracy
    if (!shouldIncrementOccurrence && AlarmModule?.getNativeReminderState) {
      try {
        const nativeState = await AlarmModule.getNativeReminderState(reminderId);
        if (nativeState && nativeState.actualTriggerCount > currentOccurred) {
          console.log(`[Scheduler] Syncing occurrenceCount from native: ${currentOccurred} -> ${nativeState.actualTriggerCount}`);
          currentOccurred = nativeState.actualTriggerCount;
          // Update reminder with synced count
          reminder = { ...reminder, occurrenceCount: currentOccurred };
        }
      } catch (e) {
        console.log(`[Scheduler] Could not sync from native:`, e);
      }
    }
    
    // For native completions (shouldIncrementOccurrence=false), we DON'T increment here
    // because native already did it. For JS completions, we DO increment.
    const newOccurrenceCount = shouldIncrementOccurrence ? currentOccurred + 1 : currentOccurred;
    
    console.log(`[Scheduler] currentOccurred=${currentOccurred}, shouldIncrement=${shouldIncrementOccurrence}, newOccurrenceCount=${newOccurrenceCount}`);

    // Create context for calculating next date with the new occurrence count
    const calcContext = { ...reminder, occurrenceCount: newOccurrenceCount };

    // Calculate next occurrence
    const nextDate = calculateNextReminderDate(calcContext as any, new Date());
    
    console.log(`[Scheduler] Next occurrence calculated: ${nextDate ? nextDate.toISOString() : 'null (series ended)'}`);

    // Record this completion in history
    const existingHistory = await getHistoryItem();
    
    // Check if this trigger time is already in history (avoid duplicates)
    const alreadyInHistory = existingHistory?.completionHistory?.includes(completedOccurrenceTime);
    
    if (!alreadyInHistory) {
      if (existingHistory) {
        const updatedHistory = {
          ...existingHistory,
          lastTriggeredAt: completedOccurrenceTime,
          completionHistory: [...(existingHistory.completionHistory || []), completedOccurrenceTime],
          title: reminder.title,
          priority: reminder.priority
        };
        await updateReminder(updatedHistory as any);
        console.log(`[Scheduler] Updated history with trigger at ${completedOccurrenceTime}`);
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
        console.log(`[Scheduler] Created history item with trigger at ${completedOccurrenceTime}`);
      }
    } else {
      console.log(`[Scheduler] Trigger at ${completedOccurrenceTime} already in history, skipping duplicate`);
    }

    if (nextDate) {
      // More occurrences to come - update and reschedule
      const updated = {
        ...calcContext,
        nextReminderDate: nextDate.toISOString(),
        lastTriggeredAt: completedOccurrenceTime,
        snoozeUntil: undefined,
        wasSnoozed: undefined,
        isActive: true,
        isCompleted: false,
        isPaused: false,
        isExpired: false,
      };
      await updateReminder(updated as any);
      
      // Sync occurrence count to native for background scheduling
      if (AlarmModule?.updateOccurrenceCount && newOccurrenceCount !== undefined) {
        try {
          await AlarmModule.updateOccurrenceCount(reminderId, newOccurrenceCount);
          console.log(`[Scheduler] Synced occurrenceCount ${newOccurrenceCount} to native for ${reminderId}`);
        } catch (e) {
          console.log(`[Scheduler] Failed to sync occurrenceCount to native:`, e);
        }
      }
      
      await notificationService.scheduleReminderByModel(updated as any);
      console.log(`[Scheduler] Rescheduled ${reminderId} for ${nextDate.toISOString()}`);
    } else {
      // Series ended - merge history into main reminder and mark complete
      console.log(`[Scheduler] Series ended for ${reminderId}, marking as completed`);
      
      const finalHistory = await getHistoryItem();
      let historyTimes = finalHistory?.completionHistory || [];
      
      // Add current completion if not already there
      if (!historyTimes.includes(completedOccurrenceTime)) {
        historyTimes.push(completedOccurrenceTime);
      }
      
      // Sort history times
      historyTimes = historyTimes.sort();

      // Delete the separate history item if it exists
      if (finalHistory) {
        await deleteReminder(finalHistory.id);
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
    }
  } else {
    console.log(`[Scheduler] Marking one-time reminder ${reminderId} as complete.`);
    reminder.isCompleted = true;
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
    reminder.lastTriggeredAt = completedOccurrenceTime;
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
