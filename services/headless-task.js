import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../hooks/notification-service';

const STORAGE_KEY = 'dominder_reminders';

const RescheduleAlarms = async () => {
  console.log('Headless task: RescheduleAlarms');
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const reminders = stored ? JSON.parse(stored) : [];
    
    for (const reminder of reminders) {
      // We only need to reschedule reminders that are in the future
      if (reminder.time > Date.now()) {
        await notificationService.scheduleReminderByModel(reminder);
      }
    }
  } catch (error) {
    console.error('Error rescheduling reminders from headless task:', error);
  }
};

AppRegistry.registerHeadlessTask('RescheduleAlarms', () => RescheduleAlarms);
