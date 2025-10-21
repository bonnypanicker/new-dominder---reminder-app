
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Reminder } from '@/types/reminder';
import { notificationService } from '@/hooks/notification-service';

const STORAGE_KEY = 'dominder_reminders';

export async function getReminders(): Promise<Reminder[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading reminders:', error);
    return [];
  }
}

export async function getReminder(id: string): Promise<Reminder | undefined> {
  const reminders = await getReminders();
  return reminders.find(r => r.id === id);
}

export async function addReminder(newReminder: Reminder): Promise<Reminder> {
  console.log(`[ReminderService] Adding reminder ${newReminder.id}: isActive=${newReminder.isActive}, isCompleted=${newReminder.isCompleted}, repeatType=${newReminder.repeatType}`);
  const reminders = await getReminders();
  const updated = [...reminders, newReminder];
  
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newReminder;
}

export async function updateReminder(updatedReminder: Reminder): Promise<void> {
  const reminders = await getReminders();
  const originalReminder = reminders.find(r => r.id === updatedReminder.id);

  // Cancel notifications if:
  // 1. Reminder is marked as completed
  // 2. Reminder is paused
  // 3. This is a reschedule (date/time/repeatType changed)
  const shouldCancelNotifications = originalReminder && (
    updatedReminder.isCompleted ||
    updatedReminder.isPaused ||
    originalReminder.date !== updatedReminder.date ||
    originalReminder.time !== updatedReminder.time ||
    originalReminder.repeatType !== updatedReminder.repeatType
  );

  if (shouldCancelNotifications) {
    console.log(`Cancelling notifications for reminder ${updatedReminder.id} (completed: ${updatedReminder.isCompleted}, paused: ${updatedReminder.isPaused})`);
    await notificationService.cancelAllNotificationsForReminder(updatedReminder.id);
    updatedReminder.notificationId = undefined;
  }
  
  const cleanedReminder = { ...updatedReminder };
  delete cleanedReminder.snoozeClearing;
  delete cleanedReminder.notificationUpdating;
  
  console.log(`[ReminderService] Updating reminder ${updatedReminder.id}: isActive=${updatedReminder.isActive}, isCompleted=${updatedReminder.isCompleted}, repeatType=${updatedReminder.repeatType}`);
  
  const updated = reminders.map(r => r.id === updatedReminder.id ? cleanedReminder : r);
  
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function deleteReminder(id: string): Promise<void> {
  const reminders = await getReminders();
  const reminderToDelete = reminders.find(r => r.id === id);

  // Cancel all notifications for this reminder (both notifee and native alarms)
  if (reminderToDelete) {
    console.log(`Cancelling all notifications for deleted reminder: ${id}`);
    await notificationService.cancelAllNotificationsForReminder(id);
  }
  
  const updated = reminders.filter(r => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
