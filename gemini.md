
Action: file_editor create /app/new-dominder/FIX_ANALYSIS.md --file-text "# Fix Analysis: Skipped Occurrence in High-Frequency Reminders

## Root Cause Analysis (RCA)
The issue occurs in the `markReminderDone` function within `services/reminder-scheduler.ts`. When a reminder is marked as done (e.g., after the alarm rings), the system calculates the *next* occurrence using `calculateNextReminderDate`.

Currently, `markReminderDone` passes `new Date()` (current time) as the reference date:
```typescript
// services/reminder-scheduler.ts (Line 115)
const nextDate = calculateNextReminderDate(calcContext as any, new Date());
```

For a reminder set to repeat \"Every 1 Minute\":
1.  **Scenario:** The alarm scheduled for **10:45:00** fires.
2.  **User Action:** The user lets it ring or delays dismissing it until **10:46:05** (65 seconds later).
3.  **Calculation:** `markReminderDone` executes at 10:46:05. It asks `calculateNextReminderDate` for the next slot after **10:46:05**.
4.  **Result:** The utility function (correctly, based on its input) returns **10:47:00**.
5.  **Outcome:** The **10:46:00** slot is skipped entirely because the processing happened after that time passed.

The `calculateNextReminderDate` utility in `reminder-utils.ts` contains logic to \"skip/catch-up\" past intervals relative to the provided `fromDate`. Because `fromDate` is \"Now\" (which is late), it skips the immediate next interval.

## Recommended Fix
To ensure strict sequential adherence (especially for \"Every X\" intervals), the next occurrence should be calculated relative to the **Scheduled Time of the Completed Occurrence**, not the **Processing Time**.

We should modify `services/reminder-scheduler.ts` to use `reminder.nextReminderDate` as the reference `fromDate`. This ensures that even if processing is delayed, the chain remains unbroken (e.g., 10:45 -> 10:46, even if calculated at 10:47).

## Code Changes

**File:** `/app/new-dominder/services/reminder-scheduler.ts`

**Location:** Inside `markReminderDone` function, around line 115.

**Change:**
Replace the `calculateNextReminderDate` call to use the previous scheduled date.

```typescript
// BEFORE
const nextDate = calculateNextReminderDate(calcContext as any, new Date());

// AFTER
// Use the scheduled time of the occurrence we just finished as the baseline.
// If missing (e.g. first run), fallback to now.
const referenceDate = reminder.nextReminderDate 
  ? new Date(reminder.nextReminderDate) 
  : new Date();

const nextDate = calculateNextReminderDate(calcContext as any, referenceDate);
```

**Note:** If `nextDate` returns a time that is still in the past (e.g., returns 10:46:00 while we are at 10:46:05), the Android `AlarmManager` will fire it immediately, allowing the system to \"catch up\" correctly instead of skipping.
"
Observation: Create successful: /app/new-dominder/FIX_ANALYSIS.md