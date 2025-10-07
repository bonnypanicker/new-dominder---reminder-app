
import notifee, { AndroidImportance } from '@notifee/react-native';

const V = 2; // Version for channel IDs

export const CHANNEL_IDS = {
  STANDARD: `standard-v${V}`,
  SILENT: `silent-v${V}`,
  ALARM: `alarm-v${V}`,
};

export async function ensureBaseChannels() {
  await notifee.createChannel({
    id: CHANNEL_IDS.STANDARD,
    name: 'Standard Notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  await notifee.createChannel({
    id: CHANNEL_IDS.SILENT,
    name: 'Silent Notifications',
    importance: AndroidImportance.LOW,
    sound: undefined,
    vibration: false,
  });

  await notifee.createChannel({
    id: CHANNEL_IDS.ALARM,
    name: 'Alarms',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    bypassDnd: true,
  });
}
