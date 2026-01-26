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
        : [0, 1, 2, 3, 4, 5, 6];
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

      // MULTI-SELECT LOGIC
      if (reminder.multiSelectEnabled) {
        // Parse Window End Time
        let endH = 23, endM = 59;
        if (reminder.windowEndTime) {
          const parts = reminder.windowEndTime.split(':');
          endH = parseInt(parts[0], 10);
          endM = parseInt(parts[1], 10);
        }

        // Interval in ms
        const addMs = interval.unit === 'minutes' ? interval.value * 60 * 1000 :
          interval.unit === 'hours' ? interval.value * 60 * 60 * 1000 :
            interval.value * 24 * 60 * 60 * 1000;

        // Start check from date of fromDate (reset time to 00:00 to iterate days)
        // Or better: Iterate days starting from "today" (fromDate).
        const cursor = new Date(fromDate);
        cursor.setHours(0, 0, 0, 0);

        let foundCandidate: Date | null = null;

        // Safety limit: look ahead 1 year max
        for (let i = 0; i < 366; i++) {
          // Use setDate for reliable day iteration (handles DST/Timezones better than ms addition)
          const checkDate = new Date(cursor);
          checkDate.setDate(cursor.getDate() + i);

          const yyyy = checkDate.getFullYear();
          const month = String(checkDate.getMonth() + 1).padStart(2, '0');
          const dd = String(checkDate.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${month}-${dd}`;
          const dayOfWeek = checkDate.getDay();

          const isSelectedDate = reminder.multiSelectDates?.includes(dateStr);
          const isSelectedDay = reminder.multiSelectDays?.includes(dayOfWeek);

          // Fix: If count limit reached for TODAY, skip generating occurrences for today
          // so we keep looking for a FUTURE day (series continuation).
          if (reminder.untilType === 'count' && typeof reminder.untilCount === 'number') {
            const occurred = reminder.occurrenceCount ?? 0;
            if (occurred >= reminder.untilCount) {
              const fY = fromDate.getFullYear();
              const fM = fromDate.getMonth();
              const fD = fromDate.getDate();

              const cY = checkDate.getFullYear();
              const cM = checkDate.getMonth();
              const cD = checkDate.getDate();

              const isToday = cY === fY && cM === fM && cD === fD;

              if (isToday) {
                // Skip today because we're done for the day
                continue;
              }
            }
          }

          if (isSelectedDate || isSelectedDay) {
            // This day is valid. Generate occurrences within window.
            const startWindow = new Date(checkDate);
            startWindow.setHours(hh, mm, 0, 0);

            const endWindow = new Date(checkDate);
            endWindow.setHours(endH, endM, 0, 0);

            // If end window < start window, assume it ends next day? OR ignore?
            // User prompt implies same day window generally. 
            // If 1pm to 5pm, same day.
            // If 11pm to 2am? Let's assume user inputs standard valid range for same day for now or standard wrapping if we supported it.
            // Given the UI "Set Time" in Ends modal, it's just a time.
            if (endWindow <= startWindow) {
              endWindow.setDate(endWindow.getDate() + 1);
            }

            // Generate occurrences: startWindow, startWindow + interval, ... <= endWindow
            // We need the first one > fromDate

            let occurrence = new Date(startWindow);
            occurrence.setMilliseconds(0); // Ensure milliseconds are zeroed out
            while (occurrence <= endWindow) {
              if (occurrence > fromDate) {
                foundCandidate = occurrence;
                break;
              }
              occurrence = new Date(occurrence.getTime() + addMs);
            }
          }
          if (foundCandidate) break;
        }
        candidate = foundCandidate;
        break;
      }

      // STANDARD EVERY LOGIC (Legacy/Single)
      // Calculate the interval in milliseconds
      const addMs = interval.unit === 'minutes'
        ? interval.value * 60 * 1000
        : interval.unit === 'hours'
          ? interval.value * 60 * 60 * 1000
          : interval.value * 24 * 60 * 60 * 1000;

      // Establish the start boundary from the reminder's date/time
      const startBoundary = new Date(reminder.date);
      startBoundary.setHours(hh, mm, 0, 0);

      // ANCHORED CALCULATION:
      const diff = fromDate.getTime() - startBoundary.getTime();

      // If we are before the start, the start is the next occurrence
      if (diff < 0) {
        candidate = startBoundary;
        console.log(`[calculateNextReminderDate] Before start boundary, returning start: ${candidate.toISOString()}`);
        break;
      }

      // Calculate how many steps have passed to get past fromDate
      // We want result > fromDate
      // steps = floor(diff / addMs) + 1
      const steps = Math.floor(diff / addMs) + 1;
      const result = new Date(startBoundary.getTime() + steps * addMs);
      result.setMilliseconds(0); // Zero out milliseconds to prevent time drift

      console.log(`[calculateNextReminderDate] Every ${interval.value} ${interval.unit}, steps=${steps}, next anchored occurrence: ${result.toISOString()}`);
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
      let allowFutureDay = false;
      // Fix for Multi-Select + Every: allow future day candidates even if limit reached for today
      // This interprets "Ends after X occurrences" as "per day" or "per session" for multi-select
      if (reminder.multiSelectEnabled && reminder.repeatType === 'every' && candidate) {
        // Simple same-day check logic without external dependency
        const cY = candidate.getFullYear();
        const cM = candidate.getMonth();
        const cD = candidate.getDate();

        const fY = fromDate.getFullYear();
        const fM = fromDate.getMonth();
        const fD = fromDate.getDate();

        // If candidate is strictly in the future day compared to fromDate
        const isFutureDay = (cY > fY) || (cY === fY && cM > fM) || (cY === fY && cM === fM && cD > fD);

        if (isFutureDay) {
          console.log(`[calculateNextReminderDate] Count limit reached for TODAY, but candidate is FUTURE day, allowing: ${candidate.toISOString()}`);
          allowFutureDay = true;
        }
      }

      if (!allowFutureDay) {
        console.log(`[calculateNextReminderDate] Count cap reached (${occurred}/${reminder.untilCount}), no next occurrence`);
        return null;
      }
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
