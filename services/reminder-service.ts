
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import { Reminder } from '@/types/reminder';
import { notificationService } from '@/hooks/notification-service';

const STORAGE_KEY = 'dominder_reminders';

// Get AlarmModule for native pause state sync
const AlarmModule = Platform.OS === 'android' ? NativeModules.AlarmModule : null;

// Mutex to prevent concurrent AsyncStorage writes
let updateQueue = Promise.resolve();

/**
 * Serializes AsyncStorage write operations to prevent race conditions.
 * All writes are queued and executed sequentially.
 */
function serializeAsyncStorageWrite<T>(fn: () => Promise<T>): Promise<T> {
  const result = updateQueue.then(fn).catch((err) => {
    console.error('[ReminderService] Serialized operation failed:', err);
    throw err;
  });
  // Update the queue to wait for this operation to complete
  updateQueue = result.then(() => undefined, () => undefined);
  return result;
}

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
  return serializeAsyncStorageWrite(async () => {
    console.log(`[ReminderService] Adding reminder ${newReminder.id}: isActive=${newReminder.isActive}, isCompleted=${newReminder.isCompleted}, repeatType=${newReminder.repeatType}`);
    const reminders = await getReminders();

    // Check for duplicates to prevent race conditions creating multiple cards
    const existingIndex = reminders.findIndex(r => r.id === newReminder.id);
    let updated;

    if (existingIndex >= 0) {
      console.warn(`[ReminderService] addReminder called for existing ID ${newReminder.id} - updating instead to prevent duplication`);
      updated = [...reminders];
      updated[existingIndex] = newReminder;
    } else {
      updated = [...reminders, newReminder];
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    DeviceEventEmitter.emit('remindersChanged');
    return newReminder;
  });
}

export async function updateReminder(updatedReminder: Reminder): Promise<void> {
  return serializeAsyncStorageWrite(async () => {
    const reminders = await getReminders();
    const originalReminder = reminders.find(r => r.id === updatedReminder.id);

    // Sync pause state to native SharedPreferences for AlarmReceiver to check
    // This ensures native alarms respect pause state even if they fire before JS cancels them
    if (AlarmModule?.setReminderPaused) {
      const pauseStateChanged = originalReminder?.isPaused !== updatedReminder.isPaused;
      if (pauseStateChanged || updatedReminder.isPaused) {
        try {
          await AlarmModule.setReminderPaused(updatedReminder.id, !!updatedReminder.isPaused);
          console.log(`[ReminderService] Synced pause state to native: ${updatedReminder.id} isPaused=${updatedReminder.isPaused}`);
        } catch (e) {
          console.warn('[ReminderService] Failed to sync pause state to native:', e);
        }
      }
    }

    // Cancel notifications if:
    // 1. Reminder is marked as completed
    // 2. Reminder is paused
    // 3. This is a reschedule (date/time/repeatType/priority changed)
    const shouldCancelNotifications = originalReminder && (
      updatedReminder.isCompleted ||
      updatedReminder.isPaused ||
      originalReminder.date !== updatedReminder.date ||
      originalReminder.time !== updatedReminder.time ||
      originalReminder.repeatType !== updatedReminder.repeatType ||
      originalReminder.priority !== updatedReminder.priority
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
    DeviceEventEmitter.emit('remindersChanged');
  });
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  return serializeAsyncStorageWrite(async () => {
    console.log(`[ReminderService] Saving all ${reminders.length} reminders`);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    DeviceEventEmitter.emit('remindersChanged');
  });
}

export async function deleteReminder(id: string): Promise<void> {
  // Soft delete - mark as deleted instead of removing
  return serializeAsyncStorageWrite(async () => {
    const reminders = await getReminders();
    const reminderToDelete = reminders.find(r => r.id === id);

    if (reminderToDelete) {
      console.log(`Soft deleting reminder: ${id}`);
      // Cancel all notifications when soft deleting
      await notificationService.cancelAllNotificationsForReminder(id);

      // Mark as deleted
      const updated = reminders.map(r =>
        r.id === id
          ? { ...r, isDeleted: true, isActive: false }
          : r
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      DeviceEventEmitter.emit('remindersChanged');
    }
  });
}

export async function permanentlyDeleteReminder(id: string): Promise<void> {
  // Permanently remove from storage
  return serializeAsyncStorageWrite(async () => {
    const reminders = await getReminders();
    const reminderToDelete = reminders.find(r => r.id === id);

    if (reminderToDelete) {
      console.log(`Permanently deleting reminder: ${id}`);
      // Cancel all notifications for permanent deletion
      await notificationService.cancelAllNotificationsForReminder(id);
    }

    const updated = reminders.filter(r => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    DeviceEventEmitter.emit('remindersChanged');
  });
}

export async function restoreReminder(id: string): Promise<void> {
  // Restore a deleted reminder
  return serializeAsyncStorageWrite(async () => {
    const reminders = await getReminders();
    const reminderToRestore = reminders.find(r => r.id === id);

    if (reminderToRestore && reminderToRestore.isDeleted) {
      console.log(`Restoring reminder: ${id}`);

      // Restore the reminder
      const updated = reminders.map(r =>
        r.id === id
          ? { ...r, isDeleted: false, isActive: !r.isCompleted }
          : r
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Reschedule if it was active
      if (!reminderToRestore.isCompleted) {
        await notificationService.scheduleReminderByModel({
          ...reminderToRestore,
          isDeleted: false,
          isActive: true
        });
      }
      DeviceEventEmitter.emit('remindersChanged');
    }
  });
}
