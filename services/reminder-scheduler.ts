import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleReminderByModel } from '../hooks/notification-service';
import { calculateNextReminderDate } from '../services/reminder-utils';

// The Reminder type should be consistent with what's stored in AsyncStorage
// and what scheduleReminderByModel expects.
interface Reminder {
  id: string;
  isCompleted?: boolean;
  repeatType?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | 'every';
  time: number;
  // Add other properties that are used by calculateNextReminderDate
  date: string;
  repeatDays?: number[];
  monthlyDay?: number;
  everyInterval?: { value: number; unit: string };
}

const STORAGE_KEY = 'dominder_reminders';

export async function rescheduleReminderById(reminderId: string, minutes: number) {
  const raw = (await AsyncStorage.getItem(STORAGE_KEY)) || '[]';
  const list: Reminder[] = JSON.parse(raw);
  const i = list.findIndex((r) => r.id === reminderId);

  if (i === -1) {
    console.log(`[Scheduler] Reminder ${reminderId} not found for snooze.`);
    return;
  }

  const reminder = list[i];
  const nextTime = Date.now() + minutes * 60 * 1000;
  reminder.time = nextTime;

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  console.log(`[Scheduler] Snoozing reminder ${reminderId} until ${new Date(nextTime).toISOString()}`);
  await scheduleReminderByModel(reminder);
}

export async function markReminderDone(reminderId: string) {
  const raw = (await AsyncStorage.getItem(STORAGE_KEY)) || '[]';
  const list: Reminder[] = JSON.parse(raw);
  const reminderIndex = list.findIndex((r) => r.id === reminderId);

  if (reminderIndex === -1) {
    console.log(`[Scheduler] Reminder ${reminderId} not found for marking done.`);
    return;
  }

  const reminder = list[reminderIndex];

  if (reminder.repeatType && reminder.repeatType !== 'none') {
    // This is a repeating reminder
    console.log(`[Scheduler] Processing 'Done' for repeating reminder ${reminderId}`);
    const nextDate = calculateNextReminderDate(reminder, new Date());

    if (nextDate) {
      console.log(`[Scheduler] Next occurrence for ${reminderId} is ${nextDate.toISOString()}`);
      reminder.time = nextDate.getTime();
      // After updating the time, we reschedule it.
      await scheduleReminderByModel(reminder);
    } else {
      // No next date found, so we can mark it as completed.
      console.log(`[Scheduler] No next occurrence found for ${reminderId}, marking as complete.`);
      reminder.isCompleted = true;
    }
  } else {
    // This is a one-time reminder
    console.log(`[Scheduler] Marking one-time reminder ${reminderId} as complete.`);
    reminder.isCompleted = true;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  console.log(`[Scheduler] Updated state for reminder ${reminderId}`);
}