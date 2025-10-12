import { DeviceEventEmitter } from 'react-native';
import { notificationService } from '../hooks/notification-service';
import { calculateNextReminderDate } from '../services/reminder-utils';
import { getReminder, updateReminder } from './reminder-service';

export async function rescheduleReminderById(reminderId: string, minutes: number) {
  console.log(`[Scheduler] Snoozing reminder ${reminderId} for ${minutes} minutes`);
  
  const reminder = await getReminder(reminderId);

  if (!reminder) {
    console.log(`[Scheduler] Reminder ${reminderId} not found for snooze.`);
    return;
  }

  const nextTime = Date.now() + minutes * 60 * 1000;
  
  await notificationService.cancelAllNotificationsForReminder(reminderId);
  
  reminder.snoozeUntil = new Date(nextTime).toISOString();
  reminder.wasSnoozed = true;
  reminder.lastTriggeredAt = new Date().toISOString();

  await updateReminder(reminder);
  console.log(`[Scheduler] Snoozed reminder ${reminderId} until ${new Date(nextTime).toISOString()}`);
  
  await notificationService.scheduleReminderByModel(reminder);

  DeviceEventEmitter.emit('remindersChanged');
}

export async function markReminderDone(reminderId: string) {
  console.log(`[Scheduler] Marking reminder ${reminderId} as done`);
  
  const reminder = await getReminder(reminderId);

  if (!reminder) {
    console.log(`[Scheduler] Reminder ${reminderId} not found for marking done.`);
    return;
  }
  
  await notificationService.cancelAllNotificationsForReminder(reminderId);

  if (reminder.snoozeUntil && reminder.repeatType === 'none') {
    console.log(`[Scheduler] Snoozed 'once' reminder ${reminderId} marked as done - completing it`);
    reminder.isCompleted = true;
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
    reminder.lastTriggeredAt = new Date().toISOString();
    await updateReminder(reminder);
  } else if (reminder.repeatType && reminder.repeatType !== 'none') {
    console.log(`[Scheduler] Processing 'Done' for repeating reminder ${reminderId}`);
    const nextDate = calculateNextReminderDate(reminder, new Date());

    if (nextDate) {
      console.log(`[Scheduler] Next occurrence for ${reminderId} is ${nextDate.toISOString()}`);
      reminder.nextReminderDate = nextDate.toISOString();
      reminder.lastTriggeredAt = new Date().toISOString();
      reminder.snoozeUntil = undefined;
      reminder.wasSnoozed = undefined;
      
      await updateReminder(reminder);
      await notificationService.scheduleReminderByModel(reminder);
    } else {
      console.log(`[Scheduler] No next occurrence found for ${reminderId}, marking as complete.`);
      reminder.isCompleted = true;
      reminder.snoozeUntil = undefined;
      reminder.wasSnoozed = undefined;
      await updateReminder(reminder);
    }
  } else {
    console.log(`[Scheduler] Marking one-time reminder ${reminderId} as complete.`);
    reminder.isCompleted = true;
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
    reminder.lastTriggeredAt = new Date().toISOString();
    await updateReminder(reminder);
  }

  console.log(`[Scheduler] Updated state for reminder ${reminderId}`);
  DeviceEventEmitter.emit('remindersChanged');
}