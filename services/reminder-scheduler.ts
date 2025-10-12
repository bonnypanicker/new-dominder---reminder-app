import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../hooks/notification-service';

export async function rescheduleReminderById(reminderId: string, minutes: number) {
  console.log(`[Dominder-Debug] Rescheduling reminder ${reminderId} for ${minutes} minutes from now.`);
  const raw = (await AsyncStorage.getItem('dominder_reminders')) || '[]';
  const list = JSON.parse(raw);
  const i = list.findIndex((r: any) => r.id === reminderId);
  if (i === -1) {
    console.log(`[Dominder-Debug] Reminder ${reminderId} not found for rescheduling.`);
    return;
  }
  const next = Date.now() + minutes * 60 * 1000;
  list[i].time = next;
  await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
  console.log(`[Dominder-Debug] Rescheduling reminder ${reminderId} with new time: ${new Date(next).toISOString()}`);
  await notificationService.scheduleReminderByModel(list[i]);
}