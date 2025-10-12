import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../hooks/notification-service';

const STORAGE_KEY = 'dominder_reminders';

export const runRescheduleAlarms = async () => {
  console.log('[Dominder-Debug] Headless task: RescheduleAlarms started');
  try {
    await notificationService.initialize();
    
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const reminders = stored ? JSON.parse(stored) : [];
    console.log(`[Dominder-Debug] Headless task: Found ${reminders.length} reminders to reschedule`);
    
    let rescheduledCount = 0;
    for (const reminder of reminders) {
      if (reminder.isActive && !reminder.isCompleted && !reminder.isExpired && !reminder.isPaused) {
        console.log(`[Dominder-Debug] Headless task: Rescheduling reminder ${reminder.id}`);
        await notificationService.scheduleReminderByModel(reminder);
        rescheduledCount++;
      }
    }
    console.log(`[Dominder-Debug] Headless task: Rescheduled ${rescheduledCount} reminders`);
  } catch (error) {
    console.error('[Dominder-Debug] Error rescheduling reminders from headless task:', error);
  }
};

AppRegistry.registerHeadlessTask('RescheduleAlarms', () => runRescheduleAlarms);
