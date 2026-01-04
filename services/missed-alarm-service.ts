import { DeviceEventEmitter, NativeModules, Platform, NativeEventEmitter } from 'react-native';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { deleteReminder } from './reminder-service';

interface MissedAlarmData {
  reminderId: string;
  title: string;
  time: string;
}

interface MissedAlarmDeletedData {
  reminderId: string;
}

class MissedAlarmService {
  private listeners: Map<string, any> = new Map();

  async initialize() {
    if (Platform.OS !== 'android') {
      return;
    }

    console.log('[MissedAlarmService] Initializing...');

    // Listen for missed alarm broadcasts from native code
    const missedSubscription = DeviceEventEmitter.addListener(
      'onMissedAlarm',
      this.handleMissedAlarm.bind(this)
    );
    this.listeners.set('missedAlarm', missedSubscription);

    // Listen for delete action from native missed notification
    const deleteSubscription = DeviceEventEmitter.addListener(
      'onMissedAlarmDeleted',
      this.handleMissedAlarmDeleted.bind(this)
    );
    this.listeners.set('missedAlarmDeleted', deleteSubscription);

    console.log('[MissedAlarmService] Initialized successfully');
  }

  cleanup() {
    this.listeners.forEach(listener => {
      listener?.remove();
    });
    this.listeners.clear();
    console.log('[MissedAlarmService] Cleaned up listeners');
  }

  private async handleMissedAlarm(data: MissedAlarmData) {
    console.log('[MissedAlarmService] Received missed alarm:', data);
    
    try {
      await this.showMissedNotification(data);
    } catch (error) {
      console.error('[MissedAlarmService] Error showing missed notification:', error);
    }
  }

  private async handleMissedAlarmDeleted(data: MissedAlarmDeletedData) {
    console.log('[MissedAlarmService] Received missed alarm delete:', data);
    
    try {
      const { reminderId } = data;
      
      // Cancel any notifee notification for this reminder
      try {
        await notifee.cancelNotification(`missed-${reminderId}`);
      } catch (e) {
        // Ignore if not found
      }
      
      // Move reminder to deleted
      await deleteReminder(reminderId);
      console.log('[MissedAlarmService] Reminder moved to deleted:', reminderId);
    } catch (error) {
      console.error('[MissedAlarmService] Error handling delete:', error);
    }
  }

  private async showMissedNotification(data: MissedAlarmData) {
    const { reminderId, title, time } = data;
    
    try {
      // Cancel the original full-screen intent notification first
      try {
        await notifee.cancelNotification(`rem-${reminderId}`);
        console.log('[MissedAlarmService] Cancelled original notification for:', reminderId);
      } catch (cancelError) {
        console.log('[MissedAlarmService] No original notification to cancel');
      }

      // NOTE: The native code (AlarmActivity.postMissedNotification) already posts
      // a missed notification. We only need to handle the JS side here if the native
      // notification wasn't posted (e.g., if called from JS directly).
      // Check if native notification already exists before posting a duplicate.
      
      // For now, skip posting from JS since native handles it
      // This prevents duplicate notifications
      console.log('[MissedAlarmService] Native code handles missed notification, skipping JS notification');
      
      // Just emit the event for any listeners
      DeviceEventEmitter.emit('remindersChanged');

    } catch (error) {
      console.error('[MissedAlarmService] Error in showMissedNotification:', error);
    }
  }
}

export const missedAlarmService = new MissedAlarmService();
