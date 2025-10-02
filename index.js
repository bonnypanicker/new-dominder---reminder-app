import notifee from '@notifee/react-native';
import { AppRegistry } from 'react-native';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  // Handle notification events
  if (type === 1 && pressAction.id === 'snooze') {
    // Snooze the notification
    await notifee.cancelNotification(notification.id);
  } else if (type === 1 && pressAction.id === 'done') {
    // Mark the reminder as done
    await notifee.cancelNotification(notification.id);
  }
});

function HeadlessCheck({ isHeadless }) {
  if (isHeadless) {
    // App has been launched in the background by iOS, ignore
    return null;
  }

  // Render the app component on foreground launch
  return <App />;
}

AppRegistry.registerComponent('main', () => HeadlessCheck);