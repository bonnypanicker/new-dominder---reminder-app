import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../hooks/notification-service';

const STORAGE_KEY = 'dominder_reminders';

const RescheduleAlarms = async () => {
  console.log('[Dominder-Debug] Headless task: RescheduleAlarms started');
  try {
    await notificationService.initialize();
    
    // CRITICAL: Check for pending/overdue notifications FIRST
    // This ensures any missed notifications are triggered immediately
    console.log('[Dominder-Debug] Headless task: Checking for pending notifications...');
    const { checkAndTriggerPendingNotifications } = require('./startup-notification-check');
    await checkAndTriggerPendingNotifications();
    console.log('[Dominder-Debug] Headless task: Pending notifications check completed');
    
  } catch (error) {
    console.error('[Dominder-Debug] Error in headless task:', error);
  }
};

AppRegistry.registerHeadlessTask('RescheduleAlarms', () => RescheduleAlarms);
