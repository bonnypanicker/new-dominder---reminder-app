# Analysis of Reminder Skipping Issue

## Problem Description
When a reminder with a short repetition interval (e.g., "Every 1 Minute") is scheduled, occurrences may be skipped if the app processing happens slightly after the scheduled time.
For example, for a sequence 8:30, 8:31, 8:32, 8:33:
- User acknowledges 8:31 at 8:32:05.
- The system calculates the next occurrence.
- Expected: 8:32 (which is 5 seconds in the past).
- Actual: 8:33 (skipping 8:32).

## Root Cause Analysis

The issue stems from two interacting components that both enforce "strictly future" scheduling:

1.  **`calculateNextReminderDate` (in `services/reminder-utils.ts`)**:
    When calculating the next occurrence for `'every'` repeat type, the code compares the candidate time (`result`) against `fromDate` (which defaults to `Date.now()`):
    ```typescript
    if (result <= fromDate) {
      // ... logic to skip ahead ...
    }
    ```
    If the current time (`fromDate`) is even 1 millisecond past the calculated target time (`result`), the function considers the target "stale" and advances to the next interval.
    In the example: `result` = 8:32:00, `fromDate` = 8:32:05. Since 8:32:00 <= 8:32:05, it skips to 8:33:00.

2.  **`scheduleReminderByModel` (in `hooks/notification-service.ts`)**:
    Even if `calculateNextReminderDate` were to return 8:32:00, the scheduler has a safety check for past times:
    ```typescript
    const TOLERANCE_MS = 5000;
    if (when <= now - TOLERANCE_MS) {
       // ... Recalculate from current time ...
    }
    ```
    If the delay exceeds 5 seconds (e.g., 8:32:05), the scheduler rejects 8:32:00 and triggers a recalculation starting from `now`, which yields 8:33:00 (or later), effectively dropping 8:32:00.

## Proposed Solution

To fix this, we need to allow "catching up" on recently missed occurrences rather than skipping them.

### 1. Update `calculateNextReminderDate`
Introduce a "grace period" or buffer when comparing `result` to `fromDate`. This allows the function to return a time that is slightly in the past (e.g., up to 1 interval or a fixed duration like 5 minutes).

**Proposed Logic Change:**
Instead of `if (result <= fromDate)`, use a buffered check.
However, since `calculateNextReminderDate` is a pure utility, a cleaner approach is to adjust the `fromDate` passed to it in `markReminderDone`.

### 2. Update `markReminderDone` (in `services/reminder-scheduler.ts`)
When calculating the next occurrence, pass a `fromDate` that is shifted back by a tolerance window. This tells the calculator: "Find the next occurrence that is after (Now - Tolerance)".

```typescript
// Current
const nextDate = calculateNextReminderDate(calcContext as any, new Date());

// Proposed Fix
const SCHEDULING_TOLERANCE_MS = 60 * 1000; // 1 minute tolerance
const searchFromDate = new Date(Date.now() - SCHEDULING_TOLERANCE_MS);
const nextDate = calculateNextReminderDate(calcContext as any, searchFromDate);
```

### 3. Update `scheduleReminderByModel` (in `hooks/notification-service.ts`)
Modify the "past time" handling logic. If a reminder is in the past but within a reasonable "catch-up window" (e.g., the interval duration), schedule it for immediate execution instead of recalculating/skipping.

**Proposed Logic Change:**
```typescript
if (when <= now - TOLERANCE_MS) {
  // Check if it's an 'every' reminder and the delay is within a catch-up window
  // e.g. delay is less than the interval itself (or a fixed max catch-up like 5 mins)
  const isCatchUp = reminder.repeatType === 'every' && (now - when) < (reminder.everyInterval.value * unitToMs);
  
  if (isCatchUp) {
     // Fire immediately
     when = now + 1000; 
  } else {
     // Recalculate (existing logic)
  }
}
```

## Summary of Fixes

1.  **Relax Strict Future Check**: In `services/reminder-scheduler.ts`, pass `new Date(Date.now() - TOLERANCE)` to `calculateNextReminderDate`.
2.  **Allow Catch-up**: In `hooks/notification-service.ts`, detect if a "past" reminder is a recently missed recurring event and schedule it immediately instead of recalculating.

This ensures that if 8:32:00 is processed at 8:32:05:
1.  `calculateNextReminderDate` returns 8:32:00 (because 8:32:00 > 8:31:05).
2.  `notification-service` sees 8:32:00 is 5s late.
3.  It determines this is a valid "catch-up".
4.  It fires the notification immediately.
