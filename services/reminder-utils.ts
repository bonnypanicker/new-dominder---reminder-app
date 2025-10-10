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
  console.log(`[calculateNextReminderDate] for reminder: ${reminder.id}, fromDate: ${fromDate.toISOString()}, repeatType: ${reminder.repeatType}`);
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
      console.log(`[calculateNextReminderDate] Daily reminder, selected days: ${JSON.stringify(selected)}`);
      for (let add = 0; add < 8; add++) {
        const check = setTime(new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + add));
        console.log(`[calculateNextReminderDate] Checking day ${add}: ${check.toISOString()}, dayOfWeek: ${check.getDay()}, isSelected: ${selected.includes(check.getDay())}, isAfterNow: ${check > fromDate}`);
        if (selected.includes(check.getDay()) && check > fromDate) {
          console.log(`[calculateNextReminderDate] Found next daily occurrence: ${check.toISOString()}`);
          return check;
        }
      }
      console.log(`[calculateNextReminderDate] No valid daily occurrence found`);
      return null;
    }
    case 'monthly': {
      const dateParts = reminder.date.split('-');
      const day = parseInt(dateParts[2] || '1', 10);
      const desiredDay = reminder.monthlyDay ?? day;
      const result = nextMonthlyOccurrenceFrom(fromDate, desiredDay, hh, mm);
      console.log(`[calculateNextReminderDate] Monthly desired=${desiredDay}, from=${fromDate.toISOString()}, result=${result.toISOString()}`);
      return result;
    }
    case 'yearly': {
      const dateParts = reminder.date.split('-');
      const month = parseInt(dateParts[1] || '1', 10);
      const day = parseInt(dateParts[2] || '1', 10);
      // Try this year first
      let target = setTime(new Date(fromDate.getFullYear(), month - 1, day));
      // If it's in the past, use next year
      if (target <= fromDate) {
        target = setTime(new Date(fromDate.getFullYear() + 1, month - 1, day));
      }
      console.log(`[calculateNextReminderDate] Yearly result: ${target.toISOString()}`);
      return target;
    }
    case 'every': {
      const interval = reminder.everyInterval;
      if (!interval || !interval.value || interval.value <= 0) {
        console.log(`[calculateNextReminderDate] Invalid interval for 'every' reminder`);
        return null;
      }
      const baseStart = new Date(reminder.date);
      baseStart.setHours(hh, mm, 0, 0);
      if (fromDate <= baseStart) {
        console.log(`[calculateNextReminderDate] Using base start time: ${baseStart.toISOString()}`);
        return baseStart;
      }
      const addMs = interval.unit === 'minutes' ? interval.value * 60 * 1000 : interval.unit === 'hours' ? interval.value * 60 * 60 * 1000 : interval.value * 24 * 60 * 60 * 1000;
      const diff = fromDate.getTime() - baseStart.getTime();
      const steps = Math.floor(diff / addMs) + 1;
      const result = new Date(baseStart.getTime() + steps * addMs);
      console.log(`[calculateNextReminderDate] Every ${interval.value} ${interval.unit}, result: ${result.toISOString()}`);
      return result;
    }
    case 'weekly':
    case 'custom': {
      const selected = reminder.repeatDays ?? [];
      if (selected.length === 0) {
        console.log(`[calculateNextReminderDate] No repeat days selected for weekly/custom reminder`);
        return null;
      }
      console.log(`[calculateNextReminderDate] Weekly/custom reminder, selected days: ${JSON.stringify(selected)}`);
      for (let add = 0; add < 370; add++) {
        const check = setTime(new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + add));
        if (selected.includes(check.getDay()) && check > fromDate) {
          console.log(`[calculateNextReminderDate] Found next weekly/custom occurrence: ${check.toISOString()}`);
          return check;
        }
      }
      console.log(`[calculateNextReminderDate] No valid weekly/custom occurrence found`);
      return null;
    }
    default:
      console.log(`Unknown repeat type in calculateNextReminderDate: ${reminder.repeatType}`);
      return null;
  }
}
