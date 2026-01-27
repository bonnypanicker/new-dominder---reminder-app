export type RepeatType = 'none' | 'daily' | 'monthly' | 'yearly' | 'every' | 'weekly' | 'custom';

export type EveryUnit = 'minutes' | 'hours' | 'days';

export type Priority = 'high' | 'medium' | 'low';

export type UntilType = 'none' | 'endsAt' | 'count';

export interface SnoozeOption {
  label: string;
  minutes: number;
}

export interface Reminder {
  id: string;
  title: string;
  priority: Priority;
  date: string;
  time: string;
  repeatType: RepeatType;
  repeatDays?: number[];
  monthlyDay?: number;
  everyInterval?: {
    value: number;
    unit: EveryUnit;
  };
  untilType?: UntilType;
  untilDate?: string;
  untilTime?: string;
  untilCount?: number;
  nextReminderDate?: string;
  isCompleted?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
  occurrenceCount?: number;
  snoozeUntil?: string;

  // Extended fields
  description?: string;
  isActive?: boolean;
  isExpired?: boolean;
  isPaused?: boolean;
  pauseUntilDate?: string;
  wasSnoozed?: boolean;
  notificationId?: string;
  untilIsAM?: boolean;
  ringerSound?: string;
  completionHistory?: string[];
  parentId?: string; // Add explicit parentId since it's used in logic

  // Multi-select / Window fields
  multiSelectEnabled?: boolean;
  multiSelectDates?: string[];
  multiSelectDays?: number[]; // 0-6
  windowEndTime?: string; // For defining daily window end
  windowEndIsAM?: boolean;

  // Transient fields
  pendingShadowSnoozeUntil?: string; // Track shadow snooze time for UI
  snoozeClearing?: boolean;
  notificationUpdating?: boolean;
}
