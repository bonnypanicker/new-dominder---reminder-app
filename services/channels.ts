import AsyncStorage from '@react-native-async-storage/async-storage';


const V = 4; // bump when defaults change
const K = {
  TONE_URI: 'dominder_ringer_tone_uri',
  RINGER_CH: 'dominder_ringer_channel',
};

function hashUri(uri: string): string {
  let h = 0; for (let i = 0; i < uri.length; i++) h = ((h << 5) - h) + uri.charCodeAt(i) | 0;
  return Math.abs(h).toString(36).slice(0, 6);
}

export async function ensureBaseChannels() {
  const notifee = require('@notifee/react-native');
  const { AndroidImportance, AndroidVisibility } = notifee;

  const tone = (await AsyncStorage.getItem(K.TONE_URI)) || 'default';
  const suffix = tone === 'default' ? 'def' : hashUri(tone);
  const ringerId = `ringer_v${V}_${suffix}`;
  const standardId = `standard_v${V}`;
  const silentId = `silent_v${V}`;

  await notifee.default.createChannel({
    id: ringerId, name: 'High Priority (Ringer)',
    importance: AndroidImportance.HIGH, vibration: true,
    sound: tone, visibility: AndroidVisibility.PUBLIC,
  });
  await notifee.default.createChannel({
    id: standardId, name: 'Standard',
    importance: AndroidImportance.DEFAULT, vibration: true,
    visibility: AndroidVisibility.PUBLIC,
  });
  await notifee.default.createChannel({
    id: silentId, name: 'Silent',
    importance: AndroidImportance.LOW, vibration: false,
    visibility: AndroidVisibility.PUBLIC,
  });

  await AsyncStorage.setItem(K.RINGER_CH, ringerId);
}

export async function currentRingerChannelId(): Promise<string> {
  return (await AsyncStorage.getItem(K.RINGER_CH)) || `ringer_v${V}_def`;
}
export function standardChannelId() { return `standard_v${V}`; }
export function silentChannelId() { return `silent_v${V}`; }

export async function setRingerToneUri(uri: string | null) {
  await AsyncStorage.setItem(K.TONE_URI, uri ?? 'default');
  // recreate with new per‑tone id
  await ensureBaseChannels();
}