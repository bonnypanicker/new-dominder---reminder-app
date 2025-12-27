import { DeviceEventEmitter } from 'react-native';
import { notificationService } from '../hooks/notification-service';
import { calculateNextReminderDate } from '../services/reminder-utils';
import { getReminder, updateReminder, addReminder } from './reminder-service';

export async function rescheduleReminderById(reminderId: string, minutes: number) {
  console.log(`[Scheduler] Snoozing reminder ${reminderId} for ${minutes} minutes`);

  const reminder = await getReminder(reminderId);

  if (!reminder) {
    console.log(`[Scheduler] Reminder ${reminderId} not found for snooze.`);
    return;
  }

  if (reminder.isCompleted) {
    console.log(`[Scheduler] Reminder ${reminderId} is already completed, skipping snooze.`);
    return;
  }

  const nextTime = Date.now() + minutes * 60 * 1000;

  await notificationService.cancelAllNotificationsForReminder(reminderId);

  reminder.snoozeUntil = new Date(nextTime).toISOString();
  reminder.wasSnoozed = true;
  reminder.lastTriggeredAt = new Date().toISOString();

  await updateReminder(reminder);
  console.log(`[Scheduler] Snoozed reminder ${reminderId} until ${new Date(nextTime).toISOString()}`);

  // Refetch to get latest priority and other fields that may have changed
  const updatedReminder = await getReminder(reminderId);
  if (!updatedReminder) {
    console.error(`[Scheduler] Failed to refetch reminder ${reminderId} after snooze update`);
    return;
  }

  await notificationService.scheduleReminderByModel(updatedReminder);

  DeviceEventEmitter.emit('remindersChanged');
}

export async function markReminderDone(reminderId: string, shouldIncrementOccurrence: boolean = true) {
  console.log(`[Scheduler] Marking reminder ${reminderId} as done`);

  const reminder = await getReminder(reminderId);

  if (!reminder) {
    console.log(`[Scheduler] Reminder ${reminderId} not found for marking done.`);
    return;
  }

  // Only cancel notifications for one-time reminders; for repeating reminders
  // the current notification is cancelled by the action handler/native UI,
  // and we should not cancel the next scheduled occurrence.
  if (reminder.repeatType === 'none') {
    await notificationService.cancelAllNotificationsForReminder(reminderId);
  }

  if (reminder.snoozeUntil && reminder.repeatType === 'none') {
    console.log(`[Scheduler] Snoozed 'once' reminder ${reminderId} marked as done - completing it`);
    reminder.isCompleted = true;
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
    reminder.lastTriggeredAt = new Date().toISOString();
    await updateReminder(reminder);
  } else if (reminder.repeatType && reminder.repeatType !== 'none') {
    console.log(`[Scheduler] Processing 'Done' for repeating reminder ${reminderId}`);
    // For repeating reminders, we have two caller contexts:
    // - Native alarm "Done" (shouldIncrementOccurrence=true): increment occurrence
    //   and calculate/schedule the next occurrence.
    // - Notifee action "Done" (shouldIncrementOccurrence=false): delivery handler
    //   already rescheduled; just clear snooze state and keep active.
    const occurred = reminder.occurrenceCount ?? 0;
    const calcContext = shouldIncrementOccurrence
      ? { ...reminder, occurrenceCount: occurred + 1 }
      : reminder;

    if (!shouldIncrementOccurrence) {
      // Foreground Notifee action "Done": delivery handler already scheduled next occurrence
      // when applicable. Determine if this was the final occurrence; if so, mark completed.
      const maybeNext = calculateNextReminderDate(calcContext as any, new Date());

      if (!maybeNext) {
        // Final occurrence reached (due to Until constraints). Mark as completed now.
        const completed = {
          ...calcContext,
          isCompleted: true,
          isActive: false,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: new Date().toISOString(),
        };
        await updateReminder(completed as any);
      } else {
        // Not final: just clear snooze state and keep active. Do not reschedule here.
        const updated = {
          ...calcContext,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          isActive: true,
          isCompleted: false,
          isPaused: false,
        };
        await updateReminder(updated as any);
      }
    } else {
      const nextDate = calculateNextReminderDate(calcContext as any, new Date());

      if (nextDate) {
        console.log(`[Scheduler] Next occurrence for ${reminderId} is ${nextDate.toISOString()}`);

        // Create a history item for this completed occurrence
        // This ensures the user sees it in their "Completed" list
        const historyItem = {
          ...calcContext,
          id: `${reminderId}_${Date.now()}_hist`,
          isCompleted: true,
          isActive: false,
          repeatType: 'none', // Completed items shouldn't repeat
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          // Clear future scheduling fields on the history item
          nextReminderDate: undefined,
          notificationId: undefined
        };

        // Save the history item asynchronously
        await addReminder(historyItem as any);
        console.log(`[Scheduler] Created history item ${historyItem.id} for occurrence`);

        const updated = {
          ...calcContext,
          nextReminderDate: nextDate.toISOString(),
          lastTriggeredAt: new Date().toISOString(),
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          isActive: true,
          isCompleted: false,
          isPaused: false,
          isExpired: false,
        };
        await updateReminder(updated as any);
        await notificationService.scheduleReminderByModel(updated as any);
      } else {
        console.log(`[Scheduler] No next occurrence found for ${reminderId}, marking as complete.`);
        const completed = {
          ...calcContext,
          isCompleted: true,
          isActive: false,
          snoozeUntil: undefined,
          wasSnoozed: undefined,
          lastTriggeredAt: new Date().toISOString(),
        };
        await updateReminder(completed as any);
      }
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
