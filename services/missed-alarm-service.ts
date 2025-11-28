import { DeviceEventEmitter, NativeModules, Platform, NativeEventEmitter } from 'react-native';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';

interface MissedAlarmData {
  reminderId: string;
  title: string;
  time: string;
}

class MissedAlarmService {
  private listeners: Map<string, any> = new Map();

  async initialize() {
    if (Platform.OS !== 'android') {
      return;
    }

    console.log('[MissedAlarmService] Initializing...');

    // Listen for missed alarm broadcasts from native code
    const subscription = DeviceEventEmitter.addListener(
      'onMissedAlarm',
      this.handleMissedAlarm.bind(this)
    );

    this.listeners.set('missedAlarm', subscription);
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
          ongoing: false,
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
