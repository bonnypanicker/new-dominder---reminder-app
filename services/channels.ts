import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const RINGER_CHANNEL_ID_KEY = 'ringer_channel_id';
const RINGER_TONE_URI_KEY = 'ringer_tone_uri';
const CHANNEL_VERSION = 5; // Increment this to force channel recreation

function hashUri(uri: string): string {
  let hash = 0;
  for (let i = 0; i < uri.length; i++) {
    const char = uri.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return (hash >>> 0).toString(36).slice(-6);
}

export async function ensureBaseChannels() {
  if (Platform.OS !== 'android') return;

  const storedRingerToneUri = await AsyncStorage.getItem(RINGER_TONE_URI_KEY);
  const ringerUriSuffix = storedRingerToneUri ? hashUri(storedRingerToneUri) : 'def';
  const ringerChannelId = `ringer_v${CHANNEL_VERSION}_${ringerUriSuffix}`;

  await notifee.createChannel({
    id: ringerChannelId,
    name: 'Ringer Reminders',
    importance: AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: [300, 500],
    visibility: AndroidVisibility.PUBLIC,
    sound: storedRingerToneUri || 'default',
    lights: true,
    lightColor: '#FFFFFFFF',
    bypassDnd: true,
  });
  console.log(`Created/validated channel ${ringerChannelId}`);

  await notifee.createChannel({
    id: standardChannelId(),
    name: 'Standard Reminders',
    importance: AndroidImportance.DEFAULT,
    vibration: true,
    vibrationPattern: [200, 200],
    visibility: AndroidVisibility.PUBLIC,
    sound: 'default',
    lights: true,
    lightColor: '#FFFFFFFF',
  });
  console.log(`Created/validated channel ${standardChannelId()}`);

  await notifee.createChannel({
    id: silentChannelId(),
    name: 'Silent Reminders',
    importance: AndroidImportance.LOW,
    vibration: false,
    visibility: AndroidVisibility.PUBLIC,
    lights: false,
  });
  console.log(`Created/validated channel ${silentChannelId()}`);

  await AsyncStorage.setItem(RINGER_CHANNEL_ID_KEY, ringerChannelId);
}

export async function currentRingerChannelId(): Promise<string> {
  const id = await AsyncStorage.getItem(RINGER_CHANNEL_ID_KEY);
  if (id) return id;

  const storedRingerToneUri = await AsyncStorage.getItem(RINGER_TONE_URI_KEY);
  const ringerUriSuffix = storedRingerToneUri ? hashUri(storedRingerToneUri) : 'def';
  return `ringer_v${CHANNEL_VERSION}_${ringerUriSuffix}`;
}

export function standardChannelId(): string {
  return `standard_v${CHANNEL_VERSION}`;
}

export function silentChannelId(): string {
  return `silent_v${CHANNEL_VERSION}`;
}

export async function setRingerToneUri(uri: string | null) {
  if (Platform.OS !== 'android') return;
  await AsyncStorage.setItem(RINGER_TONE_URI_KEY, uri || '');
  await ensureBaseChannels(); // Recreate channels with new sound
}