import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Reminder } from '@/types/reminder';
import { 
  getReminders, 
  addReminder as addReminderSvc, 
  updateReminder as updateReminderSvc,
  deleteReminder as deleteReminderSvc,
  permanentlyDeleteReminder as permanentlyDeleteReminderSvc,
  restoreReminder as restoreReminderSvc
} from '@/services/reminder-service';

export const useReminders = () => {
  return useQuery({
    queryKey: ['reminders'],
    queryFn: getReminders,
  });
};

export const useAddReminder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addReminderSvc,
    onMutate: async (newReminder) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const previousReminders = queryClient.getQueryData<Reminder[]>(['reminders']);
      if (previousReminders) {
        queryClient.setQueryData<Reminder[]>(['reminders'], [...previousReminders, newReminder]);
      }
      return { previousReminders };
    },
    onError: (err, newReminder, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders'], context.previousReminders);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateReminderSvc,
    onSuccess: () => {
      // Single invalidation with debounce, no optimistic update
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
      }, 50);
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteReminderSvc,
    onSuccess: () => {
      // Add debounce to prevent jitter
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
      }, 50);
    },
  });
};

export const useBulkDeleteReminders = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reminderIds: string[]) => {
      await Promise.all(reminderIds.map(id => deleteReminderSvc(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};

export const useBulkUpdateReminders = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: { id: string; updates: Partial<Reminder> }[]) => {
      const reminders = queryClient.getQueryData<Reminder[]>(['reminders']) || [];
      await Promise.all(
        updates.map(({ id, updates: partialUpdates }) => {
          const reminder = reminders.find(r => r.id === id);
          if (reminder) {
            return updateReminderSvc({ ...reminder, ...partialUpdates });
          }
          return Promise.resolve();
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};

export const usePermanentlyDeleteReminder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: permanentlyDeleteReminderSvc,
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
      }, 50);
    },
  });
};

export const useRestoreReminder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: restoreReminderSvc,
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
      }, 50);
    },
  });
};