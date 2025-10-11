
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import { scheduleReminderByModel } from '../hooks/notification-service';
import { Reminder } from '@/types/reminder'; // Assuming this type definition exists
import { calculateNextReminderDate } from '@/services/reminder-utils'; // Assuming this utility exists

export async function rescheduleReminderById(reminderId: string, minutes: number) {
  const raw = (await AsyncStorage.getItem('dominder_reminders')) || '[]';
  const list: Reminder[] = JSON.parse(raw);
  const i = list.findIndex((r: any) => r.id === reminderId);
  if (i === -1) return;

  const reminder = list[i];
  const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  
  const updatedReminder = {
    ...reminder,
    snoozeUntil,
    lastTriggeredAt: new Date().toISOString(),
    isExpired: false,
    wasSnoozed: true
  };

  list[i] = updatedReminder;
  await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
  await scheduleReminderByModel(updatedReminder);
}

export async function markReminderDone(reminderId: string) {
  const raw = (await AsyncStorage.getItem('dominder_reminders')) || '[]';
  const list: Reminder[] = JSON.parse(raw);
  const i = list.findIndex((r: any) => r.id === reminderId);
  if (i === -1) return;

  const reminder = list[i];
  const now = new Date();
  let updatedReminder: Reminder;

  if (reminder.repeatType === 'none') {
    updatedReminder = { 
      ...reminder, 
      isCompleted: true, 
      snoozeUntil: undefined,
      wasSnoozed: undefined,
      lastTriggeredAt: now.toISOString()
    };
  } else {
    const nextDate = calculateNextReminderDate(reminder, now);
    updatedReminder = { 
      ...reminder, 
      lastTriggeredAt: now.toISOString(),
      nextReminderDate: nextDate ? nextDate.toISOString() : undefined,
      snoozeUntil: undefined,
      wasSnoozed: undefined
    };
  }

  list[i] = updatedReminder;
  await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
  
  // Cancel any existing notifications for this reminder
  await notifee.cancelNotification(`rem-${reminderId}`);
}

export async function handleDismissAction(reminderId: string) {
  const raw = (await AsyncStorage.getItem('dominder_reminders')) || '[]';
  const list: Reminder[] = JSON.parse(raw);
  const reminder = list.find((r: Reminder) => r.id === reminderId);

  if (reminder && reminder.repeatType === 'none' && reminder.priority === 'low') {
    console.log(`[Dominder-Debug] Marking "Once" low priority reminder as expired due to dismissed notification: ${reminderId}`);
    const updatedReminder = { 
      ...reminder, 
      isExpired: true,
      lastTriggeredAt: new Date().toISOString()
    };
    const i = list.findIndex((r: any) => r.id === reminderId);
    if (i !== -1) {
      list[i] = updatedReminder;
      await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
    }
  }
}
