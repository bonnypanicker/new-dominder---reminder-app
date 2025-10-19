import { useEffect, useRef } from 'react';
import { AppState, NativeModules, Platform } from 'react-native';
import { markReminderDone, rescheduleReminderById } from '@/services/reminder-scheduler';

const { AlarmModule } = NativeModules;

/**
 * Hook to sync alarm actions (done/snooze) that were performed while
 * React Native context was unavailable (e.g., phone locked, app killed).
 * 
 * Polls SharedPreferences when app becomes active and processes any
 * pending alarm actions.
 */
export function useCompletedAlarmSync() {
  const processedRef = useRef(new Set<string>());

  const syncCompletedAlarms = async () => {
    if (Platform.OS !== 'android' || !AlarmModule) {
      return;
    }

    try {
      console.log('[AlarmSync] Checking for completed alarms...');
      
      // Process completed alarms
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
          // Mark as complete in the store
          await markReminderDone(reminderId);
          
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
