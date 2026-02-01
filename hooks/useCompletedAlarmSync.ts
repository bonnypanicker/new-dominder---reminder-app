import { useEffect, useRef } from 'react';
import { AppState, NativeModules, Platform, DeviceEventEmitter } from 'react-native';
import { markReminderDone, rescheduleReminderById } from '@/services/reminder-scheduler';
import { deleteReminder, getReminder, updateReminder, addReminder, getReminders } from '@/services/reminder-service';

const { AlarmModule } = NativeModules;

/**
 * Hook to sync alarm actions (done/snooze/delete) that were performed while
 * React Native context was unavailable (e.g., phone locked, app killed).
 * 
 * Polls SharedPreferences when app becomes active and processes any
 * pending alarm actions.
 * 
 * IMPORTANT: Native state (actualTriggerCount, isCompleted) is the SINGLE SOURCE OF TRUTH
 * for occurrence tracking when app is killed.
 * 
 * KEY FIX: We now process ONLY from getCompletedAlarms (DoMinderAlarmActions) which contains
 * individual trigger timestamps. The getAllNativeReminderStates is used ONLY for syncing
 * occurrence counts, NOT for triggering markReminderDone (which would cause double processing).
 */
export function useCompletedAlarmSync() {
  const processedRef = useRef(new Set<string>());
  const syncInProgressRef = useRef(false);

  const syncCompletedAlarms = async () => {
    if (Platform.OS !== 'android' || !AlarmModule) {
      return;
    }

    // Prevent concurrent sync operations
    if (syncInProgressRef.current) {
      console.log('[AlarmSync] Sync already in progress, skipping');
      return;
    }
    syncInProgressRef.current = true;

    try {
      console.log('[AlarmSync] Checking for completed alarms...');

      // STEP 1: Sync occurrence counts from native state (but DON'T trigger markReminderDone here)
      // This ensures JS has accurate counts before processing completions
      if (AlarmModule.getAllNativeReminderStates) {
        try {
          const nativeStates = await AlarmModule.getAllNativeReminderStates();
          const stateEntries = Object.entries(nativeStates || {});

          if (stateEntries.length > 0) {
            console.log('[AlarmSync] Syncing native states for', stateEntries.length, 'reminders');

            for (const [reminderId, state] of stateEntries) {
              const nativeState = state as any;

              // ONLY sync occurrence count here - completion is handled via getCompletedAlarms
              // This prevents double-processing when both native state and completed alarms exist
              if (nativeState.actualTriggerCount > 0) {
                const reminder = await getReminder(reminderId);
                if (reminder && (reminder.occurrenceCount || 0) < nativeState.actualTriggerCount) {
                  console.log('[AlarmSync] Syncing occurrenceCount from native:', reminderId,
                    'JS:', reminder.occurrenceCount, '-> Native:', nativeState.actualTriggerCount);

                  await updateReminder({
                    ...reminder,
                    occurrenceCount: nativeState.actualTriggerCount
                  });
                }
              }

              // Also sync trigger history to JS history if available
              if (nativeState.triggerHistory) {
                await syncTriggerHistoryToJS(reminderId, nativeState);
              }
            }
          }
        } catch (e) {
          console.error('[AlarmSync] Error syncing native states:', e);
        }
      }

      // STEP 2: Process completed alarms (from DoMinderAlarmActions SharedPreferences)
      // This is the ONLY place we call markReminderDone for native completions
      const completedAlarms = await AlarmModule.getCompletedAlarms();
      const completedEntries = Object.entries(completedAlarms || {});

      console.log('[AlarmSync] Found completed alarms:', completedEntries.length);

      for (const [reminderId, timestamp] of completedEntries) {
        // Use timestamp in key to allow processing multiple completions for same reminder
        const triggerTimeMs = parseInt(timestamp as string, 10);
        const key = `done_${reminderId}_${triggerTimeMs}`;

        // Avoid processing the same alarm trigger twice in one session
        if (processedRef.current.has(key)) {
          console.log('[AlarmSync] Already processed completion for:', reminderId, 'at', triggerTimeMs);
          continue;
        }

        console.log('[AlarmSync] Processing completed alarm:', reminderId, 'at', timestamp);

        try {
          // Get current reminder state
          const reminder = await getReminder(reminderId);
          if (!reminder) {
            console.log('[AlarmSync] Reminder not found:', reminderId);
            await AlarmModule.clearCompletedAlarm(reminderId);
            processedRef.current.add(key);
            continue;
          }

          // Native alarm completion -> increment occurrence and schedule next
          // Pass the actual trigger timestamp to ensure history is accurate
          // shouldIncrementOccurrence=false because native already incremented actualTriggerCount
          await markReminderDone(reminderId, false, triggerTimeMs);

          // Clear from SharedPreferences
          await AlarmModule.clearCompletedAlarm(reminderId);

          // Mark as processed
          processedRef.current.add(key);

          console.log('[AlarmSync] ✓ Successfully processed completion for:', reminderId);
        } catch (error) {
          console.error('[AlarmSync] Error processing completed alarm:', reminderId, error);
        }
      }

      // Process snoozed alarms
      const snoozedAlarms = await AlarmModule.getSnoozedAlarms();
      const snoozedEntries = Object.entries(snoozedAlarms || {});

      console.log('[AlarmSync] Found snoozed alarms:', snoozedEntries.length);

      for (const [reminderId, data] of snoozedEntries) {
        const key = `snooze_${reminderId}`;

        // Avoid processing the same alarm twice
        if (processedRef.current.has(key)) {
          console.log('[AlarmSync] Already processed snooze for:', reminderId);
          continue;
        }

        try {
          // Parse timestamp:minutes format
          const [timestamp, minutesStr] = (data as string).split(':');
          const minutes = parseInt(minutesStr, 10);

          if (isNaN(minutes)) {
            console.error('[AlarmSync] Invalid snooze minutes for:', reminderId);
            await AlarmModule.clearSnoozedAlarm(reminderId);
            continue;
          }

          console.log('[AlarmSync] Processing snoozed alarm:', reminderId, 'for', minutes, 'minutes');

          // Snooze in the store
          
          // Fix 5: Check if native is currently processing this snooze to avoid race condition
          const isBeingProcessedNatively = await AlarmModule.checkProcessingFlag?.(reminderId);
          if (isBeingProcessedNatively) {
             console.log('[AlarmSync] Snooze being processed by native, skipping JS processing');
             continue;
          }

          await rescheduleReminderById(reminderId, minutes);

          // Clear from SharedPreferences
          await AlarmModule.clearSnoozedAlarm(reminderId);

          // Mark as processed
          processedRef.current.add(key);

          console.log('[AlarmSync] ✓ Successfully processed snooze for:', reminderId);
        } catch (error) {
          console.error('[AlarmSync] Error processing snoozed alarm:', reminderId, error);
        }
      }

      // Process deleted alarms (from missed notification delete action)
      if (AlarmModule.getDeletedAlarms) {
        const deletedAlarms = await AlarmModule.getDeletedAlarms();
        const deletedEntries = Object.entries(deletedAlarms || {});

        console.log('[AlarmSync] Found deleted alarms:', deletedEntries.length);

        for (const [reminderId, timestamp] of deletedEntries) {
          const key = `deleted_${reminderId}`;

          // Avoid processing the same alarm twice
          if (processedRef.current.has(key)) {
            console.log('[AlarmSync] Already processed deletion for:', reminderId);
            continue;
          }

          console.log('[AlarmSync] Processing deleted alarm:', reminderId, 'at', timestamp);

          try {
            // Move reminder to deleted
            await deleteReminder(reminderId);

            // Clear from SharedPreferences
            await AlarmModule.clearDeletedAlarm(reminderId);

            // Mark as processed
            processedRef.current.add(key);

            console.log('[AlarmSync] ✓ Successfully processed deletion for:', reminderId);
          } catch (error) {
            console.error('[AlarmSync] Error processing deleted alarm:', reminderId, error);
          }
        }
      }

    } catch (error) {
      console.error('[AlarmSync] Error syncing alarms:', error);
    } finally {
      syncInProgressRef.current = false;
    }
  };

  /**
   * Sync trigger history from native to JS history item.
   * This ensures all trigger times are recorded even when app was killed.
   */
  const syncTriggerHistoryToJS = async (reminderId: string, nativeState: any) => {
    try {
      if (!nativeState.triggerHistory) return;

      const triggerTimes = nativeState.triggerHistory.split(',')
        .map((t: string) => parseInt(t, 10))
        .filter((t: number) => !isNaN(t) && t > 0);

      if (triggerTimes.length === 0) return;

      const historyId = `${reminderId}_hist`;
      const allReminders = await getReminders();
      const existingHistory = allReminders.find((r: any) => r.id === historyId);
      const mainReminder = await getReminder(reminderId);

      if (!mainReminder) return;

      // Convert trigger times to ISO strings
      const nativeTriggerISOs = triggerTimes.map((t: number) => new Date(t).toISOString());

      if (existingHistory) {
        // Merge native triggers with existing history (avoid duplicates)
        const existingTimes = new Set(existingHistory.completionHistory || []);
        const newTimes = nativeTriggerISOs.filter((t: string) => !existingTimes.has(t));

        if (newTimes.length > 0) {
          const mergedHistory = [...(existingHistory.completionHistory || []), ...newTimes].sort();
          await updateReminder({
            ...existingHistory,
            completionHistory: mergedHistory,
            lastTriggeredAt: mergedHistory[mergedHistory.length - 1]
          } as any);
          console.log('[AlarmSync] Merged', newTimes.length, 'native triggers to history for', reminderId);
        }
      } else if (nativeTriggerISOs.length > 0 && !mainReminder.isCompleted && mainReminder.repeatType !== 'none') {
        // Create history item with native triggers
        const historyItem = {
          ...mainReminder,
          id: historyId,
          parentId: reminderId,
          isCompleted: true,
          isActive: false,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: nativeTriggerISOs[nativeTriggerISOs.length - 1],
          completionHistory: nativeTriggerISOs,
          createdAt: new Date().toISOString(),
          nextReminderDate: undefined,
          notificationId: undefined
        };
        await addReminder(historyItem as any);
        console.log('[AlarmSync] Created history item with', nativeTriggerISOs.length, 'native triggers for', reminderId);
      }
    } catch (e) {
      console.error('[AlarmSync] Error syncing trigger history:', e);
    }
  };

  useEffect(() => {
    console.log('[AlarmSync] Hook initialized');

    // Sync immediately when hook mounts
    syncCompletedAlarms();

    // Sync when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[AlarmSync] App became active, syncing...');
        syncCompletedAlarms();
      }
    });

    // Periodic sync every 30 seconds while app is active (as safety net)
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncCompletedAlarms();
      }
    }, 30000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  return null;
}
