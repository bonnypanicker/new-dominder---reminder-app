export type Priority = 'high' | 'medium' | 'low';

export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'every' | 'custom';

export type EveryUnit = 'minutes' | 'hours' | 'days';

export interface Reminder {
  id: string;
  title: string;
  description: string;
  time: string;
  date: string;
  priority: Priority;
  isActive: boolean;
  isPaused?: boolean;
  repeatType: RepeatType;
  repeatDays?: number[];
  customDates?: string[];
  monthlyDay?: number;
  everyInterval?: { value: number; unit: EveryUnit };
  isCompleted: boolean;
  isExpired?: boolean;
  snoozeUntil?: string;
  createdAt: string;
  lastTriggeredAt?: string;
  nextReminderDate?: string;
  notificationId?: string;
  ringerSound?: string;
  
  // Until feature fields
  untilType?: 'none' | 'endsAt' | 'count';
  untilDate?: string;
  untilTime?: string;
  untilIsAM?: boolean;
  untilCount?: number;
  occurrenceCount?: number;
  // Internal flags to prevent infinite loops
  snoozeClearing?: boolean;
  notificationUpdating?: boolean;
  wasSnoozed?: boolean;
}

export interface SnoozeOption {
  label: string;
  minutes: number;
}
