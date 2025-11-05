
import notifee, { AndroidImportance } from '@notifee/react-native';

const V = 2; // Version for channel IDs

export const CHANNEL_IDS = {
  STANDARD: `standard-v${V}`,
  SILENT: `silent-v${V}`,
  ALARM: `alarm-v${V}`,
};

export async function ensureBaseChannels() {
  console.log('[Dominder-Debug] Ensuring base notification channels');

  const standardChannel = {
    id: CHANNEL_IDS.STANDARD,
    name: 'Standard Notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  };
  console.log('[Dominder-Debug] Creating channel:', JSON.stringify(standardChannel));
  await notifee.createChannel(standardChannel);

  const silentChannel = {
    id: CHANNEL_IDS.SILENT,
    name: 'Silent Notifications',
    importance: AndroidImportance.LOW,
    sound: undefined,
    vibration: false,
  };
  console.log('[Dominder-Debug] Creating channel:', JSON.stringify(silentChannel));
  await notifee.createChannel(silentChannel);

  const alarmChannel = {
    id: CHANNEL_IDS.ALARM,
    name: 'Alarms',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    bypassDnd: true,
  };
  console.log('[Dominder-Debug] Creating channel:', JSON.stringify(alarmChannel));
  await notifee.createChannel(alarmChannel);

  console.log('[Dominder-Debug] Base channels ensured');
}
