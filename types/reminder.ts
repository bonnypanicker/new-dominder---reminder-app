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
  
  // Completed occurrences tracking for repeating reminders
  completedTimes?: string[]; // Array of ISO timestamps for each completed occurrence
  parentId?: string; // For legacy history items (deprecated)
  
  // Transient fields
  snoozeClearing?: boolean;
  notificationUpdating?: boolean;
}
