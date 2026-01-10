# Analysis of "Every Minute" Reminder Skipping Issue

## Problem Description
When a reminder is set to repeat "Every 1 Minute" (or other "Every X" intervals) and the app is in the **Open** state, the reminder execution may skip an occurrence if the previous occurrence is processed slightly late (e.g., dismissing the 8:30 reminder at 8:31:05).

**Observed Behavior:**
Sequence: 8:30 -> 8:31 -> (Skipped 8:32) -> 8:33 -> 8:34.
or
Sequence: 8:30 -> (User dismisses late) -> 8:32 (Skipped 8:31).

## Root Cause Analysis
The issue resides in `services/reminder-utils.ts` within the `calculateNextReminderDate` function. This function calculates the next occurrence for a reminder.

For reminders with `repeatType: 'every'`, the code explicitly enforces that the calculated next occurrence must be strictly in the future relative to `fromDate` (which is the current time `now` when called from `markReminderDone`).

**Code in Question (`services/reminder-utils.ts`):**
```typescript
173:        if (result <= fromDate) {
174:          // FIX: Calculate skip from result (not baseline) to avoid skipping occurrences
175:          // due to processing delays (e.g., if result=12:01:00 but fromDate=12:01:00.500)
176:          const diff = fromDate.getTime() - result.getTime();
177:          // Ensure we always move to the future. If diff is 0, steps should be 1.
178:          // Math.floor(diff / addMs) + 1 guarantees the next interval is strictly > fromDate
179:          const steps = Math.floor(diff / addMs) + 1;
180:          result = new Date(result.getTime() + steps * addMs);
            // ...
```

**Scenario Breakdown:**
1. Reminder scheduled for **8:30:00**.
2. Alarm triggers at 8:30:00.
3. User dismisses it at **8:31:05** (delayed interaction).
4. `markReminderDone` calls `calculateNextReminderDate` with `fromDate` = **8:31:05**.
5. `baseline` is **8:30:00**. Interval is 1 minute.
6. Initial `result` calculation: 8:30:00 + 1m = **8:31:00**.
7. Check `result (8:31:00) <= fromDate (8:31:05)` is **TRUE**.
8. Logic executes to skip past time:
   - `diff` = 5000ms.
   - `steps` = `Math.floor(5000 / 60000) + 1` = `0 + 1` = **1**.
   - New `result` = 8:31:00 + 1 * 60000 = **8:32:00**.
9. The occurrence at **8:31:00** is effectively SKIPPED because the code forces the next time to be strictly `> 8:31:05`.

Since the user missed the exact second of 8:31:00 (by 5 seconds), the system decides to wait for the *next* one (8:32:00) instead of firing the one that just passed.

## Recommended Fix
The goal is to allow the "catch-up" of the most recent missed occurrence if we are within its interval, rather than strictly forcing a future time.

If `result` (8:31:00) is in the past, but we are still close to it (e.g., it's 8:31:05), we should schedule it. The Android `AlarmManager` will fire it immediately if the scheduled time is in the past, which is the correct "catch-up" behavior.

We should only skip intervals that are *completely* in the past (e.g., if we are 10 minutes late, skip the first 9, but fire the 10th).

**Change:**
Modify the `steps` calculation to remove the `+ 1`.

```typescript
// Old
const steps = Math.floor(diff / addMs) + 1;

// New
const steps = Math.floor(diff / addMs);
```

**Logic Verification:**
- **Case 1 (Slightly late):** `now` = 8:31:05, `result` = 8:31:00. `diff` = 5s.
  - `steps` = `floor(5/60)` = 0.
  - `result` remains **8:31:00**.
  - Scheduler schedules 8:31:00.
  - **Result:** Alarm fires immediately (Catch-up). Correct.

- **Case 2 (Very late):** `now` = 8:35:05, `result` = 8:31:00. `diff` = 245s.
  - `steps` = `floor(245/60)` = 4.
  - `result` = 8:31:00 + 4m = **8:35:00**.
  - `8:35:00` is still <= `8:35:05`.
  - Scheduler schedules 8:35:00.
  - **Result:** Alarm fires immediately (Catch-up for the *most recent* missed one). Occurrences 8:31, 8:32, 8:33, 8:34 are skipped. This prevents an "alarm storm" while still resuming activity. Correct.

## Implementation Details
File: `services/reminder-utils.ts`

```typescript
<<<<
          // Ensure we always move to the future. If diff is 0, steps should be 1.
          // Math.floor(diff / addMs) + 1 guarantees the next interval is strictly > fromDate
          const steps = Math.floor(diff / addMs) + 1;
          result = new Date(result.getTime() + steps * addMs);
====
          // Allow catch-up for the most recent missed occurrence.
          // If we are late, we schedule the last missed interval (which will fire immediately).
          const steps = Math.floor(diff / addMs);
          result = new Date(result.getTime() + steps * addMs);
>>>>
```
