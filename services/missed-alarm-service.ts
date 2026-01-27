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
      const { reminderId } = data;
      
      // CRITICAL FIX: Check if this reminder was snoozed or has pending shadow snooze
      // Don't show "missed" notification for snoozed reminders
      const { getReminder } = require('./reminder-service');
      const reminder = await getReminder(reminderId);
      
      if (reminder) {
        // Check if reminder has active snooze
        if (reminder.snoozeUntil || reminder.wasSnoozed || reminder.pendingShadowSnoozeUntil) {
          console.log('[MissedAlarmService] Skipping missed notification - reminder was snoozed');
          return;
        }
        
        // Check if reminder is already completed
        if (reminder.isCompleted) {
          console.log('[MissedAlarmService] Skipping missed notification - reminder is completed');
          return;
        }
      }
      
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

      // Create notification for missed ringer
      const channelId = 'missed-alarm-v1';
      
      // Ensure channel exists
      await notifee.createChannel({
        id: channelId,
        name: 'Missed Ringer Alarms',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      const body = time 
        ? `${title}\n${time}`
        : title;

      await notifee.displayNotification({
        id: `missed-${reminderId}`,
        title: 'You missed a Ringer reminder',
        body,
        data: {
          reminderId,
          type: 'missed',
        },
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
          smallIcon: 'small_icon_noti',
          color: '#F44336', // Red color for missed
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: body,
          },
          autoCancel: true,
          ongoing: true, // Non-swipable
          actions: [
            { title: 'Delete', pressAction: { id: 'delete_missed' } },
          ],
        },
      });

      console.log('[MissedAlarmService] Displayed missed notification for:', reminderId);
    } catch (error) {
      console.error('[MissedAlarmService] Error displaying notification:', error);
    }
  }
}

export const missedAlarmService = new MissedAlarmService();
