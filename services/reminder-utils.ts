import { Reminder } from '@/types/reminder';

function endOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function resolveMonthlyDay(year: number, monthIndex: number, desiredDay: number): number {
  const lastDay = endOfMonth(year, monthIndex);
  return Math.min(desiredDay, lastDay);
}

function nextMonthlyOccurrenceFrom(now: Date, desiredDay: number, hh: number, mm: number): Date {
  const year = now.getFullYear();
  const monthIndex = now.getMonth();

  const todayTargetDay = resolveMonthlyDay(year, monthIndex, desiredDay);
  const candidateThisMonth = new Date(year, monthIndex, todayTargetDay);
  candidateThisMonth.setHours(hh, mm, 0, 0);

  if (candidateThisMonth > now) {
    return candidateThisMonth;
  }

  const nextMonthIndex = monthIndex + 1;
  const nextYear = year + Math.floor(nextMonthIndex / 12);
  const realNextMonthIndex = nextMonthIndex % 12;
  const nextMonthTargetDay = resolveMonthlyDay(nextYear, realNextMonthIndex, desiredDay);
  const candidateNextMonth = new Date(nextYear, realNextMonthIndex, nextMonthTargetDay);
  candidateNextMonth.setHours(hh, mm, 0, 0);

  return candidateNextMonth;
}

export function calculateNextReminderDate(reminder: Reminder, fromDate: Date = new Date()): Date | null {
  console.log(`[calculateNextReminderDate] for reminder: ${reminder.id}, fromDate: ${fromDate.toISOString()}`);
  const timeParts = reminder.time.split(':');
  const hh = parseInt(timeParts[0] || '0', 10);
  const mm = parseInt(timeParts[1] || '0', 10);

  const setTime = (d: Date): Date => {
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  switch (reminder.repeatType) {
    case 'none': {
      return null; // Non-repeating reminders don't have next dates
    }
    case 'daily': {
      const selected = (reminder.repeatDays && reminder.repeatDays.length > 0)
        ? reminder.repeatDays
        : [0,1,2,3,4,5,6];
      for (let add = 0; add < 8; add++) {
        const check = setTime(new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + add));
        if (selected.includes(check.getDay()) && check > fromDate) return check;
      }
      return null;
    }
    case 'monthly': {
      const dateParts = reminder.date.split('-');
      const day = parseInt(dateParts[2] || '1', 10);
      const desiredDay = reminder.monthlyDay ?? day;
      const result = nextMonthlyOccurrenceFrom(fromDate, desiredDay, hh, mm);
      console.log(`calculateNextReminderDate - Monthly desired=${desiredDay}, from=${fromDate.toISOString()}, result=${result.toISOString()}`);
      return result;
    }
    case 'yearly': {
      const dateParts = reminder.date.split('-');
      const month = parseInt(dateParts[1] || '1', 10);
      const day = parseInt(dateParts[2] || '1', 10);
      const target = setTime(new Date(fromDate.getFullYear() + 1, month - 1, day));
      return target;
    }
    case 'every': {
      const interval = reminder.everyInterval;
      if (!interval || !interval.value || interval.value <= 0) return null;
      const baseStart = new Date(reminder.date);
      baseStart.setHours(hh, mm, 0, 0);
      if (fromDate <= baseStart) return baseStart;
      const addMs = interval.unit === 'minutes' ? interval.value * 60 * 1000 : interval.unit === 'hours' ? interval.value * 60 * 60 * 1000 : interval.value * 24 * 60 * 60 * 1000;
      const diff = fromDate.getTime() - baseStart.getTime();
      const steps = Math.floor(diff / addMs) + 1;
      return new Date(baseStart.getTime() + steps * addMs);
    }
    case 'weekly':
    case 'custom': {
      const selected = reminder.repeatDays ?? [];
      if (selected.length === 0) return null;
      for (let add = 0; add < 370; add++) {
        const check = setTime(new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + add));
        if (selected.includes(check.getDay()) && check > fromDate) return check;
      }
      return null;
    }
    default:
      console.log(`Unknown repeat type in calculateNextReminderDate: ${reminder.repeatType}`);
      return null;
  }
}
