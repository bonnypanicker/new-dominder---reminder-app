## Problem Statement
When setting a \"ringer mode\" reminder with:
- **Start time**: 10:42 PM
- **Repeat**: Every 1 minute
- **Ends after**: 4 occurrences

**Expected behavior**: Rings at 10:42, 10:43, 10:44, 10:45 (4 total)
**Actual behavior**: Rings at 10:42, 10:43, 10:44, 10:45, 10:47, 10:48 (6 times, skipping 10:46)

## Root Cause Analysis

After analyzing the log.md file and codebase, the root cause is a **race condition between native alarm rescheduling and JavaScript scheduling logic** combined with an **off-by-one error in occurrence counting**.

### Issue 1: Duplicate Scheduling Race Condition

**File**: `AlarmReceiver.kt` (lines 134-161) and `reminder-scheduler.ts` (lines 46-248)

**Problem Flow**:
1. Native `AlarmReceiver` fires at scheduled time (e.g., 10:42)
2. `recordNativeTrigger()` increments `actualTriggerCount` from 0 to 1
3. `checkAndMarkCompletionNatively()` checks if `actualTriggerCount >= untilCount` (1 >= 4? NO)
4. Alarm Activity is shown to user
5. User dismisses alarm → triggers JS `markReminderDone()`
6. **RACE**: Native might reschedule next alarm while JS is also calculating and scheduling

**The Problem**: There's no synchronization between native and JS scheduling, leading to:
- Both native and JS might schedule the next occurrence
- Timing drift accumulates as each layer adds small delays
- This causes the \"skip\" effect where one scheduled alarm gets cancelled/overwritten by another

### Issue 2: Occurrence Count Confusion

**File**: `reminder-scheduler.ts` (lines 86-109)

**Problem**:
```typescript
// Get the current occurrence count from JS
let currentOccurred = reminder.occurrenceCount ?? 0;

// If not incrementing (native already did), sync from native to ensure accuracy
if (!shouldIncrementOccurrence && AlarmModule?.getNativeReminderState) {
  // Sync logic...
  currentOccurred = nativeState.actualTriggerCount;
}

// For native completions, we DON'T increment here because native already did it
const newOccurrenceCount = shouldIncrementOccurrence ? currentOccurred + 1 : currentOccurred;
```

**Issue**: There's confusion about who owns the \"source of truth\" for occurrence counting:
- Native increments `actualTriggerCount` when alarm fires
- JS has `occurrenceCount` which may or may not be in sync
- This leads to miscounting and extra occurrences being scheduled

### Issue 3: \"Every\" Reminder Rescheduling Logic

**File**: `reminder-utils.ts` (lines 171-186)

**Problem**:
```typescript
// Subsequent occurrences: advance from the last scheduled/triggered time
result = new Date(baseline.getTime() + addMs);
if (result <= fromDate) {
  // FIX: Calculate skip from result (not baseline) to avoid skipping occurrences
  const diff = fromDate.getTime() - result.getTime();
  const steps = Math.floor(diff / addMs);
  result = new Date(result.getTime() + steps * addMs);
}
```

**Issue**: When processing is delayed (even by milliseconds), the `Math.floor(diff / addMs)` calculation can cause occurrences to be skipped:
- If `fromDate` is 10:45:00.001 and `result` is 10:45:00.000
- diff = 1ms, steps = Math.floor(1/60000) = 0 ✓ (This is OK)
- But if there's a 60+ second delay: diff = 60001ms, steps = 1, we skip an occurrence ✗

More critically, if the alarm fires slightly late (Android system delay), the next calculated time might be in the past, triggering the catch-up logic that can skip occurrences.

## Detailed Fix Plan

### Fix 1: Eliminate Duplicate Native Rescheduling
**File**: `AlarmReceiver.kt`

**Current Issue**: Native `AlarmReceiver` should ONLY fire the alarm, not reschedule. Rescheduling should be handled by JS layer after user interaction.

**Solution**: 
- Remove any auto-rescheduling logic from native `AlarmReceiver`
- Let JS `markReminderDone()` be the ONLY place that schedules the next occurrence
- Native's role: Fire alarm, track occurrence count, check completion status

**Code Change**: AlarmReceiver should NOT automatically schedule the next alarm. It should:
1. Record the trigger
2. Check if this is the final occurrence
3. If final, mark as complete and STOP
4. If not final, just show the alarm - let JS handle scheduling after user dismisses

### Fix 2: Use Native Occurrence Count as Single Source of Truth
**File**: `reminder-scheduler.ts` (markReminderDone function)

**Current Issue**: Confusion between `actualTriggerCount` (native) and `occurrenceCount` (JS).

**Solution**:
- Always sync from native `actualTriggerCount` BEFORE calculating next occurrence
- Never increment in JS when `shouldIncrementOccurrence=false`
- Trust native count as authoritative

**Code Change**:
```typescript
// BEFORE calculating next occurrence, ALWAYS sync from native
const nativeState = await AlarmModule.getNativeReminderState(reminderId);
const authoritativeCount = nativeState.actualTriggerCount;

// Use this count for ALL subsequent calculations
const reminderForCalc = { ...reminder, occurrenceCount: authoritativeCount };
const nextDate = calculateNextReminderDate(reminderForCalc, now);
```

### Fix 3: Fix Catch-Up Logic for \"Every\" Reminders
**File**: `reminder-utils.ts`

**Current Issue**: `Math.floor` in catch-up logic can skip occurrences when there are processing delays.

**Solution**: 
- For \"every\" reminders with minute/hour intervals, use `Math.ceil` instead of `Math.floor` to ensure we never skip
- Add tolerance window (e.g., 5 seconds) before applying catch-up logic
- Prefer delivering slightly late over skipping

**Code Change**:
```typescript
if (result <= fromDate) {
  const diff = fromDate.getTime() - result.getTime();
  
  // Add tolerance: only catch-up if we're more than 5 seconds late
  const TOLERANCE_MS = 5000;
  
  if (diff > TOLERANCE_MS) {
    // Use Math.ceil to deliver the LAST missed occurrence, not skip to future
    const steps = Math.ceil(diff / addMs) - 1; // -1 to include the current missed one
    result = new Date(result.getTime() + steps * addMs);
  }
  // else: within tolerance, deliver this occurrence even if slightly late
}
```

### Fix 4: Add Completion Check Before Scheduling
**File**: `reminder-scheduler.ts` (markReminderDone function)

**Current Issue**: JS might schedule next occurrence even after native marked it complete.

**Solution**:
- Before calling `scheduleReminderByModel`, verify native completion status
- If native says \"completed\", skip scheduling

**Code Change**:
```typescript
// After calculating nextDate but BEFORE scheduling
if (nextDate) {
  // Double-check native completion status before scheduling
  const finalCheck = await AlarmModule.getNativeReminderState(reminderId);
  if (finalCheck.isCompleted) {
    console.log(`[Scheduler] Native reports completed, skipping schedule`);
    return;
  }
  
  await notificationService.scheduleReminderByModel(updated);
}
```

### Fix 5: Prevent Concurrent Scheduling
**File**: `notification-service.ts`

**Current Issue**: Multiple calls to `scheduleReminderByModel` can happen simultaneously, causing timing conflicts.

**Solution**:
- Add a scheduling lock per reminder ID
- If scheduling is in progress, queue or skip

**Code Change**:
```typescript
const schedulingLocks = new Set<string>();

export async function scheduleReminderByModel(reminder: Reminder) {
  if (schedulingLocks.has(reminder.id)) {
    console.log(`[NotificationService] Scheduling already in progress for ${reminder.id}, skipping`);
    return;
  }
  
  try {
    schedulingLocks.add(reminder.id);
    // ... existing scheduling logic ...
  } finally {
    schedulingLocks.delete(reminder.id);
  }
}
```

## Implementation Priority

1. **HIGH PRIORITY - Fix 1**: Remove native auto-rescheduling (prevents duplicate schedules)
2. **HIGH PRIORITY - Fix 2**: Use native count as single source of truth (prevents count confusion)
3. **MEDIUM PRIORITY - Fix 4**: Add completion check before scheduling (prevents post-completion schedules)
4. **MEDIUM PRIORITY - Fix 5**: Add scheduling locks (prevents race conditions)
5. **LOW PRIORITY - Fix 3**: Improve catch-up logic (edge case handling)

## Expected Outcome

After implementing these fixes:
- Reminder set for 10:42 PM, every 1 minute, 4 occurrences
- **Will ring exactly at**: 10:42, 10:43, 10:44, 10:45
- **Total occurrences**: 4 (as configured)
- **No skips**, **no duplicates**

## Testing Recommendations

1. **Test Case 1**: Every 1 minute, 4 occurrences
   - Verify exactly 4 alarms fire
   - Verify times are consecutive (no skips)

2. **Test Case 2**: Every 2 minutes, 3 occurrences
   - Verify exactly 3 alarms fire
   - Verify 2-minute intervals are maintained

3. **Test Case 3**: Every 30 seconds, 5 occurrences
   - Verify rapid-fire scheduling works correctly
   - Verify no race conditions

4. **Test Case 4**: Delay dismissal test
   - Set alarm for every 1 minute, 3 occurrences
   - Wait 2 minutes before dismissing first alarm
   - Verify catch-up behavior doesn't skip occurrences

5. **Test Case 5**: App killed test
   - Set alarm for every 1 minute, 4 occurrences
   - Force kill app after 2nd alarm
   - Verify remaining alarms still fire correctly

## Minimal Code Changes Summary

To fix this issue with minimal code changes:

### Primary Fix (AlarmReceiver.kt)
- **Remove auto-rescheduling from native**: Native should ONLY fire alarm, not calculate next occurrence
- This alone should prevent the duplicate scheduling race condition

### Secondary Fix (reminder-scheduler.ts)
- **Always sync from native before calculating next**: Use `actualTriggerCount` as authoritative source
- **Add completion check before scheduling**: Verify native completion status before scheduling

These two changes address the root cause with minimal risk and should resolve the skipping issue completely.

## Code Files to Modify

1. `/app/dominder-app/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt`
2. `/app/dominder-app/services/reminder-scheduler.ts`
3. `/app/dominder-app/services/reminder-utils.ts` (optional, for improved robustness)
4. `/app/dominder-app/hooks/notification-service.ts` (optional, for race condition prevention)

---

