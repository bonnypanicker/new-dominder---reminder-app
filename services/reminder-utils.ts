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
  console.log(`[calculateNextReminderDate] for reminder: ${reminder.id}, fromDate: ${fromDate.toISOString()}, repeatType: ${reminder.repeatType}, date: ${reminder.date}, time: ${reminder.time}`);
  const timeParts = reminder.time.split(':');
  const hh = parseInt(timeParts[0] || '0', 10);
  const mm = parseInt(timeParts[1] || '0', 10);

  const setTime = (d: Date): Date => {
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  switch (reminder.repeatType) {
    case 'none': {
      // For one-time reminders, return the scheduled date/time if it's in the future
      const dateParts = reminder.date.split('-');
      const year = parseInt(dateParts[0] || '0', 10);
      const month = parseInt(dateParts[1] || '1', 10);
      const day = parseInt(dateParts[2] || '1', 10);
      const scheduledTime = new Date(year, month - 1, day, hh, mm, 0, 0);
      console.log(`[calculateNextReminderDate] One-time reminder scheduled for: ${scheduledTime.toISOString()}, isInFuture: ${scheduledTime > fromDate}`);
      return scheduledTime > fromDate ? scheduledTime : null;
    }
    case 'daily': {
      const selected = (reminder.repeatDays && reminder.repeatDays.length > 0)
        ? reminder.repeatDays
        : [0,1,2,3,4,5,6];
      console.log(`[calculateNextReminderDate] Daily reminder, selected days: ${JSON.stringify(selected)}`);
      
      // Use nextReminderDate as reference if available (for recurring reminders that have already triggered)
      let referenceDate = fromDate;
      if (reminder.nextReminderDate) {
        referenceDate = new Date(reminder.nextReminderDate);
        console.log(`[calculateNextReminderDate] Using nextReminderDate as reference: ${referenceDate.toISOString()}`);
      }
      
      for (let add = 0; add < 8; add++) {
        const check = setTime(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + add));
        console.log(`[calculateNextReminderDate] Checking day ${add}: ${check.toISOString()}, dayOfWeek: ${check.getDay()}, isSelected: ${selected.includes(check.getDay())}, isAfterNow: ${check > referenceDate}`);
        if (selected.includes(check.getDay()) && check > referenceDate) {
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
      
      // Use nextReminderDate as reference if available (for recurring reminders that have already triggered)
      let referenceDate = fromDate;
      if (reminder.nextReminderDate) {
        referenceDate = new Date(reminder.nextReminderDate);
        console.log(`[calculateNextReminderDate] Using nextReminderDate as reference: ${referenceDate.toISOString()}`);
      }
      
      const result = nextMonthlyOccurrenceFrom(referenceDate, desiredDay, hh, mm);
      console.log(`[calculateNextReminderDate] Monthly desired=${desiredDay}, from=${referenceDate.toISOString()}, result=${result.toISOString()}`);
      return result;
    }
    case 'yearly': {
      const dateParts = reminder.date.split('-');
      const month = parseInt(dateParts[1] || '1', 10);
      const day = parseInt(dateParts[2] || '1', 10);
      
      // Use nextReminderDate as reference if available (for recurring reminders that have already triggered)
      let referenceDate = fromDate;
      if (reminder.nextReminderDate) {
        referenceDate = new Date(reminder.nextReminderDate);
        console.log(`[calculateNextReminderDate] Using nextReminderDate as reference: ${referenceDate.toISOString()}`);
      }
      
      // Try this year first
      let target = setTime(new Date(referenceDate.getFullYear(), month - 1, day));
      // If it's in the past, use next year
      if (target <= referenceDate) {
        target = setTime(new Date(referenceDate.getFullYear() + 1, month - 1, day));
      }
      console.log(`[calculateNextReminderDate] Yearly from=${referenceDate.toISOString()}, result: ${target.toISOString()}`);
      return target;
    }
    case 'every': {
      const interval = reminder.everyInterval;
      if (!interval || !interval.value || interval.value <= 0) {
        console.log(`[calculateNextReminderDate] Invalid interval for 'every' reminder`);
        return null;
      }
      
      // Determine the reference point for calculating the next occurrence
      let referenceTime: Date;
      
      if (reminder.nextReminderDate) {
        // If there's a nextReminderDate, use it as the reference (this is the last scheduled time)
        referenceTime = new Date(reminder.nextReminderDate);
        console.log(`[calculateNextReminderDate] Using nextReminderDate as reference: ${referenceTime.toISOString()}`);
      } else if (reminder.lastTriggeredAt) {
        // If the reminder has triggered before, use that as reference
        referenceTime = new Date(reminder.lastTriggeredAt);
        console.log(`[calculateNextReminderDate] Using lastTriggeredAt as reference: ${referenceTime.toISOString()}`);
      } else {
        // First time scheduling, use the original date
        referenceTime = new Date(reminder.date);
        referenceTime.setHours(hh, mm, 0, 0);
        console.log(`[calculateNextReminderDate] Using original date as reference: ${referenceTime.toISOString()}`);
      }
      
      // Calculate the interval in milliseconds
      const addMs = interval.unit === 'minutes' 
        ? interval.value * 60 * 1000 
        : interval.unit === 'hours' 
        ? interval.value * 60 * 60 * 1000 
        : interval.value * 24 * 60 * 60 * 1000;
      
      // If the reference time is in the future relative to fromDate, return it
      if (referenceTime > fromDate) {
        console.log(`[calculateNextReminderDate] Reference time is in future: ${referenceTime.toISOString()}`);
        return referenceTime;
      }
      
      // Calculate next occurrence by adding one interval to the reference time
      const result = new Date(referenceTime.getTime() + addMs);
      console.log(`[calculateNextReminderDate] Every ${interval.value} ${interval.unit}, next occurrence: ${result.toISOString()}`);
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
