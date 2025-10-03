import AsyncStorage from '@react-native-async-storage/async-storage';
import { Reminder } from '@/types/reminder';
import { notificationService } from '@/hooks/notification-service';

export async function rescheduleReminderById(reminderId: string, minutes: number) {
  try {
    const stored = await AsyncStorage.getItem('dominder_reminders');
    const list: Reminder[] = stored ? JSON.parse(stored) : [];
    const idx = list.findIndex((r) => r.id === reminderId);

    if (idx !== -1) {
      const reminder = list[idx];
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

      const updatedReminder: Reminder = {
        ...reminder,
        snoozeUntil,
        isExpired: false,
        notificationId: undefined, // Clear old notification ID
      };

      list[idx] = updatedReminder;
      await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));

      // Schedule new notification
      const newNotificationId = await notificationService.scheduleReminderByModel(updatedReminder);
      if (newNotificationId) {
        updatedReminder.notificationId = newNotificationId;
        list[idx] = updatedReminder; // Update with new notification ID
        await AsyncStorage.setItem('dominder_reminders', JSON.stringify(list));
      }
      console.log(`Reminder ${reminderId} snoozed for ${minutes} minutes and rescheduled.`);
    } else {
      console.warn(`Reminder with ID ${reminderId} not found for rescheduling.`);
    }
  } catch (error) {
    console.error(`Failed to reschedule reminder ${reminderId}:`, error);
  }
}