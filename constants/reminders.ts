import { SnoozeOption } from '@/types/reminder';
import { Material3Colors } from '@/constants/colors';

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: '5m', minutes: 5 },
  { label: '10m', minutes: 10 },
  { label: '15m', minutes: 15 },
  { label: '20m', minutes: 20 },
  { label: '25m', minutes: 25 },
];

export const PRIORITY_COLORS = {
  high: '#EF4444', // Red (Ringer) - restored to previous color
  medium: '#FFA500', // Light Orange (Standard)
  low: '#10B981', // Green (Silent)
};

export const getPriorityColor = (
  colors: typeof Material3Colors.light,
  priority: 'high' | 'medium' | 'low'
) => {
  if (priority === 'high') return colors.error;
  if (priority === 'medium') return colors.warning;
  return colors.success;
};

export const getPriorityOnColor = (
  colors: typeof Material3Colors.light,
  priority: 'high' | 'medium' | 'low'
) => {
  if (priority === 'high') return colors.onError;
  if (priority === 'medium') return colors.onWarning;
  return colors.onSuccess;
};

export const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];
