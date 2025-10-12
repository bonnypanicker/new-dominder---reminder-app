import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../hooks/notification-service';
import { calculateNextReminderDate } from '../services/reminder-utils';
import { Reminder } from '@/types/reminder';

const STORAGE_KEY = 'dominder_reminders';

export async function rescheduleReminderById(reminderId: string, minutes: number) {
  console.log(`[Scheduler] Snoozing reminder ${reminderId} for ${minutes} minutes`);
  
  const raw = (await AsyncStorage.getItem(STORAGE_KEY)) || '[]';
  const list: Reminder[] = JSON.parse(raw);
  const i = list.findIndex((r) => r.id === reminderId);

  if (i === -1) {
    console.log(`[Scheduler] Reminder ${reminderId} not found for snooze.`);
    return;
  }

  const reminder = list[i];
  const nextTime = Date.now() + minutes * 60 * 1000;
  
  reminder.snoozeUntil = new Date(nextTime).toISOString();
  reminder.wasSnoozed = true;

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  console.log(`[Scheduler] Snoozed reminder ${reminderId} until ${new Date(nextTime).toISOString()}`);
  
  await notificationService.cancelAllNotificationsForReminder(reminderId);
  await notificationService.scheduleReminderByModel(reminder);
}

export async function markReminderDone(reminderId: string) {
  console.log(`[Scheduler] Marking reminder ${reminderId} as done`);
  
  const raw = (await AsyncStorage.getItem(STORAGE_KEY)) || '[]';
  const list: Reminder[] = JSON.parse(raw);
  const reminderIndex = list.findIndex((r) => r.id === reminderId);

  if (reminderIndex === -1) {
    console.log(`[Scheduler] Reminder ${reminderId} not found for marking done.`);
    return;
  }

  const reminder = list[reminderIndex];
  
  await notificationService.cancelAllNotificationsForReminder(reminderId);

  if (reminder.repeatType && reminder.repeatType !== 'none') {
    console.log(`[Scheduler] Processing 'Done' for repeating reminder ${reminderId}`);
    const nextDate = calculateNextReminderDate(reminder, new Date());

    if (nextDate) {
      console.log(`[Scheduler] Next occurrence for ${reminderId} is ${nextDate.toISOString()}`);
      reminder.nextReminderDate = nextDate.toISOString();
      reminder.lastTriggeredAt = new Date().toISOString();
      reminder.snoozeUntil = undefined;
      reminder.wasSnoozed = undefined;
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      await notificationService.scheduleReminderByModel(reminder);
    } else {
      console.log(`[Scheduler] No next occurrence found for ${reminderId}, marking as complete.`);
      reminder.isCompleted = true;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } else {
    console.log(`[Scheduler] Marking one-time reminder ${reminderId} as complete.`);
    reminder.isCompleted = true;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  console.log(`[Scheduler] Updated state for reminder ${reminderId}`);
}