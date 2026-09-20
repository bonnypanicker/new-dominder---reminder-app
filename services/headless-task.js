import { AppRegistry } from 'react-native';
import { notificationService } from '../hooks/notification-service';

const RescheduleAlarms = async () => {
  console.log('[Dominder-Debug] Headless task: RescheduleAlarms started');
  try {
    await notificationService.initialize();

    // Use the robust startup check to handle overdue/missed/future reminders
    const { checkAndTriggerPendingNotifications } = require('./startup-notification-check');
    await checkAndTriggerPendingNotifications({ bootRecoveryMode: true });

    console.log('[Dominder-Debug] Headless task: Completed checkAndTriggerPendingNotifications');
  } catch (error) {
    console.error('[Dominder-Debug] Error in headless task:', error);
  }
};

AppRegistry.registerHeadlessTask('RescheduleAlarms', () => RescheduleAlarms);
