import { useEffect, useRef } from 'react';
import { AppState, NativeModules, Platform } from 'react-native';
import { markReminderDone, rescheduleReminderById } from '@/services/reminder-scheduler';
import { deleteReminder, permanentlyDeleteReminder } from '@/services/reminder-service';

const { AlarmModule } = NativeModules;

/**
 * Hook to sync alarm actions (done/snooze/delete) that were performed while
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
          // Still clear from SharedPreferences to prevent buildup
          try {
            await AlarmModule.clearCompletedAlarm(reminderId);
            console.log('[AlarmSync] Cleared already-processed alarm from SharedPreferences:', reminderId);
          } catch (e) {
            console.error('[AlarmSync] Error clearing already-processed alarm:', e);
          }
          continue;
        }

        console.log('[AlarmSync] Processing completed alarm:', reminderId, 'at', timestamp);
        
        try {
          // Native alarm completion -> increment occurrence and schedule next
          await markReminderDone(reminderId, true);
          
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
          // Still clear from SharedPreferences to prevent buildup
          try {
            await AlarmModule.clearSnoozedAlarm(reminderId);
            console.log('[AlarmSync] Cleared already-processed snooze from SharedPreferences:', reminderId);
          } catch (e) {
            console.error('[AlarmSync] Error clearing already-processed snooze:', e);
          }
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
            // Still clear from SharedPreferences to prevent buildup
            try {
              await AlarmModule.clearDeletedAlarm(reminderId);
              console.log('[AlarmSync] Cleared already-processed deletion from SharedPreferences:', reminderId);
            } catch (e) {
              console.error('[AlarmSync] Error clearing already-processed deletion:', e);
            }
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

      // Process dismissed alarms (from missed notification dismiss action - for "once" reminders only)
      if (AlarmModule.getDismissedAlarms) {
        const dismissedAlarms = await AlarmModule.getDismissedAlarms();
        const dismissedEntries = Object.entries(dismissedAlarms || {});
        
        console.log('[AlarmSync] Found dismissed alarms:', dismissedEntries.length);
        
        for (const [reminderId, timestamp] of dismissedEntries) {
          const key = `dismissed_${reminderId}`;
          
          // Avoid processing the same alarm twice
          if (processedRef.current.has(key)) {
            console.log('[AlarmSync] Already processed dismissal for:', reminderId);
            // Still clear from SharedPreferences to prevent buildup
            try {
              await AlarmModule.clearDismissedAlarm(reminderId);
              console.log('[AlarmSync] Cleared already-processed dismissal from SharedPreferences:', reminderId);
            } catch (e) {
              console.error('[AlarmSync] Error clearing already-processed dismissal:', e);
            }
            continue;
          }

          console.log('[AlarmSync] Processing dismissed alarm:', reminderId, 'at', timestamp);
          
          try {
            // Permanently delete the reminder (not soft delete - don't show in deleted page)
            await permanentlyDeleteReminder(reminderId);
            
            // Clear from SharedPreferences
            await AlarmModule.clearDismissedAlarm(reminderId);
            
            // Mark as processed
            processedRef.current.add(key);
            
            console.log('[AlarmSync] ✓ Successfully processed dismissal (permanent delete) for:', reminderId);
          } catch (error) {
            console.error('[AlarmSync] Error processing dismissed alarm:', reminderId, error);
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
