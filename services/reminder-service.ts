
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
  const reminders = await getReminders();
  const updated = [...reminders, newReminder];
  
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newReminder;
}

export async function updateReminder(updatedReminder: Reminder): Promise<void> {
  const reminders = await getReminders();
  const originalReminder = reminders.find(r => r.id === updatedReminder.id);

  // If this is a reschedule, cancel all existing notifications for this reminder
  if (originalReminder && (
    originalReminder.date !== updatedReminder.date ||
    originalReminder.time !== updatedReminder.time ||
    originalReminder.repeatType !== updatedReminder.repeatType
  )) {
    console.log(`Detected reschedule for reminder ${updatedReminder.id}, cancelling all notifications`);
    await notificationService.cancelAllNotificationsForReminder(updatedReminder.id);
    updatedReminder.notificationId = undefined;
  }
  
  const cleanedReminder = { ...updatedReminder };
  delete cleanedReminder.snoozeClearing;
  delete cleanedReminder.notificationUpdating;
  
  const updated = reminders.map(r => r.id === updatedReminder.id ? cleanedReminder : r);
  
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function deleteReminder(id: string): Promise<void> {
  const reminders = await getReminders();
  const reminderToDelete = reminders.find(r => r.id === id);

  if (reminderToDelete?.notificationId) {
    await notificationService.cancelNotification(reminderToDelete.notificationId);
    console.log(`Cancelled notification for deleted reminder: ${id}`);
  }
  
  const updated = reminders.filter(r => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
