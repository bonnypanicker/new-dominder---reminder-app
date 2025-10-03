import notifee, { AndroidImportance, AndroidCategory } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const RINGER_CHANNEL_ID_KEY = 'ringer_channel_id';
const RINGER_TONE_URI_KEY = 'ringer_tone_uri';
const CHANNEL_VERSION = 4; // Increment this to force channel recreation

export async function ensureBaseChannels() {
  if (Platform.OS !== 'android') return;

  const ringerChannelId = `ringer_v${CHANNEL_VERSION}`;
  const standardChannelId = `standard_v${CHANNEL_VERSION}`;
  const silentChannelId = `silent_v${CHANNEL_VERSION}`;

  const storedRingerToneUri = await AsyncStorage.getItem(RINGER_TONE_URI_KEY);

  await notifee.createChannel({
    id: ringerChannelId,
    name: 'Ringer Reminders',
    importance: AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: [300, 500],
    visibility: AndroidCategory.ALARM,
    sound: storedRingerToneUri || 'default',
    lights: true,
    lightColor: '#FFFFFFFF',
    bypassDnd: true,
  });
  console.log(`Created/validated channel ${ringerChannelId}`);

  await notifee.createChannel({
    id: standardChannelId,
    name: 'Standard Reminders',
    importance: AndroidImportance.DEFAULT,
    vibration: true,
    vibrationPattern: [200, 200],
    visibility: AndroidCategory.REMINDER,
    sound: 'default',
    lights: true,
    lightColor: '#FFFFFFFF',
  });
  console.log(`Created/validated channel ${standardChannelId}`);

  await notifee.createChannel({
    id: silentChannelId,
    name: 'Silent Reminders',
    importance: AndroidImportance.LOW,
    vibration: false,
    visibility: AndroidCategory.REMINDER,
    lights: false,
  });
  console.log(`Created/validated channel ${silentChannelId}`);

  await AsyncStorage.setItem(RINGER_CHANNEL_ID_KEY, ringerChannelId);
}

export async function currentRingerChannelId(): Promise<string> {
  const id = await AsyncStorage.getItem(RINGER_CHANNEL_ID_KEY);
  return id || `ringer_v${CHANNEL_VERSION}`;
}

export async function setRingerToneUri(uri: string | null) {
  if (Platform.OS !== 'android') return;
  await AsyncStorage.setItem(RINGER_TONE_URI_KEY, uri || '');
  await ensureBaseChannels(); // Recreate channels with new sound
}