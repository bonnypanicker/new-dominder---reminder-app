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

  // FIX: For Repeating Reminders, separate Snooze from Series to prevent overwriting
  if (reminder.repeatType !== 'none') {
    console.log(`[Scheduler] Snoozing REPEATING reminder ${reminderId}. Splitting Snooze vs Series.`);

    const snoozeTime = Date.now() + minutes * 60 * 1000;
    const shadowId = `${reminderId}_snooze`;
    const priority = reminder.priority || 'medium';

    // Cancel notifications for the current trigger (cleaning up UI)
    await notificationService.cancelAllNotificationsForReminder(reminderId);

    // 1. Schedule "Shadow Snooze" via Native Module
    if (AlarmModule?.storeReminderMetadata) {
      try {
        // Store simplified metadata for the snooze instance (non-repeating)
        const snoozeDateObj = new Date(snoozeTime);
        const sDate = snoozeDateObj.toISOString().split('T')[0];
        const sTime = `${snoozeDateObj.getHours().toString().padStart(2, '0')}:${snoozeDateObj.getMinutes().toString().padStart(2, '0')}`;

        await AlarmModule.storeReminderMetadata(
          shadowId,
          'none', // Repeat 'none' for snooze instance
          1, 'minutes', 'forever', 0, '', '', // until
          0, // occurrence
          sDate,
          sTime,
          `Snoozed: ${reminder.title}`,
          priority,
          false, '[]', '[]', '', false // multiselect
        );

        // Schedule the Native Snooze Alarm
        await AlarmModule.scheduleAlarm(shadowId, snoozeTime, `Snoozed: ${reminder.title}`, priority);
        console.log(`[Scheduler] Scheduled native shadow snooze ${shadowId} at ${snoozeDateObj.toISOString()}`);
      } catch (e) {
        console.error(`[Scheduler] Error scheduling native shadow snooze:`, e);
      }
    }

    // 2. Set Snooze State (Pause Series)
    // We update the reminder to show "Snoozed" state but keep the original schedule until the snooze is done.
    
    // Calculate what the "next occurrence after snooze" should be
    const snoozeEndDate = new Date(snoozeTime);
    // Temporarily set lastTriggeredAt to snooze time to calculate next occurrence from there
    const calcContext = { ...reminder, lastTriggeredAt: snoozeEndDate.toISOString() };
    const nextAfterSnooze = calculateNextReminderDate(calcContext as any, snoozeEndDate);

    const updated = {
      ...reminder,
      snoozeUntil: snoozeEndDate.toISOString(),
      wasSnoozed: true,
      // Keep series paused - next occurrence is AFTER snooze ends
      nextReminderDate: nextAfterSnooze ? nextAfterSnooze.toISOString() : undefined,
      // DO NOT update lastTriggeredAt yet - that happens when snooze fires
      isActive: true
    };
    await updateReminder(updated as any);
    await notificationService.cancelAllNotificationsForReminder(reminderId);
    console.log(`[Scheduler] Repeater snoozed. Series PAUSED until ${snoozeEndDate.toISOString()}. Next occurrence: ${nextAfterSnooze?.toISOString()}`);
    
    // Notify UI of change
    DeviceEventEmitter.emit('remindersChanged');

  } else {
    // Original Logic for One-Off Reminders
    const nextTime = Date.now() + minutes * 60 * 1000;

    await notificationService.cancelAllNotificationsForReminder(reminderId);

    reminder.snoozeUntil = new Date(nextTime).toISOString();
    reminder.wasSnoozed = true;
    reminder.lastTriggeredAt = new Date().toISOString();

    await updateReminder(reminder);
    console.log(`[Scheduler] Snoozed one-off reminder ${reminderId} until ${new Date(nextTime).toISOString()}`);

    const updatedReminder = await getReminder(reminderId);
    if (updatedReminder) {
      await notificationService.scheduleReminderByModel(updatedReminder);
    }
  }

  DeviceEventEmitter.emit('remindersChanged');
}

export async function markReminderDone(reminderId: string, shouldIncrementOccurrence: boolean = true, triggerTimeMs?: number) {
  console.log(`[Scheduler] ========== markReminderDone START ==========`);
  console.log(`[Scheduler] reminderId: ${reminderId}, shouldIncrementOccurrence: ${shouldIncrementOccurrence}, triggerTimeMs: ${triggerTimeMs}`);

  // Handle Shadow Snooze IDs (e.g. "123_snooze" -> "123")
  let actualId = reminderId;
  let isShadowSnooze = false;
  if (reminderId.endsWith('_snooze')) {
    actualId = reminderId.replace('_snooze', '');
    isShadowSnooze = true;
    console.log(`[Scheduler] Detected Shadow Snooze ID. Resolved to parent: ${actualId}`);
  }

  let reminder = await getReminder(actualId);

  if (!reminder) {
    console.log(`[Scheduler] Reminder ${actualId} not found for marking done.`);
    return;
  }

  // If this was a shadow snooze completion, force increment because the Native side 
  // incremented the SHADOW count, not the PARENT count.
  // We need to catch up the parent count.
  if (isShadowSnooze) {
     console.log(`[Scheduler] Completing a Shadow Snooze. Forcing occurrence increment.`);
     shouldIncrementOccurrence = true;
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
