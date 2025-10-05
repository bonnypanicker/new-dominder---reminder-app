import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleReminderByModel } from '../hooks/notification-service';

export async function rescheduleReminderById(reminderId: string, minutes: number) {
  const raw = (await AsyncStorage.getItem('dominder_reminders')) || '[]';
  const list = JSON.parse(raw);
  const i = list.findIndex((r: any) => r.id === reminderId);
  if (i === -1) return;
  const next = Date.now() + minutes * 60 * 1000;
  list[i].time = next;
  await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
  await scheduleReminderByModel(list[i]);
}