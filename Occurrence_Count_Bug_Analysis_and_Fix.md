# Bug Analysis: "Every" Reminder Missing 3rd Occurrence

## Problem Statement

**Scenario:**
- Create reminder: "Every 1 minute", start at 2:00 PM, ends after **3 occurrences**, priority: **Ringer (high)**
- Expected: 3 total rings (2:00, 2:01, 2:02 or as adjusted by snooze)
- Actual flow with snooze:
  1. Rings at 2:00 PM (occurrence 1) → User presses **Snooze 5min**
  2. Rings at 2:05 PM (snoozed reminder) → User presses **Done** 
  3. Rings at 2:06 PM (occurrence 2) → User presses **Done**
  4. **Does NOT ring at 2:07 PM (occurrence 3)** ← **BUG**
  
After pressing Done at 2:06 PM, the reminder card is removed from Active Reminders and marked complete.

---

## GPT 5.2 Analysis Verification

### ✅ CONFIRMED: Root Cause #1 - Snoozed ring is not isolated from repeat logic

**GPT 5.2 Claim:** "Snoozed alarms as part of the repeat cycle, instead of a temporary override."

**Verification:** This is **PARTIALLY CORRECT**. Looking at the code:

#### File: `/app/services/reminder-scheduler.ts` (lines 98-119)

```typescript
export async function markReminderDone(reminderId: string, shouldIncrementOccurrence: boolean = true, triggerTimeMs?: number) {
  // ...
  
  // Check if this was a snoozed alarm completing
  const wasSnoozeCompletion = reminder.wasSnoozed === true;
  
  if (wasSnoozeCompletion) {
    console.log(`[Scheduler] Snoozed alarm completing for ${actualId}`);
    // Clear snooze state
    reminder.snoozeUntil = undefined;
    reminder.wasSnoozed = undefined;
  }
```

The code **does** check for `wasSnoozed` flag, but the issue is **WHERE** this check happens in the flow. The `shouldIncrementOccurrence` parameter is passed as `true` from `alarm.tsx` (line 88):

```typescript
// File: /app/app/alarm.tsx (line 88)
await svc.markReminderDone(reminderId, true);  // Always true from UI
```

This means **every Done press increments**, regardless of whether it was a snooze completion.

---

### ✅ CONFIRMED: Root Cause #2 - Done increments occurrence count unconditionally

**GPT 5.2 Claim:** "When you press Done, the app assumes a scheduled occurrence was completed and increments the occurrence counter."

**Verification:** **CORRECT**. 

#### File: `/app/services/reminder-scheduler.ts` (lines 170-175)

```typescript
// For native completions (shouldIncrementOccurrence=false), we DON'T increment here
// because native already did it. For JS completions, we DO increment.
const newOccurrenceCount = shouldIncrementOccurrence ? currentOccurred + 1 : currentOccurred;

console.log(`[Scheduler] currentOccurred=${currentOccurred}, shouldIncrement=${shouldIncrementOccurrence}, newOccurrenceCount=${newOccurrenceCount}`);
```

The problem is `shouldIncrementOccurrence` is **ALWAYS** passed as `true` from the alarm screen, even for snoozed alarms.

**What happens in the bug scenario:**

| Time | Event | `occurrenceCount` Before | Action | `occurrenceCount` After |
|------|-------|-------------------------|--------|------------------------|
| 2:00 | Scheduled ring | 0 | Snooze 5min | 0 (no change, snooze doesn't increment) |
| 2:05 | **Snoozed** ring fires | 0 | Done pressed | **1** (WRONG! Should stay 0 for snooze) |
| 2:06 | Scheduled ring (occurrence 2) | 1 | Done pressed | **2** |
| 2:07 | Scheduled ring (occurrence 3) | 2 | **NEVER SCHEDULED** | - |

The bug: At 2:05 PM, the snoozed reminder completion **incorrectly increments** the occurrence count from 0 to 1. The system then thinks:
- At 2:06 PM: `occurrenceCount = 1` → After Done: `occurrenceCount = 2`
- At 2:07 PM: `occurrenceCount = 2` → Checked against `untilCount = 3`
  
**BUT** the calculation in `calculateNextReminderDate` happens **BEFORE** incrementing in the Done flow:

#### File: `/app/services/reminder-scheduler.ts` (lines 178-183)

```typescript
// Create context for calculating next date with the new occurrence count
const calcContext = { ...reminder, occurrenceCount: newOccurrenceCount };

// Calculate next occurrence
const nextDate = calculateNextReminderDate(calcContext as any, new Date());
```

And in `calculateNextReminderDate`:

#### File: `/app/services/reminder-utils.ts` (lines 292-321)

```typescript
// Count-based end: stop if occurrenceCount has reached untilCount
if (reminder.untilType === 'count' && typeof reminder.untilCount === 'number') {
  const occurred = reminder.occurrenceCount ?? 0;
  if (occurred >= reminder.untilCount) {
    // ...
    console.log(`[calculateNextReminderDate] Count cap reached (${occurred}/${reminder.untilCount}), no next occurrence`);
    return null;
  }
}
```

So when `newOccurrenceCount = 3` is passed to `calculateNextReminderDate` with `untilCount = 3`:
- `occurred (3) >= untilCount (3)` → Returns `null` → Series ends

---

### ✅ CONFIRMED: Root Cause #3 - isCompleted triggers hard cancellation

**GPT 5.2 Claim:** "When Done is pressed at 2:06: App thinks max occurrences reached, cancels all future alarms"

**Verification:** **CORRECT**.

#### File: `/app/services/reminder-scheduler.ts` (lines 268-301)

```typescript
if (nextDate) {
  // More occurrences to come - update and reschedule
  // ...
} else {
  // Series ended - merge history into main reminder and mark complete
  console.log(`[Scheduler] Series ended for ${actualId}, marking as completed`);
  
  // ...
  
  const updated = {
    ...calcContext,
    isCompleted: true,
    isActive: false,
    // ...
  };
  await updateReminder(updated as any);
  await notificationService.cancelAllNotificationsForReminder(actualId);  // ← CANCELS ALL
```

When `calculateNextReminderDate` returns `null`, the code marks the reminder as completed and cancels ALL notifications.

---

## Summary: The Core Bug (Confirmed)

**GPT 5.2 was correct:** Snoozed executions are incorrectly counted as normal repeat occurrences, causing premature completion and cancellation.

### Occurrence Count Timeline (Buggy Behavior)

```
Time    | Event                  | occurrenceCount | Expected Count
--------|------------------------|-----------------|---------------
2:00 PM | Ring (occurrence 1)    | 0               | 0
2:00 PM | Snooze pressed         | 0               | 0
2:05 PM | Snoozed ring fires     | 0               | 0
2:05 PM | Done pressed           | 0 → 1 (BUG!)    | Should stay 0
2:06 PM | Ring (occurrence 2)    | 1               | 0
2:06 PM | Done pressed           | 1 → 2           | 0 → 1
2:07 PM | Ring (occurrence 3)    | 2               | 1
        | ...expected...         | 2 → 3           | 1 → 2
        | ...expected final...   | -               | 2 → 3, then complete
```

The actual count reaches 3 (which equals `untilCount`) after the Done at 2:06 PM because:
1. Snooze Done at 2:05 PM: 0 → 1
2. Regular Done at 2:06 PM: 1 → 2
3. Next calculation with count=2+1=3 exceeds limit

---

## Correct Behavior (What SHOULD Happen)

| Time | Event | occurrenceCount | Notes |
|------|-------|-----------------|-------|
| 2:00 | Ring | 0 | First scheduled occurrence |
| 2:05 | Snoozed ring | 0 | **NOT counted** - snooze is a "replay" |
| 2:05 | Done pressed | 0 → **1** | Completes original occurrence 1 |
| 2:06 | Ring | 1 | Second scheduled occurrence |
| 2:06 | Done pressed | 1 → **2** | Completes occurrence 2 |
| 2:07 | Ring | 2 | Third scheduled occurrence |
| 2:07 | Done pressed | 2 → **3** | Completes occurrence 3, series ends |

---

## Fix Strategy

### Fix 1: Add `isSnoozedInstance` Flag Detection

The key insight is that when a snoozed alarm fires and user presses Done, we should NOT increment the occurrence count because:
- The original scheduled occurrence was already "assigned" to the snoozed ring
- Snooze is just a delay of the same occurrence, not a new one

**However**, looking at the current code, there IS a `wasSnoozed` flag being checked:

#### File: `/app/services/reminder-scheduler.ts` (lines 112-119)

```typescript
// Check if this was a snoozed alarm completing
const wasSnoozeCompletion = reminder.wasSnoozed === true;

if (wasSnoozeCompletion) {
  console.log(`[Scheduler] Snoozed alarm completing for ${actualId}`);
  // Clear snooze state
  reminder.snoozeUntil = undefined;
  reminder.wasSnoozed = undefined;
}
```

The **bug** is that `wasSnoozeCompletion` is correctly detected but **not used** to prevent the occurrence increment.

### Fix 2: Block Occurrence Increment for Snoozed Completions

**Location:** `/app/services/reminder-scheduler.ts`

**Current Code (lines 170-175):**
```typescript
const newOccurrenceCount = shouldIncrementOccurrence ? currentOccurred + 1 : currentOccurred;
```

**Fix Required:**
```typescript
// DON'T increment for snoozed completions - snooze is just a delay of the same occurrence
const shouldActuallyIncrement = shouldIncrementOccurrence && !wasSnoozeCompletion;
const newOccurrenceCount = shouldActuallyIncrement ? currentOccurred + 1 : currentOccurred;

console.log(`[Scheduler] wasSnoozeCompletion=${wasSnoozeCompletion}, shouldActuallyIncrement=${shouldActuallyIncrement}`);
```

**Why this works:**
- When a scheduled occurrence fires and Done is pressed: `wasSnoozeCompletion=false`, increment happens
- When a snoozed occurrence fires and Done is pressed: `wasSnoozeCompletion=true`, NO increment
- The occurrence that was snoozed gets its increment when the snooze fires and Done is pressed for the NEXT scheduled occurrence

### Fix 3: Ensure `wasSnoozed` Flag is Set Correctly

**Location:** `/app/services/reminder-scheduler.ts` - `rescheduleReminderById` function (lines 8-53)

**Current Code (lines 24-30):**
```typescript
// Update reminder with snooze state
const updated = {
  ...reminder,
  snoozeUntil: snoozeEndDate.toISOString(),
  wasSnoozed: true,  // ← This IS being set correctly
  isActive: true
};
await updateReminder(updated);
```

The `wasSnoozed` flag IS being set when snooze is pressed. The issue is just the occurrence increment logic not using it.

---

## Complete Fix Implementation

### File: `/app/services/reminder-scheduler.ts`

**Line ~170 - Change from:**
```typescript
// For native completions (shouldIncrementOccurrence=false), we DON'T increment here
// because native already did it. For JS completions, we DO increment.
const newOccurrenceCount = shouldIncrementOccurrence ? currentOccurred + 1 : currentOccurred;
```

**To:**
```typescript
// For native completions (shouldIncrementOccurrence=false), we DON'T increment here
// because native already did it. For JS completions, we DO increment.
// CRITICAL: Don't increment for snoozed completions - snooze is just a delay of the same occurrence
const shouldActuallyIncrement = shouldIncrementOccurrence && !wasSnoozeCompletion;
const newOccurrenceCount = shouldActuallyIncrement ? currentOccurred + 1 : currentOccurred;

if (wasSnoozeCompletion) {
  console.log(`[Scheduler] Snoozed alarm completion detected - NOT incrementing occurrence count`);
}
```

---

## Additional Consideration: Snooze Chains

What if user snoozes multiple times before pressing Done?

**Scenario:**
1. 2:00 PM - Ring → Snooze 5min (`wasSnoozed=true`)
2. 2:05 PM - Snoozed ring → Snooze 5min again (`wasSnoozed` stays `true`)
3. 2:10 PM - Snoozed ring → Done pressed

This should still count as **1 occurrence** (the original 2:00 PM one).

**Current Code Check:** Looking at `rescheduleReminderById` (lines 24-30):
```typescript
const updated = {
  ...reminder,
  snoozeUntil: snoozeEndDate.toISOString(),
  wasSnoozed: true,
  isActive: true
};
```

The `wasSnoozed` flag is set to `true` regardless of whether it was already set. This is correct - it stays `true` through multiple snoozes.

---

## Testing Verification Steps

After implementing the fix, test the following scenarios:

### Test Case 1: Original Bug Scenario
1. Create reminder: Every 1 min, ends after 3 occurrences, Ringer mode
2. Let it ring at 2:00 PM → Press Snooze 5min
3. Ring at 2:05 PM → Press Done
4. **Verify**: Ring at 2:06 PM (occurrence 2)
5. Press Done at 2:06 PM
6. **Verify**: Ring at 2:07 PM (occurrence 3)
7. Press Done at 2:07 PM
8. **Verify**: Reminder marked complete, 3 occurrences logged

### Test Case 2: No Snooze
1. Create reminder: Every 1 min, ends after 3 occurrences
2. Done at 2:00 PM → Done at 2:01 PM → Done at 2:02 PM
3. **Verify**: 3 occurrences, marked complete

### Test Case 3: Multiple Snoozes
1. Create reminder: Every 1 min, ends after 2 occurrences
2. Ring at 2:00 PM → Snooze 5min
3. Ring at 2:05 PM → Snooze 5min again
4. Ring at 2:10 PM → Done
5. **Verify**: occurrenceCount = 1 (not 2 or 3)
6. Ring at 2:11 PM → Done
7. **Verify**: Complete with 2 occurrences

---

## Files to Modify

| File | Change |
|------|--------|
| `/app/services/reminder-scheduler.ts` | Line ~170: Add `!wasSnoozeCompletion` condition to increment logic |

---

## Summary

The GPT 5.2 analysis was **accurate**. The core bug is:

1. **Snooze completion incorrectly increments occurrence count**
2. This causes the series to reach its count limit prematurely
3. When limit is reached, `calculateNextReminderDate` returns `null`
4. This triggers `isCompleted = true` and cancels all future alarms

**The fix is simple:** Check the `wasSnoozeCompletion` flag (which is already being detected) and skip the occurrence increment when it's `true`.

**One-line fix concept:**
```typescript
// Before
const newOccurrenceCount = shouldIncrementOccurrence ? currentOccurred + 1 : currentOccurred;

// After  
const newOccurrenceCount = (shouldIncrementOccurrence && !wasSnoozeCompletion) ? currentOccurred + 1 : currentOccurred;
```
