import { DeviceEventEmitter, NativeModules, Platform, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const SETTINGS_STORAGE_KEY = 'dominder_settings';

function to24HourTime(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3].toUpperCase();
  if (Number.isNaN(hour)) return null;
  let hour24 = hour % 12;
  if (period === 'PM') {
    hour24 += 12;
  }
  return `${hour24.toString().padStart(2, '0')}:${minute}`;
}

async function getUse24HourFormat(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.use24HourFormat === true;
    }
  } catch (e) {
    console.log('[MissedAlarmService] Error reading settings:', e);
  }
  return false;
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

      // Create notification for missed ringer
      const channelId = 'missed-alarm-v1';
      
      // Ensure channel exists
      await notifee.createChannel({
        id: channelId,
        name: 'Missed Ringer Alarms',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      const use24HourFormat = await getUse24HourFormat();
      const formattedTime = use24HourFormat ? to24HourTime(time) : time;
      const body = formattedTime 
        ? `${title}\n${formattedTime}`
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
