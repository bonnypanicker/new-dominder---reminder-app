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

  let candidate: Date | null = null;

  switch (reminder.repeatType) {
    case 'none': {
      // For one-time reminders, return the scheduled date/time if it's in the future
      const dateParts = reminder.date.split('-');
      const year = parseInt(dateParts[0] || '0', 10);
      const month = parseInt(dateParts[1] || '1', 10);
      const day = parseInt(dateParts[2] || '1', 10);
      const scheduledTime = new Date(year, month - 1, day, hh, mm, 0, 0);
      console.log(`[calculateNextReminderDate] One-time reminder scheduled for: ${scheduledTime.toISOString()}, isInFuture: ${scheduledTime > fromDate}`);
      candidate = scheduledTime > fromDate ? scheduledTime : null;
      break;
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
          candidate = check;
          break;
        }
      }
      if (!candidate) {
        console.log(`[calculateNextReminderDate] No valid daily occurrence found`);
      }
      break;
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
      candidate = result;
      break;
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
      candidate = target;
      break;
    }
    case 'every': {
      const interval = reminder.everyInterval;
      if (!interval || !interval.value || interval.value <= 0) {
        console.log(`[calculateNextReminderDate] Invalid interval for 'every' reminder`);
        candidate = null;
        break;
      }

      // Calculate the interval in milliseconds
      const addMs = interval.unit === 'minutes'
        ? interval.value * 60 * 1000
        : interval.unit === 'hours'
        ? interval.value * 60 * 60 * 1000
        : interval.value * 24 * 60 * 60 * 1000;

      // Establish the start boundary from the reminder's date/time
      const startBoundary = new Date(reminder.date);
      startBoundary.setHours(hh, mm, 0, 0);

      // Determine whether we've already had at least one occurrence
      const hasRecurringHistory = Boolean(reminder.nextReminderDate || reminder.lastTriggeredAt);

      let result: Date;

      if (!hasRecurringHistory) {
        // First-time scheduling for 'every': include the exact start time
        if (fromDate <= startBoundary) {
          result = startBoundary;
          console.log(`[calculateNextReminderDate] First occurrence at start boundary: ${result.toISOString()}`);
        } else {
          // Find the smallest occurrence >= fromDate aligned to the interval from startBoundary
          const diff = fromDate.getTime() - startBoundary.getTime();
          const steps = Math.ceil(diff / addMs);
          result = new Date(startBoundary.getTime() + steps * addMs);
          console.log(`[calculateNextReminderDate] First occurrence aligned after now: ${result.toISOString()} (steps=${steps})`);
        }
      } else {
        // CRITICAL FIX: For 'every' reminders, always calculate from START + occurrenceCount
        // to maintain perfect alignment, rather than trusting nextReminderDate which may drift
        const occurrenceCount = reminder.occurrenceCount || 0;
        result = new Date(startBoundary.getTime() + occurrenceCount * addMs);
        
        // If the calculated time is in the past (due to processing delays), advance to next interval
        if (result <= fromDate) {
          const diff = fromDate.getTime() - result.getTime();
          const additionalSteps = Math.floor(diff / addMs) + 1;
          result = new Date(result.getTime() + additionalSteps * addMs);
          console.log(`[calculateNextReminderDate] Calculated from start+count was in past, advanced by ${additionalSteps} steps: ${result.toISOString()}`);
        } else {
          console.log(`[calculateNextReminderDate] Next occurrence from start+count (${occurrenceCount}): ${result.toISOString()}`);
        }
      }

      console.log(`[calculateNextReminderDate] Every ${interval.value} ${interval.unit}, next occurrence: ${result.toISOString()}`);
      candidate = result;
      break;
    }
    case 'weekly':
    case 'custom': {
      const selected = reminder.repeatDays ?? [];
      if (selected.length === 0) {
        console.log(`[calculateNextReminderDate] No repeat days selected for weekly/custom reminder`);
        candidate = null;
        break;
      }
      console.log(`[calculateNextReminderDate] Weekly/custom reminder, selected days: ${JSON.stringify(selected)}`);
      for (let add = 0; add < 370; add++) {
        const check = setTime(new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + add));
        if (selected.includes(check.getDay()) && check > fromDate) {
          console.log(`[calculateNextReminderDate] Found next weekly/custom occurrence: ${check.toISOString()}`);
          candidate = check;
          break;
        }
      }
      if (!candidate) {
        console.log(`[calculateNextReminderDate] No valid weekly/custom occurrence found`);
      }
      break;
    }
    default:
      console.log(`Unknown repeat type in calculateNextReminderDate: ${reminder.repeatType}`);
      candidate = null;
      break;
  }

  // Apply Until constraints
  if (!candidate) return null;

  // Count-based end: stop if occurrenceCount has reached untilCount
  if (reminder.untilType === 'count' && typeof reminder.untilCount === 'number') {
    const occurred = reminder.occurrenceCount ?? 0;
    if (occurred >= reminder.untilCount) {
      console.log(`[calculateNextReminderDate] Count cap reached (${occurred}/${reminder.untilCount}), no next occurrence`);
      return null;
    }
  }

  // Date-based end: stop if candidate is after the end boundary of untilDate
  // For 'every' reminders with minutes/hours, honor the specific untilTime; otherwise use end-of-day
  if (reminder.untilType === 'endsAt' && reminder.untilDate) {
    try {
      const [uy, um, ud] = reminder.untilDate.split('-').map((v) => parseInt(v || '0', 10));
      const endBoundary = new Date(uy, (um || 1) - 1, ud || 1);
      const isTimeBound = reminder.repeatType === 'every' && (reminder.everyInterval?.unit === 'minutes' || reminder.everyInterval?.unit === 'hours');
      if (isTimeBound && reminder.untilTime) {
        const [eh, em] = reminder.untilTime.split(':').map((v) => parseInt(v || '0', 10));
        endBoundary.setHours(eh, em, 0, 0);
      } else {
        endBoundary.setHours(23, 59, 59, 999);
      }
      if (candidate > endBoundary) {
        console.log(`[calculateNextReminderDate] Candidate ${candidate.toISOString()} is after end boundary ${endBoundary.toISOString()}, stopping.`);
        return null;
      }
    } catch (e) {
      console.log(`[calculateNextReminderDate] Failed to parse untilDate: ${reminder.untilDate}`, e);
    }
  }

  return candidate;
}
