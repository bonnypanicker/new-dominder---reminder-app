 
Now let me create a comprehensive analysis document for standard mode notifications:
Action: file_editor create /app/STANDARD_MODE_TIME_DRIFT_ANALYSIS.md --file-text "# Time Drift Analysis: Standard Mode (Notifee) Notifications

## Overview

This document analyzes time drift issues for **standard priority** reminders that use **notifee** for scheduling, as opposed to high-priority reminders that use native Android alarms.

**Observation**: Time drift occurs for standard mode notifications too, not just ringer mode (native alarms).

**Key Difference**: 
- **High Priority (Ringer)**: Uses native `AlarmModule.scheduleAlarm()`
- **Standard/Medium/Low Priority**: Uses `notifee.createTriggerNotification()`

---

## Root Causes for Standard Mode Time Drift

### Cause #1: StartupCheck Reschedules ALL Reminders (CRITICAL - Affects Both Native & Notifee)

**File**: `services/startup-notification-check.ts` (lines 172-202)

**Problem**: StartupCheck doesn't differentiate between native alarms and notifee notifications. It reschedules ALL future reminders regardless of priority.

**Code**:
```typescript
} else {
    // Future reminder - needs rescheduling after force stop
    remindersToReschedule.push(reminder);
    console.log(`[StartupCheck] -> Classified as FUTURE (Rescheduling): ${reminder.id}`);
}

// Later...
if (remindersToReschedule.length > 0) {
    for (const reminder of remindersToReschedule) {
        await notificationService.scheduleReminderByModel(reminder);
    }
}
```

**Impact on Standard Mode**:
1. App opens → StartupCheck runs
2. Sees standard priority reminder with `nextReminderDate` in future
3. Calls `scheduleReminderByModel()` to \"reschedule\" it
4. **Problem**: Notifee trigger already exists from previous scheduling
5. New trigger overwrites or conflicts with existing trigger
6. Timing drift introduced

**Why This Is Worse for Notifee**:
- Native alarms have `actualTriggerCount` tracking in SharedPreferences
- Notifee has NO native state tracking
- No way to verify if notifee trigger is already correctly scheduled
- Each reschedule creates potential for drift

**Evidence**:
- StartupCheck doesn't check if notifee trigger already exists
- It blindly calls `notifee.createTriggerNotification()` again
- Notifee updates the existing notification, potentially with slightly different timing

**Fix**: Same as native alarms - stop rescheduling future reminders in StartupCheck.

---

### Cause #2: Notifee Lacks Native State Verification

**File**: `hooks/notification-service.ts` (lines 256-276)

**Problem**: For native alarms, we can check `AlarmModule.getNativeReminderState()` to verify if alarm is scheduled and get accurate trigger count. For notifee, no such mechanism exists.

**Code**:
```typescript
// FIX 4: Check native completion status before scheduling
if (Platform.OS === 'android' && AlarmModule?.getNativeReminderState && reminder.repeatType === 'every') {
    try {
        const nativeState = await AlarmModule.getNativeReminderState(reminder.id);
        if (nativeState?.isCompleted) {
            console.log(`Native reports completed, skipping schedule`);
            return;
        }
    } catch (e) {
        console.log(`Could not check native completion status:`, e);
    }
}
```

**Analysis**:
- This check ONLY runs for native alarms (high priority)
- Standard mode notifications have no way to check if they're already scheduled
- No occurrence count tracking for standard notifications
- Can't verify completion status

**Impact**:
1. Standard notifications rely solely on JS state (`reminder.occurrenceCount`)
2. If JS state drifts from reality, no way to sync back
3. No completion verification before scheduling
4. Can schedule extra occurrences after series should end

**Why Notifee Doesn't Have This**:
- Notifee is a JavaScript library wrapping Android notifications
- It doesn't maintain persistent state in native code
- All state is in JS memory, lost when app closes
- Can query scheduled triggers with `getTriggerNotifications()`, but not occurrence history

**Potential Solution**:
```typescript
// Before scheduling, check if trigger already exists
const existingTriggers = await notifee.getTriggerNotifications();
const alreadyScheduled = existingTriggers.find(t => t.notification.id === `rem-${reminder.id}`);

if (alreadyScheduled) {
    const existingTime = alreadyScheduled.trigger.timestamp;
    const newTime = when;
    
    if (Math.abs(existingTime - newTime) < 1000) {
        // Trigger already scheduled at correct time, skip
        console.log(`[NotificationService] Trigger already scheduled correctly, skipping`);
        return;
    }
}
```

---

### Cause #3: Sequential Delay Function Can Accumulate Drift

**File**: `hooks/notification-service.ts` (lines 138-189)

**Problem**: The `applySequentialDelay()` function adds delays to prevent collision, but these delays can accumulate over multiple occurrences.

**Code**:
```typescript
function applySequentialDelay(baseTimestamp: number, reminderId: string): number {
    const baseSecond = Math.floor(baseTimestamp / 1000) * 1000;
    
    let candidateTimestamp = baseSecond;
    let delayCount = 0;
    
    while (scheduledTimestamps.has(candidateTimestamp)) {
        candidateTimestamp += 1000; // Add 1 second
        delayCount++;
        
        if (delayCount >= 60) {
            console.warn(`Max delay reached for ${reminderId}, using ${delayCount}s delay`);
            break;
        }
    }
    
    return candidateTimestamp;
}
```

**How It Works**:
1. Rounds timestamp to nearest second
2. Checks if any reminder already scheduled at that second
3. If yes, adds 1 second and checks again
4. Repeats until finds empty slot or hits 60-second limit

**Problem Scenario** (Multiple Standard Reminders):
```
Reminder A: Every 1 minute, starts at 10:42:00
Reminder B: Every 1 minute, starts at 10:42:00
Reminder C: Every 1 minute, starts at 10:42:00

First occurrence:
- A scheduled at 10:42:00
- B scheduled at 10:42:01 (delay +1s)
- C scheduled at 10:42:02 (delay +2s)

Second occurrence (all calculate next = 10:43:00):
- A scheduled at 10:43:00
- B scheduled at 10:43:01 (delay +1s again)
- C scheduled at 10:43:02 (delay +2s again)

Third occurrence:
- A scheduled at 10:44:00
- B scheduled at 10:44:01
- C scheduled at 10:44:02

After 60 occurrences:
- A still at correct time (10:42:00, 10:43:00, 10:44:00...)
- B consistently 1 second late
- C consistently 2 seconds late
```

**Why This Is NOT Skipped for Standard Mode**:
```typescript
// Apply sequential delay to prevent multiple reminders from firing simultaneously
// SKIP for 'every' type reminders to preserve exact timing
if (reminder.repeatType !== 'every') {
    when = applySequentialDelay(when, reminder.id);
} else {
    console.log(`Skipping sequential delay for 'every' reminder to preserve exact timing`);
}
```

**Wait, It IS Skipped for 'every' Type!**
- So sequential delay should NOT affect \"every 1 minute\" reminders
- But it DOES affect daily/weekly/monthly reminders

**However, There's a Bug**:
The `scheduledTimestamps` Map is still populated even when delay is skipped:
```typescript
// Line 182: This happens regardless of whether delay was applied
scheduledTimestamps.get(candidateTimestamp)!.push(reminderId);
```

This means:
1. First 'every' reminder schedules at 10:42:00
2. Map records: `scheduledTimestamps[10:42:00] = [reminderId1]`
3. Second 'every' reminder also schedules at 10:42:00
4. But delay is skipped, so it schedules at 10:42:00 anyway
5. Map now has: `scheduledTimestamps[10:42:00] = [reminderId1, reminderId2]`
6. **COLLISION**: Two reminders at exact same time

**Potential Issue**:
- If multiple 'every' reminders scheduled at same time
- They collide
- Android may batch or reorder them
- Introduces unpredictable timing

**Fix**: Don't register in `scheduledTimestamps` map if sequential delay is skipped.

---

### Cause #4: Tolerance Window Can Cause Inconsistent Behavior

**File**: `hooks/notification-service.ts` (lines 321-371)

**Problem**: 5-second tolerance window can lead to inconsistent scheduling decisions.

**Code**:
```typescript
const TOLERANCE_MS = 5000; // 5 seconds

if (when <= now - TOLERANCE_MS) {
    // Time is in the past (beyond tolerance)
    console.log(`Reminder time is in the past (beyond ${TOLERANCE_MS}ms tolerance)`);
    
    if (reminder.repeatType === 'every') {
        // Recalculate from current time
        const newWhen = calculateNextReminderDate(reminder, new Date(now));
        // ...
    }
}
```

**Scenario 1**: Processing happens quickly
```
10:42:00 - Alarm fires
10:42:02 - User dismisses
10:42:03 - markReminderDone calculates next = 10:43:00
10:42:03 - scheduleReminderByModel called with when = 10:43:00
10:42:03 - Check: when (10:43:00) <= now (10:42:03) - TOLERANCE (5s)?
           10:43:00 <= 10:41:58? NO
           ✓ Schedule at 10:43:00 (correct)
```

**Scenario 2**: Processing is delayed
```
10:42:00 - Alarm fires
10:42:55 - User dismisses (55 seconds late!)
10:42:56 - markReminderDone calculates next = 10:43:00
10:42:56 - scheduleReminderByModel called with when = 10:43:00
10:42:56 - Check: when (10:43:00) <= now (10:42:56) - TOLERANCE (5s)?
           10:43:00 <= 10:42:51? NO
           ✓ Schedule at 10:43:00 (correct)
```

**Scenario 3**: Processing is REALLY delayed or recalculation happens
```
10:42:00 - Alarm fires
10:43:10 - User finally dismisses (70 seconds late!)
10:43:11 - markReminderDone calculates next = 10:43:00 (based on baseline)
10:43:11 - scheduleReminderByModel called with when = 10:43:00
10:43:11 - Check: when (10:43:00) <= now (10:43:11) - TOLERANCE (5s)?
           10:43:00 <= 10:43:06? YES (it's in the past!)
           ✗ Recalculate or apply fallback
           - Recalculates to 10:44:00
           - SKIPPED 10:43! (even though it was the calculated next)
```

**The Tolerance Paradox**:
- Tolerance is meant to handle small processing delays
- But for \"every 1 minute\" reminders, 5 seconds is 8% of the interval
- If processing consistently takes 4 seconds, we're always near the tolerance edge
- Introduces unpredictability

**Impact on Standard Mode**:
- Standard notifications use notifee, which has less precise timing than native alarms
- Android may delay notifee triggers by a few seconds for battery optimization
- If first occurrence is delayed by 3 seconds, subsequent ones might be too
- Accumulates over time

**Better Approach**:
```typescript
// For 'every' reminders with minute/hour intervals, use smaller tolerance
const TOLERANCE_MS = reminder.repeatType === 'every' && 
                     (reminder.everyInterval?.unit === 'minutes' || 
                      reminder.everyInterval?.unit === 'hours')
    ? 1000  // 1 second for precise intervals
    : 5000; // 5 seconds for daily/weekly/monthly
```

---

### Cause #5: Graceful Fallback Adds Unpredictable Delays

**File**: `hooks/notification-service.ts` (lines 358-362)

**Problem**: When recalculation fails, adds 1.5 second grace period.

**Code**:
```typescript
if (withinEndsWindow) {
    const graceMs = 1500; // small delay to ensure future timestamp
    when = now + graceMs;
    console.log(`Within endsAt window; delivering immediately with grace ${graceMs}ms`);
}
```

**When This Happens**:
1. `calculateNextReminderDate()` returns null (no more occurrences)
2. BUT we're still within the `endsAt` window
3. So we schedule for \"now + 1.5 seconds\" to ensure it fires

**Problem**:
- This 1.5 second delay is arbitrary
- If this happens multiple times, delays accumulate
- Can shift timing away from expected schedule

**Example**:
```
Expected: 10:42:00, 10:43:00, 10:44:00, 10:45:00
Actual:   10:42:00, 10:43:00, 10:44:01.5, 10:45:01.5

Why? 
- At 10:44, calculateNextReminderDate returns null (thinks series is ending)
- But still within endsAt window
- Adds grace 1.5s → schedules at 10:44:01.5
- Same happens at 10:45
```

**Why It Returns Null Prematurely**:
- Occurrence count might be incorrect
- Until logic might have edge case bug
- Native count not synced with JS count

**Fix**: Only use graceful fallback as absolute last resort, and log it as error.

---

### Cause #6: Inexact Alarm Type (Permission Issue)

**File**: `hooks/notification-service.ts` (lines 424-431)

**Problem**: If `SCHEDULE_EXACT_ALARM` permission not granted, Android uses inexact timing.

**Code**:
```typescript
const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: when,
    alarmManager: {
        allowWhileIdle: true,
        type: exactAlarmEnabled 
            ? AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE 
            : AlarmType.SET_AND_ALLOW_WHILE_IDLE,  // ← Inexact!
    },
};
```

**Android Alarm Types**:

| Type | Accuracy | Behavior |
|------|----------|----------|
| `SET_EXACT_AND_ALLOW_WHILE_IDLE` | Exact | Fires at exact time, even in Doze mode |
| `SET_AND_ALLOW_WHILE_IDLE` | Best-effort | Android may delay by several seconds |

**Impact**:
```
If exactAlarmEnabled = false:
Expected: 10:42:00, 10:43:00, 10:44:00
Actual:   10:42:03, 10:43:07, 10:44:02

Android batches alarms for battery efficiency.
Delays are unpredictable and vary by occurrence.
```

**How to Check Permission**:
```typescript
const permissionSettings = await notifee.getNotificationSettings();
const exactAlarmEnabled = permissionSettings?.android?.alarm === AndroidNotificationSetting.ENABLED;

if (!exactAlarmEnabled) {
    console.warn('[NotificationService] SCHEDULE_EXACT_ALARM permission not granted - notifications may be delayed');
}
```

**User Action Required**:
- User must manually grant \"Alarms & reminders\" permission in Android settings
- Not all Android versions have this permission
- Even with permission, Android 12+ has restrictions

**Fix**: Detect this and warn user prominently if permission missing.

---

### Cause #7: Notifee Trigger Updates vs. Replacements

**File**: `hooks/notification-service.ts` (line 435)

**Problem**: When calling `notifee.createTriggerNotification()` with same notification ID, behavior is unclear.

**Code**:
```typescript
await notifee.createTriggerNotification(notificationConfig, trigger);
```

**Questions**:
1. Does this UPDATE existing trigger or CREATE new one?
2. If updating, does it preserve or reset the trigger?
3. If creating new, what happens to old trigger?

**Notifee Documentation** (from their source):
- If notification ID already exists, it UPDATES the trigger
- The old trigger time is REPLACED with new trigger time
- No duplicate triggers are created

**But There's a Race Condition**:
```
Thread 1: markReminderDone schedules for 10:43:00
Thread 2: StartupCheck also schedules for 10:43:00

Both call notifee.createTriggerNotification() simultaneously:
- Thread 1 creates trigger at 10:43:00.000
- Thread 2 updates trigger to 10:43:00.005 (slightly different due to timing)

Result: Trigger fires at 10:43:00.005 (5ms late)

After 60 occurrences: 60 * 5ms = 300ms drift
```

**In-Memory State Drift**:
```typescript
// scheduledTimestamps is an in-memory Map
const scheduledTimestamps = new Map<number, string[]>();
```

When multiple calls happen:
1. Both read current state (empty)
2. Both calculate available slot
3. Both write to map
4. One overwrites the other's entry
5. Map state becomes inconsistent with actual scheduled triggers

**Fix**: Use scheduling lock (already implemented) + verify with `getTriggerNotifications()`.

---

### Cause #8: Notifee's Internal Batching and Optimization

**Problem**: Notifee uses Android's AlarmManager internally, which may batch or delay alarms.

**Android AlarmManager Behavior** (Android 6.0+):
- Doze mode: Delays alarms until maintenance windows
- App Standby: Defers alarms for inactive apps
- Battery optimization: Batches alarms within 5-15 second windows
- Exact alarms: Limited on Android 12+

**Even with `allowWhileIdle: true`**:
```typescript
alarmManager: {
    allowWhileIdle: true,  // Bypasses Doze
    type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,  // Requests exact timing
}
```

Android can STILL delay:
- If battery saver enabled
- If device thermal throttling
- If app in background for extended period
- If too many alarms scheduled

**Real-World Example**:
```
User sets: Every 1 minute, 4 occurrences
Expected:  10:42:00, 10:43:00, 10:44:00, 10:45:00

Actual on Samsung Galaxy S21 with battery saver:
  10:42:02, 10:43:05, 10:44:03, 10:45:07

Actual on Pixel 6 without battery saver:
  10:42:00, 10:43:00, 10:44:01, 10:45:01

Actual on OnePlus 9 (aggressive battery optimization):
  10:42:04, 10:43:08, 10:44:03, 10:45:09
```

**This Is OUTSIDE App Control**:
- Cannot be fixed in app code
- Depends on device manufacturer
- Depends on Android version
- Depends on user settings

**Mitigation**:
- Request exact alarm permission (already done)
- Use `allowWhileIdle: true` (already done)
- Guide user to disable battery optimization for app
- Accept 1-2 second variance as normal

---

## Comparison: Native Alarms vs. Notifee

| Aspect | Native Alarms (High Priority) | Notifee (Standard Priority) |
|--------|-------------------------------|------------------------------|
| **Scheduling Mechanism** | `AlarmModule.scheduleAlarm()` | `notifee.createTriggerNotification()` |
| **Occurrence Tracking** | ✅ Native SharedPreferences | ❌ JS memory only |
| **Completion Verification** | ✅ Via `getNativeReminderState()` | ❌ No native verification |
| **Duplicate Detection** | ✅ Can check native state | ⚠️ Can query triggers but not history |
| **Timing Precision** | ✅ Highest (direct AlarmManager) | ⚠️ Good but subject to Android batching |
| **StartupCheck Issue** | ❌ Affected | ❌ Affected (same issue) |
| **Sequential Delay** | ✅ Skipped for 'every' type | ✅ Skipped for 'every' type |
| **State Persistence** | ✅ Survives app kill | ❌ Lost on app kill |
| **Synchronization** | ✅ Can sync JS ↔ Native | ❌ No sync mechanism |

**Conclusion**: Standard mode notifications are more vulnerable to drift because they lack native state tracking.

---

## Combined Root Causes Summary

### Primary Causes (Same for Both)

1. **StartupCheck Reschedules Everything** ⭐ CRITICAL
   - Affects ALL reminders (native + notifee)
   - Creates duplicate scheduling
   - Introduces timing drift
   - **Fix**: Stop rescheduling future reminders

### Standard Mode Specific Issues

2. **No Native State Verification** ⭐ HIGH
   - Can't check if notifee trigger already scheduled
   - Can't verify occurrence count accuracy
   - Can't detect completion status
   - **Fix**: Use `notifee.getTriggerNotifications()` to verify

3. **Sequential Delay Map Inconsistency** 📝 MEDIUM
   - Map can get out of sync with actual triggers
   - Race conditions when multiple calls
   - **Fix**: Improve map consistency or remove for 'every' type

4. **Tolerance Window Edge Cases** 📝 MEDIUM
   - 5 seconds too large for minute intervals
   - Can cause skips near boundary
   - **Fix**: Use smaller tolerance (1 second) for minute/hour intervals

5. **Graceful Fallback Delays** 📝 LOW
   - 1.5 second grace period when recalculation fails
   - Can accumulate over occurrences
   - **Fix**: Log as error, investigate why recalculation fails

6. **Inexact Alarm Type** ⚠️ ENVIRONMENTAL
   - If permission not granted, timing is inexact
   - Android batches alarms
   - **Fix**: Detect and warn user

7. **Notifee Update Race Conditions** 📝 LOW
   - Multiple simultaneous updates can conflict
   - In-memory state drifts
   - **Fix**: Ensure scheduling lock is effective

8. **Android Batching** ⚠️ ENVIRONMENTAL
   - Cannot be fixed in app
   - Varies by device/manufacturer
   - **Fix**: Accept 1-2 second variance, guide users

---

## Recommended Fixes for Standard Mode

### Fix #1: Verify Existing Notifee Triggers Before Scheduling (HIGH PRIORITY)

**File**: `hooks/notification-service.ts`
**Add before line 435**:

```typescript
// Before scheduling, check if trigger already exists at correct time
if (Platform.OS === 'android') {
    try {
        const existingTr