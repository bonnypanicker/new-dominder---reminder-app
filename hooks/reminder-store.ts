import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Reminder } from '@/types/reminder';
import { 
  getReminders, 
  addReminder as addReminderSvc, 
  updateReminder as updateReminderSvc,
  deleteReminder as deleteReminderSvc
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
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteReminderSvc,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
};