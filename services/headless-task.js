import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../hooks/notification-service';

const STORAGE_KEY = 'dominder_reminders';

const RescheduleAlarms = async () => {
  console.log('[Dominder-Debug] Headless task: RescheduleAlarms started (after device reboot)');
  try {
    await notificationService.initialize();

    // Use the robust startup check to handle overdue/missed/future reminders
    // Pass isAfterReboot=true because AlarmManager alarms are cleared after reboot
    const { checkAndTriggerPendingNotifications } = require('./startup-notification-check');
    await checkAndTriggerPendingNotifications(true);

    console.log('[Dominder-Debug] Headless task: Completed checkAndTriggerPendingNotifications');
  } catch (error) {
    console.error('[Dominder-Debug] Error in headless task:', error);
  }
};

AppRegistry.registerHeadlessTask('RescheduleAlarms', () => RescheduleAlarms);
