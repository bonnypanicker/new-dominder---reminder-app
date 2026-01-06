
import { AppRegistry } from 'react-native';
import { reminderService } from './reminder-service'; // CAREFUL: reminder-service default export? No, named exports.
import * as ReminderService from './reminder-service'; // Import all
import * as SchedulerService from './reminder-scheduler';
import * as ReminderUtils from './reminder-utils';
import { notificationService } from '../hooks/notification-service';

/**
 * Handles 'delivered' action: Auto-reschedule repeating reminders.
 * Mimics logic from index.js (onBackgroundEvent -> DELIVERED).
 */
export async function handleReminderDelivery(reminderId) {
    console.log(`[BackgroundActions] Handling delivery for ${reminderId}`);
    const reminder = await ReminderService.getReminder(reminderId);

    if (!reminder) {
        console.log(`[BackgroundActions] Reminder ${reminderId} not found`);
        return;
    }

    if (reminder.repeatType !== 'none') {
        console.log(`[BackgroundActions] Auto-rescheduling repeating (${reminder.repeatType}) reminder ${reminderId}`);

        const triggeredAt = reminder.nextReminderDate || new Date().toISOString();
        const occurred = reminder.occurrenceCount ?? 0;

        const hasCountCap = reminder.untilType === 'count' && typeof reminder.untilCount === 'number';
        const nextOccurCount = hasCountCap && occurred >= (reminder.untilCount)
            ? occurred
            : occurred + 1;

        const forCalc = { ...reminder, occurrenceCount: nextOccurCount };
        const nextDate = ReminderUtils.calculateNextReminderDate(forCalc, new Date());

        if (nextDate) {
            const updatedReminder = {
                ...forCalc,
                nextReminderDate: nextDate.toISOString(),
                lastTriggeredAt: triggeredAt,
                isActive: true,
                isCompleted: false,
                isPaused: false,
            };

            await ReminderService.updateReminder(updatedReminder);
            await notificationService.scheduleReminderByModel(updatedReminder);
            console.log(`[BackgroundActions] Scheduled next: ${nextDate.toISOString()}`);
        } else {
            // Final occurrence
            const finalOccurrenceState = {
                ...forCalc,
                nextReminderDate: undefined,
                lastTriggeredAt: triggeredAt,
                isActive: true,
                isCompleted: false,
                isPaused: false,
            };
            await ReminderService.updateReminder(finalOccurrenceState);
            console.log(`[BackgroundActions] Final occurrence reached.`);
        }
    }
}

/**
 * Headless Task Entry Point
 */
const BackgroundActionTask = async (taskData) => {
    console.log('[BackgroundActions] Task started with:', taskData);
    const { reminderId, action, triggerTime } = taskData;

    if (!reminderId) return;

    try {
        // Initialize services if needed (notificationService init is defensive)
        await notificationService.initialize();

        if (action === 'delivered') {
            await handleReminderDelivery(reminderId);
        } else if (action === 'done') {
            // action='done' from AlarmActionBridge
            // shouldIncrement is FALSE because 'delivered' (AlarmReceiver) ALREADY ran and incremented it (hopefully).
            // WAIT. If 'delivered' ran, it updated nextReminderDate.
            // markReminderDone(..., false) will mark it as done + history, but NOT increment logic.
            // This matches Notifee behavior.

            // Pass triggerTime if available for accurate history
            const triggerTimeMs = triggerTime ? parseInt(triggerTime, 10) : undefined;
            await SchedulerService.markReminderDone(reminderId, false, triggerTimeMs);
        } else if (action === 'snooze') {
            // action='snooze', snoozeMinutes in extras?
            // taskData should contain extras.
            // We need to pass snoozeMinutes from Native Service to here.
            const snoozeMinutes = taskData.snoozeMinutes ? parseInt(taskData.snoozeMinutes, 10) : 5;
            await SchedulerService.rescheduleReminderById(reminderId, snoozeMinutes);
        } else if (action === 'delete') {
            await ReminderService.deleteReminder(reminderId);
        }

        console.log('[BackgroundActions] Task completed successfully');
    } catch (e) {
        console.error('[BackgroundActions] Error in task:', e);
    }
};

export default BackgroundActionTask;
