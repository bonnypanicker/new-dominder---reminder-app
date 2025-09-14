import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Reminder } from '@/types/reminder';
import { notificationService } from '@/hooks/notification-service';

const STORAGE_KEY = 'dominder_reminders';

export const useReminders = () => {
  return useQuery({
    queryKey: ['reminders'],
    queryFn: async (): Promise<Reminder[]> => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Error loading reminders:', error);
        return [];
      }
    },
  });
};

export const useAddReminder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reminder: Omit<Reminder, 'id' | 'createdAt'>): Promise<Reminder> => {
      const newReminder: Reminder = {
        ...reminder,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const reminders: Reminder[] = current ? JSON.parse(current) : [];
      const updated = [...reminders, newReminder];
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return newReminder;
    },
    onMutate: async (newReminderData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      
      // Snapshot the previous value
      const previousReminders = queryClient.getQueryData<Reminder[]>(['reminders']);
      
      // Optimistically update to the new value
      if (previousReminders) {
        const newReminder: Reminder = {
          ...newReminderData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData<Reminder[]>(['reminders'], [...previousReminders, newReminder]);
      }
      
      // Return a context object with the snapshotted value
      return { previousReminders };
    },
    onError: (err, newReminder, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders'], context.previousReminders);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updatedReminder: Reminder): Promise<void> => {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const reminders: Reminder[] = current ? JSON.parse(current) : [];
      const originalReminder = reminders.find(r => r.id === updatedReminder.id);
      
      // Check if this is a reschedule operation (date, time, or repeat settings changed)
      const isReschedule = originalReminder && (
        originalReminder.date !== updatedReminder.date ||
        originalReminder.time !== updatedReminder.time ||
        originalReminder.repeatType !== updatedReminder.repeatType ||
        JSON.stringify(originalReminder.repeatDays) !== JSON.stringify(updatedReminder.repeatDays) ||
        originalReminder.monthlyDay !== updatedReminder.monthlyDay ||
        JSON.stringify(originalReminder.everyInterval) !== JSON.stringify(updatedReminder.everyInterval)
      );
      
      // If this is a reschedule, cancel all existing notifications for this reminder
      if (isReschedule && originalReminder) {
        console.log(`Detected reschedule for reminder ${updatedReminder.id}, cancelling all notifications`);
        await notificationService.cancelAllNotificationsForReminder(updatedReminder.id);
        // Clear the notificationId since we cancelled all notifications
        updatedReminder.notificationId = undefined;
      }
      
      // Clean up internal flags before saving
      const cleanedReminder = { ...updatedReminder };
      delete cleanedReminder.snoozeClearing;
      delete cleanedReminder.notificationUpdating;
      
      const updated = reminders.map(r => r.id === updatedReminder.id ? cleanedReminder : r);
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    onMutate: async (updatedReminder) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      
      // Snapshot the previous value
      const previousReminders = queryClient.getQueryData<Reminder[]>(['reminders']);
      
      // Optimistically update to the new value
      if (previousReminders) {
        queryClient.setQueryData<Reminder[]>(
          ['reminders'],
          previousReminders.map(r => r.id === updatedReminder.id ? updatedReminder : r)
        );
      }
      
      // Return a context object with the snapshotted value
      return { previousReminders };
    },
    onError: (err, updatedReminder, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders'], context.previousReminders);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const reminders: Reminder[] = current ? JSON.parse(current) : [];
      const reminderToDelete = reminders.find(r => r.id === id);
      
      // Cancel notification if it exists
      if (reminderToDelete?.notificationId) {
        await notificationService.cancelNotification(reminderToDelete.notificationId);
        console.log(`Cancelled notification for deleted reminder: ${id}`);
      }
      
      const updated = reminders.filter(r => r.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      
      // Snapshot the previous value
      const previousReminders = queryClient.getQueryData<Reminder[]>(['reminders']);
      
      // Optimistically update to the new value
      if (previousReminders) {
        queryClient.setQueryData<Reminder[]>(
          ['reminders'],
          previousReminders.filter(r => r.id !== deletedId)
        );
      }
      
      // Return a context object with the snapshotted value
      return { previousReminders };
    },
    onError: (err, deletedId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders'], context.previousReminders);
      }
    },
    onSettled: async () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      // Clean up any orphaned notifications after deletion
      await notificationService.cleanupOrphanedNotifications();
    },
  });
};

export const useBulkDeleteReminders = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const reminders: Reminder[] = current ? JSON.parse(current) : [];
      
      // Cancel notifications for reminders being deleted
      const remindersToDelete = reminders.filter(r => ids.includes(r.id));
      for (const reminder of remindersToDelete) {
        if (reminder.notificationId) {
          await notificationService.cancelNotification(reminder.notificationId);
          console.log(`Cancelled notification for bulk deleted reminder: ${reminder.id}`);
        }
      }
      
      const updated = reminders.filter(r => !ids.includes(r.id));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      // Clean up any orphaned notifications after bulk deletion
      await notificationService.cleanupOrphanedNotifications();
    },
  });
};

export const useBulkUpdateReminders = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: { id: string; updates: Partial<Reminder> }[]): Promise<void> => {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const reminders: Reminder[] = current ? JSON.parse(current) : [];
      
      const updated = reminders.map(reminder => {
        const update = updates.find(u => u.id === reminder.id);
        return update ? { ...reminder, ...update.updates } : reminder;
      });
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};