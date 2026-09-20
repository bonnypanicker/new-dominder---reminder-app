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

const optimisticMutationKey = ['reminders', 'optimistic'] as const;
type ReminderQueryClient = ReturnType<typeof useQueryClient>;
type RowChange = { before: Reminder; after?: Reminder; index: number };
const pendingWrites = new WeakMap<ReminderQueryClient, number>();

async function optimisticallyChangeRows(
  queryClient: ReminderQueryClient,
  ids: Set<string>,
  transform: (reminder: Reminder) => Reminder | undefined
): Promise<RowChange[]> {
  pendingWrites.set(queryClient, (pendingWrites.get(queryClient) ?? 0) + 1);
  await queryClient.cancelQueries({ queryKey: ['reminders'] });
  const previous = queryClient.getQueryData<Reminder[]>(['reminders']);
  if (!previous) return [];

  const changes: RowChange[] = [];
  const next = previous.flatMap((row, index) => {
    if (!ids.has(row.id)) return [row];
    const after = transform(row);
    changes.push({ before: row, after, index });
    return after ? [after] : [];
  });
  if (!changes.length) return changes;

  const cached = queryClient.setQueryData<Reminder[]>(['reminders'], next);
  // React Query structurally shares rows; retain the actual cached references
  // so rollback does not overwrite a newer optimistic edit to the same row.
  return changes.map(change => ({
    ...change,
    after: cached?.find(row => row.id === change.before.id),
  }));
}

function rollbackRows(queryClient: ReminderQueryClient, changes?: RowChange[]) {
  if (!changes?.length) return;
  queryClient.setQueryData<Reminder[]>(['reminders'], current => {
    if (!current) return current;
    const next = [...current];
    for (const { before, after, index } of changes) {
      const currentIndex = next.findIndex(row => row.id === before.id);
      if (after) {
        if (currentIndex !== -1 && next[currentIndex] === after) {
          next[currentIndex] = before;
        }
      } else if (currentIndex === -1) {
        // Restore only the removed row, preserving other edits and list order.
        next.splice(Math.min(index, next.length), 0, before);
      }
    }
    return next;
  });
}

function reconcileWhenLastSettles(queryClient: ReminderQueryClient) {
  // Concurrent onSettled callbacks can both still be counted as pending by
  // React Query, so count writes explicitly before deciding who reconciles.
  const remaining = (pendingWrites.get(queryClient) ?? 1) - 1;
  if (remaining > 0) {
    pendingWrites.set(queryClient, remaining);
    return;
  }
  pendingWrites.delete(queryClient);
  return queryClient.invalidateQueries({ queryKey: ['reminders'] });
}

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
    mutationKey: optimisticMutationKey,
    mutationFn: updateReminderSvc,
    onMutate: (updatedReminder: Reminder) =>
      optimisticallyChangeRows(queryClient, new Set([updatedReminder.id]), () => {
        // The service replaces (not merges) existing rows and strips these
        // transient flags. Copy because the service may mutate notificationId.
        const cleaned = { ...updatedReminder };
        delete cleaned.snoozeClearing;
        delete cleaned.notificationUpdating;
        return cleaned;
      }),
    onError: (_error, _reminder, changes) => rollbackRows(queryClient, changes),
    onSettled: () => reconcileWhenLastSettles(queryClient),
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
    mutationKey: optimisticMutationKey,
    mutationFn: async (reminderIds: string[]) => {
      // Deletes can partially succeed. Wait for every queued write before
      // rejecting, so the final invalidation also sees late successes.
      const results = await Promise.allSettled(reminderIds.map(id => deleteReminderSvc(id)));
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    },
    onMutate: (reminderIds: string[]) =>
      optimisticallyChangeRows(queryClient, new Set(reminderIds), reminder => ({
        ...reminder, isDeleted: true, isActive: false,
      })),
    onError: (_error, _ids, changes) => rollbackRows(queryClient, changes),
    onSettled: () => reconcileWhenLastSettles(queryClient),
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
    mutationKey: optimisticMutationKey,
    mutationFn: permanentlyDeleteReminderSvc,
    onMutate: (id: string) =>
      optimisticallyChangeRows(queryClient, new Set([id]), () => undefined),
    onError: (_error, _id, changes) => rollbackRows(queryClient, changes),
    onSettled: () => reconcileWhenLastSettles(queryClient),
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
