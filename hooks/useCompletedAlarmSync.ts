import { useEffect, useRef } from 'react';
import { AppState, NativeModules, Platform } from 'react-native';
import { markReminderDone, rescheduleReminderById } from '@/services/reminder-scheduler';
import { deleteReminder, getReminder, updateReminder } from '@/services/reminder-service';

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
 */
export function useCompletedAlarmSync() {
  const processedRef = useRef(new Set<string>());

  const syncCompletedAlarms = async () => {
    if (Platform.OS !== 'android' || !AlarmModule) {
      return;
    }

    try {
      console.log('[AlarmSync] Checking for completed alarms...');

      // First, sync native state for all reminders to ensure JS has accurate data
      if (AlarmModule.getAllNativeReminderStates) {
        try {
          const nativeStates = await AlarmModule.getAllNativeReminderStates();
          const stateEntries = Object.entries(nativeStates || {});
          
          if (stateEntries.length > 0) {
            console.log('[AlarmSync] Syncing native states for', stateEntries.length, 'reminders');
            
            for (const [reminderId, state] of stateEntries) {
              const nativeState = state as any;
              
              // If native says completed but we haven't processed it yet
              if (nativeState.isCompleted) {
                const key = `native_completed_${reminderId}`;
                if (!processedRef.current.has(key)) {
                  console.log('[AlarmSync] Native state shows reminder completed:', reminderId);
                  
                  // Get the reminder and update its state
                  const reminder = await getReminder(reminderId);
                  if (reminder && !reminder.isCompleted) {
                    console.log('[AlarmSync] Marking reminder as completed from native state:', reminderId);
                    
                    // Use the native completedAt time for accurate history
                    const completedAt = nativeState.completedAt > 0 
                      ? nativeState.completedAt 
                      : Date.now();
                    
                    // Mark done with the native trigger count
                    await markReminderDone(reminderId, true, completedAt);
                    processedRef.current.add(key);
                  }
                }
              }
              
              // Sync actualTriggerCount to JS occurrenceCount if different
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
            }
          }
        } catch (e) {
          console.error('[AlarmSync] Error syncing native states:', e);
        }
      }

      // Process completed alarms (from DoMinderAlarmActions SharedPreferences)
      const completedAlarms = await AlarmModule.getCompletedAlarms();
      const completedEntries = Object.entries(completedAlarms || {});

      console.log('[AlarmSync] Found completed alarms:', completedEntries.length);

      for (const [reminderId, timestamp] of completedEntries) {
        const key = `done_${reminderId}`;

        // Avoid processing the same alarm twice in one session
        if (processedRef.current.has(key)) {
          console.log('[AlarmSync] Already processed completion for:', reminderId);
          continue;
        }

        console.log('[AlarmSync] Processing completed alarm:', reminderId, 'at', timestamp);

        try {
          // Native alarm completion -> increment occurrence and schedule next
          // Pass the actual trigger timestamp to ensure history is accurate
          await markReminderDone(reminderId, true, parseInt(timestamp as string, 10));

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
