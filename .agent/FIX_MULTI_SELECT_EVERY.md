# Fix Analysis: Multi-Select "Every" Reminder with "Ends After X Occurrences"

## Issue Description
Users report that when creating a "Standard Mode" reminder with:
- **Repeat Type:** "Every" (e.g., 1 hour)
- **Multi-select Dates:** Enabled (multiple dates selected)
- **End Condition:** "Ends after X occurrences" (e.g., 3)

The following behaviors occur:
1.  **Day 1:** Triggers correctly for the specified occurrences.
2.  **Day 1 End:** After X occurrences, it stops (Correct).
3.  **Day 2+:** **Does not trigger at all.**
4.  **Inconsistent triggering:** Sometimes misses the first trigger of the day.

## Root Cause Analysis
The issue stems from how `occurrenceCount` is tracked and verified.

1.  **Global Occurrence Counting:**
    The `occurrenceCount` property on the `Reminder` object is treated as a **global, lifetime counter** for that reminder. It is not reset between days.
    
    When "Day 1" completes its 3rd specific occurrence:
    - `markReminderDone` increments `occurrenceCount` to 3.
    - It calls `calculateNextReminderDate`.
    
2.  **Blocking Check in Utils:**
    In `calculateNextReminderDate` (`services/reminder-utils.ts`), the validation logic checks global occurrences against the limit:
    ```typescript
    if (reminder.untilType === 'count' && typeof reminder.untilCount === 'number') {
      const occurred = reminder.occurrenceCount ?? 0;
      if (occurred >= reminder.untilCount) {
        return null; // Prevents ANY future scheduling
      }
    }
    ```
    
    Because `occurrenceCount` (3) >= `untilCount` (3), the function returns `null`. This interprets the limit as "3 times **ever**", effectively ending the entire series after the first day. This contradicts the expected behavior for Multi-Select + Every, where users expect "3 times **per day**" (or per selected session).

3.  **No Reset Mechanism:**
    There is currently no logic in `markReminderDone` (`services/reminder-scheduler.ts`) to detect a day boundary and reset the `occurrenceCount` for the new day.

## Proposed Fix

To fix this, we must treat "Ends after X occurrences" as a **per-day/per-session limit** when Multi-Select is enabled.

### Plan

1.  **Modify `services/reminder-utils.ts`**:
    Relax the `untilCount` check in `calculateNextReminderDate`. If `multiSelectEnabled` is true, allow the check to pass **IF** the candidate date falls on a future day compared to the reference date (`fromDate` or `lastTriggeredAt`). This allows finding the *first* occurrence of Day 2 even if Day 1's count is maxed.

2.  **Modify `services/reminder-scheduler.ts`**:
    In `markReminderDone`, detect when the `nextReminderDate` falls on a different day than the completion time. If a day switch occurs, **reset `occurrenceCount` to 0** in the database update. This ensures that Day 2 starts with a fresh counter, allowing it to complete its own set of 3 occurrences.

## Implementation Details

### 1. `services/reminder-utils.ts`

Update `calculateNextReminderDate` to conditionally ignore the count check for future days:

```typescript
// services/reminder-utils.ts

// Helper (add if missing or use inline logic)
function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

// Inside calculateNextReminderDate...
  // Count-based end: stop if occurrenceCount has reached untilCount
  if (reminder.untilType === 'count' && typeof reminder.untilCount === 'number') {
    const occurred = reminder.occurrenceCount ?? 0;
    
    // Check if we hit the limit
    if (occurred >= reminder.untilCount) {
       let allowFutureDay = false;

       // Fix for Multi-Select: reset count logic allows future days
       if (reminder.multiSelectEnabled && reminder.repeatType === 'every' && candidate) {
         // If candidate is on a later day than fromDate, we assume count will reset
         // Use a small buffer or strict day compare
         if (candidate > fromDate && !isSameDay(candidate, fromDate)) {
            allowFutureDay = true;
            console.log(`[calculateNextReminderDate] Count limit reached for TODAY, but candidate is FUTURE day, allowing: ${candidate.toISOString()}`);
         }
       }

       if (!allowFutureDay) {
          console.log(`[calculateNextReminderDate] Count cap reached (${occurred}/${reminder.untilCount}), no next occurrence`);
          return null;
       }
    }
  }
```

### 2. `services/reminder-scheduler.ts`

Update `markReminderDone` to reset the count on day switch:

```typescript
// services/reminder-scheduler.ts

// Inside markReminderDone...
    if (nextDate) {
      // More occurrences to come - update and reschedule
      
      let nextCount = newOccurrenceCount;

      // FIX: Reset occurrence count if moving to a new day for multi-select
      if (reminder.multiSelectEnabled && reminder.repeatType === 'every') {
        const completedDate = new Date(completedOccurrenceTime);
        const nextDateObj = new Date(nextDate);
        
        // Simple day comparison
        const isDaySwitch = nextDateObj.getDate() !== completedDate.getDate() || 
                            nextDateObj.getMonth() !== completedDate.getMonth() ||
                            nextDateObj.getFullYear() !== completedDate.getFullYear();

        if (isDaySwitch) {
            console.log(`[Scheduler] Multi-select day switch detected (${completedDate.toISOString()} -> ${nextDateObj.toISOString()}). Resetting occurrence count.`);
            nextCount = 0;
        }
      }

      const updated = {
        ...calcContext,
        occurrenceCount: nextCount, // Use the potentially reset count
        nextReminderDate: nextDate.toISOString(),
        // ...
      };
      
      // ... update reminder ...

      // Sync occurrence count to native (ensure we sync the reset count if applicable)
      if (AlarmModule?.updateOccurrenceCount && nextCount !== undefined) {
         await AlarmModule.updateOccurrenceCount(reminderId, nextCount);
      }
      
      // ...
    }
```

This ensures that the chain continues across days while respecting the intra-day occurrence limit.
