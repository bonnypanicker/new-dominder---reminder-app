import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import { notificationService } from '../hooks/notification-service';
import { calculateNextReminderDate } from '../services/reminder-utils';
import { getReminder, updateReminder, addReminder } from './reminder-service';

const AlarmModule = Platform.OS === 'android' ? (NativeModules as any)?.AlarmModule ?? null : null;

export async function rescheduleReminderById(reminderId: string, minutes: number) {
  console.log(`[Scheduler] Snoozing reminder ${reminderId} for ${minutes} minutes`);

  const reminder = await getReminder(reminderId);
  if (!reminder || reminder.isCompleted) {
    console.log(`[Scheduler] Reminder ${reminderId} not found or completed, skipping snooze.`);
    return;
  }

  const snoozeTime = Date.now() + minutes * 60 * 1000;
  const snoozeEndDate = new Date(snoozeTime);

  // Cancel current notifications
  await notificationService.cancelAllNotificationsForReminder(reminderId);

  // Update reminder with snooze state
  const updated = {
    ...reminder,
    snoozeUntil: snoozeEndDate.toISOString(),
    wasSnoozed: true,
    isActive: true
  };
  await updateReminder(updated);

  // Schedule alarm at snooze time using ORIGINAL ID
  if (AlarmModule?.scheduleAlarm) {
    try {
      // Update snoozeUntil in native metadata
      if (AlarmModule.setSnoozeUntil) {
        await AlarmModule.setSnoozeUntil(reminderId, snoozeTime);
      }
      
      // Schedule the alarm with original ID
      await AlarmModule.scheduleAlarm(
        reminderId, 
        snoozeTime, 
        reminder.title, 
        reminder.priority
      );
      console.log(`[Scheduler] Scheduled snooze for ${reminderId} at ${snoozeEndDate.toISOString()}`);
    } catch (e) {
      console.error(`[Scheduler] Error scheduling snooze:`, e);
    }
  }

  DeviceEventEmitter.emit('remindersChanged');
}

export async function rescheduleReminderByIdAt(reminderId: string, snoozeUntilMs: number) {
  console.log(`[Scheduler] Snoozing reminder ${reminderId} until ${new Date(snoozeUntilMs).toISOString()}`);

  const reminder = await getReminder(reminderId);
  if (!reminder || reminder.isCompleted) {
    console.log(`[Scheduler] Reminder ${reminderId} not found or completed, skipping snooze.`);
    return;
  }

  const snoozeEndDate = new Date(snoozeUntilMs);

  await notificationService.cancelAllNotificationsForReminder(reminderId);

  const updated = {
    ...reminder,
    snoozeUntil: snoozeEndDate.toISOString(),
    wasSnoozed: true,
    isActive: true
  };
  await updateReminder(updated);

  if (AlarmModule?.scheduleAlarm) {
    try {
      if (AlarmModule.setSnoozeUntil) {
        await AlarmModule.setSnoozeUntil(reminderId, snoozeUntilMs);
      }
      
      await AlarmModule.scheduleAlarm(
        reminderId, 
        snoozeUntilMs, 
        reminder.title, 
        reminder.priority
      );
      console.log(`[Scheduler] Scheduled snooze for ${reminderId} at ${snoozeEndDate.toISOString()}`);
    } catch (e) {
      console.error(`[Scheduler] Error scheduling snooze:`, e);
    }
  }

  DeviceEventEmitter.emit('remindersChanged');
}

export async function markReminderDone(reminderId: string, shouldIncrementOccurrence: boolean = true, triggerTimeMs?: number) {
  console.log(`[Scheduler] markReminderDone: ${reminderId}`);

  // Direct use - no shadow ID resolution needed
  const actualId = reminderId;
  
  let reminder = await getReminder(actualId);

  if (!reminder) {
    console.log(`[Scheduler] Reminder ${actualId} not found for marking done.`);
    return;
  }

  // Check if this was a snoozed alarm completing
  const wasSnoozeCompletion = reminder.wasSnoozed === true;
  
  if (wasSnoozeCompletion) {
    console.log(`[Scheduler] Snoozed alarm completing for ${actualId}`);
    // Clear snooze state
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
  }

  // Helpers
  const { getReminders, deleteReminder, permanentlyDeleteReminder } = require('./reminder-service');

  // Logic to find existing history item for this reminder
  const historyId = `${actualId}_hist`;

  const getHistoryItem = async () => {
    const allReminders = await getReminders();
    return allReminders.find((r: any) => r.id === historyId);
  };

  if (reminder.repeatType === 'none') {
    await notificationService.cancelAllNotificationsForReminder(actualId);
  }

  // Determine the completion time for history
  const completedOccurrenceTime = triggerTimeMs
    ? new Date(triggerTimeMs).toISOString()
    : reminder.lastTriggeredAt || new Date().toISOString();

  if (reminder.snoozeUntil && reminder.repeatType === 'none') {
    console.log(`[Scheduler] Snoozed 'once' reminder ${actualId} marked as done - completing it`);
    reminder.isCompleted = true;
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
    // reminder.pendingShadowSnoozeUntil = undefined; // REMOVED
    reminder.lastTriggeredAt = completedOccurrenceTime;
    await updateReminder(reminder);
  } else if (reminder.repeatType && reminder.repeatType !== 'none') {
    console.log(`[Scheduler] Processing 'Done' for repeating reminder ${actualId}`);

    // Get the current occurrence count from JS
    let currentOccurred = reminder.occurrenceCount ?? 0;

    // Fix 6: Always sync from native before processing to ensure accuracy
    // Native is the source of truth for Ringer alarms
    if (AlarmModule?.getNativeReminderState) {
      try {
        const nativeState = await AlarmModule.getNativeReminderState(actualId);
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
    
    // Fix: Prevent double counting for Native Ringer Snooze completions (Android High Priority)
    // For these, Native AlarmReceiver increments actualTriggerCount on fire, and we sync it above.
    // If we increment again here, we get a double count.
    let shouldActuallyIncrement = shouldIncrementOccurrence;
    if (shouldIncrementOccurrence && wasSnoozeCompletion) {
      const isNativeRinger = Platform.OS === 'android' && reminder.priority === 'high';
      // Ensure Native Module is actually present (not web/dev client without native)
      const hasNativeModule = !!AlarmModule;
      
      if (isNativeRinger && hasNativeModule) {
        console.log(`[Scheduler] Native Ringer Snooze completion - skipping JS increment (already synced from Native)`);
        shouldActuallyIncrement = false;
      }
    }

    const newOccurrenceCount = shouldActuallyIncrement ? currentOccurred + 1 : currentOccurred;

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

      let countToSave = newOccurrenceCount;
      if (reminder.multiSelectEnabled && reminder.repeatType === 'every') {
        const compTime = new Date(completedOccurrenceTime);
        const nDate = new Date(nextDate);
        const isSameDay = compTime.getFullYear() === nDate.getFullYear() &&
          compTime.getMonth() === nDate.getMonth() &&
          compTime.getDate() === nDate.getDate();

        if (!isSameDay) {
          console.log(`[Scheduler] Multi-select day switch (${compTime.toISOString()} -> ${nDate.toISOString()}), resetting next occurrence count to 0`);
          countToSave = 0;
        }
      }

      const updated = {
        ...calcContext,
        occurrenceCount: countToSave,
        nextReminderDate: nextDate.toISOString(),
        lastTriggeredAt: completedOccurrenceTime,
        snoozeUntil: undefined,
        wasSnoozed: undefined,
        // pendingShadowSnoozeUntil: undefined, // REMOVED
        isActive: true,
        isCompleted: false,
        isPaused: false,
        isExpired: false,
      };
      await updateReminder(updated as any);

      // Sync occurrence count to native for background scheduling
      if (AlarmModule?.updateOccurrenceCount && countToSave !== undefined) {
        try {
          await AlarmModule.updateOccurrenceCount(actualId, countToSave);
          console.log(`[Scheduler] Synced occurrenceCount ${countToSave} to native for ${actualId}`);
        } catch (e) {
          console.log(`[Scheduler] Failed to sync occurrenceCount to native:`, e);
        }
      }

      await notificationService.scheduleReminderByModel(updated as any);
      console.log(`[Scheduler] Rescheduled ${actualId} for ${nextDate.toISOString()}`);
    } else {
      // Series ended - merge history into main reminder and mark complete
      console.log(`[Scheduler] Series ended for ${actualId}, marking as completed`);

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
        await permanentlyDeleteReminder(finalHistory.id);
      }

      const updated = {
        ...calcContext,
        isCompleted: true,
        isActive: false,
        snoozeUntil: undefined,
        wasSnoozed: undefined,
        // pendingShadowSnoozeUntil: undefined, // REMOVED
        lastTriggeredAt: completedOccurrenceTime,
        nextReminderDate: undefined,
        completionHistory: historyTimes,
        parentId: undefined
      };
      await updateReminder(updated as any);
      await notificationService.cancelAllNotificationsForReminder(actualId);

      // Clear native metadata since reminder is complete
      if (AlarmModule?.clearReminderMetadata) {
        try {
          await AlarmModule.clearReminderMetadata(actualId);
          console.log(`[Scheduler] Cleared native metadata for completed reminder ${actualId}`);
        } catch (e) {
          console.log(`[Scheduler] Failed to clear native metadata:`, e);
        }
      }
    }
  } else {
    console.log(`[Scheduler] Marking one-time reminder ${actualId} as complete.`);
    reminder.isCompleted = true;
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
    reminder.lastTriggeredAt = completedOccurrenceTime;
    await updateReminder(reminder);

    // Clear native metadata for one-time reminders
    if (AlarmModule?.clearReminderMetadata) {
      try {
        await AlarmModule.clearReminderMetadata(actualId);
      } catch (e) {
        console.log(`[Scheduler] Failed to clear native metadata:`, e);
      }
    }
  }

  console.log(`[Scheduler] ========== markReminderDone END ==========`);
  DeviceEventEmitter.emit('remindersChanged');
}
