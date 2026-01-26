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

    // 2. Advance the Series immediately
    const now = new Date();
    // Update 'lastTriggeredAt' to now so calculation moves forward
    const calcContext = { ...reminder, lastTriggeredAt: now.toISOString() };
    const nextDate = calculateNextReminderDate(calcContext as any, now);

    if (nextDate) {
      const updated = {
        ...reminder,
        nextReminderDate: nextDate.toISOString(),
        lastTriggeredAt: now.toISOString(),
        snoozeUntil: undefined, // Clear existing snooze if any
        wasSnoozed: undefined,
        isActive: true
      };
      await updateReminder(updated as any);
      await notificationService.scheduleReminderByModel(updated as any);
      console.log(`[Scheduler] Repeater snoozed. Series advanced to ${nextDate.toISOString()}`);
    } else {
      // Series ended
      console.log(`[Scheduler] Repeater snoozed. Series ended.`);
      const updated = {
        ...reminder,
        lastTriggeredAt: now.toISOString(),
        isActive: false
      };
      await updateReminder(updated as any);
    }

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

  // CRITICAL FIX: Check if this is a shadow snooze completion
  const isShadowSnooze = reminderId.endsWith('_snooze');
  const originalReminderId = isShadowSnooze ? reminderId.replace('_snooze', '') : reminderId;

  console.log(`[Scheduler] isShadowSnooze: ${isShadowSnooze}, originalReminderId: ${originalReminderId}`);

  let reminder = await getReminder(isShadowSnooze ? originalReminderId : reminderId);

  if (!reminder) {
    console.log(`[Scheduler] Reminder ${isShadowSnooze ? originalReminderId : reminderId} not found for marking done.`);
    return;
  }

  // If this is a shadow snooze completion, add it to the original reminder's history
  if (isShadowSnooze) {
    console.log(`[Scheduler] Processing shadow snooze completion for ${originalReminderId}`);
    
    const completedOccurrenceTime = triggerTimeMs
      ? new Date(triggerTimeMs).toISOString()
      : new Date().toISOString();

    // Add to history if reminder is already completed
    if (reminder.isCompleted) {
      console.log(`[Scheduler] Original reminder ${originalReminderId} is already completed, adding shadow snooze to history`);
      
      const existingHistory = reminder.completionHistory || [];
      if (!existingHistory.includes(completedOccurrenceTime)) {
        const updatedReminder = {
          ...reminder,
          completionHistory: [...existingHistory, completedOccurrenceTime].sort(),
          lastTriggeredAt: completedOccurrenceTime
        };
        await updateReminder(updatedReminder as any);
        console.log(`[Scheduler] Added shadow snooze completion to history at ${completedOccurrenceTime}`);
      }
    } else {
      // Original reminder is still active (waiting for shadow snooze) - now complete it
      console.log(`[Scheduler] Original reminder ${originalReminderId} was waiting for shadow snooze, now completing it`);
      
      const { getReminders, permanentlyDeleteReminder } = require('./reminder-service');
      const historyId = `${originalReminderId}_hist`;
      const allReminders = await getReminders();
      const existingHistory = allReminders.find((r: any) => r.id === historyId);

      let historyTimes = existingHistory?.completionHistory || [];
      
      // Add shadow snooze completion
      if (!historyTimes.includes(completedOccurrenceTime)) {
        historyTimes.push(completedOccurrenceTime);
      }
      
      // Sort history times
      historyTimes = historyTimes.sort();

      // Delete the separate history item if it exists
      if (existingHistory) {
        await permanentlyDeleteReminder(existingHistory.id);
      }

      // Now mark the original reminder as complete with full history
      const completed = {
        ...reminder,
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
      await notificationService.cancelAllNotificationsForReminder(originalReminderId);

      console.log(`[Scheduler] Marked ${originalReminderId} as completed after shadow snooze with ${historyTimes.length} total completions`);

      // Clear native metadata for original reminder
      if (AlarmModule?.clearReminderMetadata) {
        try {
          await AlarmModule.clearReminderMetadata(originalReminderId);
          console.log(`[Scheduler] Cleared native metadata for completed reminder ${originalReminderId}`);
        } catch (e) {
          console.log(`[Scheduler] Failed to clear original reminder metadata:`, e);
        }
      }
    }

    // Clear shadow snooze metadata from native
    if (AlarmModule?.clearReminderMetadata) {
      try {
        await AlarmModule.clearReminderMetadata(reminderId); // Clear with shadow ID
        console.log(`[Scheduler] Cleared native metadata for shadow snooze ${reminderId}`);
      } catch (e) {
        console.log(`[Scheduler] Failed to clear shadow snooze metadata:`, e);
      }
    }

    // Cancel any notifications for the shadow snooze
    await notificationService.cancelAllNotificationsForReminder(reminderId);

    console.log(`[Scheduler] ========== markReminderDone END (shadow snooze) ==========`);
    DeviceEventEmitter.emit('remindersChanged');
    return;
  }

  // Helpers
  const { getReminders, deleteReminder, permanentlyDeleteReminder } = require('./reminder-service');

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
        isActive: true,
        isCompleted: false,
        isPaused: false,
        isExpired: false,
      };
      await updateReminder(updated as any);

      // Sync occurrence count to native for background scheduling
      if (AlarmModule?.updateOccurrenceCount && countToSave !== undefined) {
        try {
          await AlarmModule.updateOccurrenceCount(reminderId, countToSave);
          console.log(`[Scheduler] Synced occurrenceCount ${countToSave} to native for ${reminderId}`);
        } catch (e) {
          console.log(`[Scheduler] Failed to sync occurrenceCount to native:`, e);
        }
      }

      await notificationService.scheduleReminderByModel(updated as any);
      console.log(`[Scheduler] Rescheduled ${reminderId} for ${nextDate.toISOString()}`);
    } else {
      // Series ended - BUT check if there's a pending shadow snooze
      console.log(`[Scheduler] Series ended for ${reminderId}, checking for pending shadow snooze...`);

      // Check if shadow snooze exists in native metadata
      let hasPendingShadowSnooze = false;
      if (AlarmModule?.getNativeReminderState) {
        try {
          const shadowId = `${reminderId}_snooze`;
          const shadowState = await AlarmModule.getNativeReminderState(shadowId);
          if (shadowState && !shadowState.isCompleted) {
            hasPendingShadowSnooze = true;
            console.log(`[Scheduler] Found pending shadow snooze ${shadowId}, NOT marking original as complete yet`);
          }
        } catch (e) {
          // Shadow snooze doesn't exist or error checking - proceed with completion
          console.log(`[Scheduler] No pending shadow snooze found or error checking:`, e);
        }
      }

      if (hasPendingShadowSnooze) {
        // Don't mark as complete yet - keep it active but with no next date
        console.log(`[Scheduler] Keeping ${reminderId} active until shadow snooze completes`);
        
        const updated = {
          ...calcContext,
          occurrenceCount: newOccurrenceCount,
          nextReminderDate: undefined, // No more regular occurrences
          lastTriggeredAt: completedOccurrenceTime,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          isActive: true, // Keep active
          isCompleted: false, // NOT complete yet
          isPaused: false,
          isExpired: false,
        };
        await updateReminder(updated as any);
        await notificationService.cancelAllNotificationsForReminder(reminderId);
        
        console.log(`[Scheduler] Updated ${reminderId} to wait for shadow snooze completion`);
      } else {
        // No pending shadow snooze - mark as complete normally
        console.log(`[Scheduler] No pending shadow snooze, marking ${reminderId} as completed`);

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
