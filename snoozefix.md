# Bug Analysis: False "Missed Ringer Reminder" Notification After Snooze

## Problem

When a "ringer mode" (high priority) reminder is set with `repeatType: 'every'` (e.g., every 1 minute from 2:00pm to 2:10pm):

1. Alarm fires at 2:00pm -> User presses **Snooze 5min**
2. Alarm fires at 2:05pm (snooze alarm) -> User presses **Done**
3. User opens the app -> **Incorrectly sees "You missed a Ringer reminder"** notification
4. Subsequent alarms at 2:06, 2:07 etc. continue normally

The user **did not miss** the reminder -- they actively snoozed and completed it. The "missed" notification is a false positive.

---

## Root Cause

The bug is a **race condition** between two independent startup routines, combined with a **missing check** in the startup notification logic.

### The Two Startup Routines

When the app opens (or restarts after being killed), two async operations kick off **concurrently** in `app/_layout.tsx`:

| Hook / Effect | What it does | Defined at |
|---|---|---|
| `useCompletedAlarmSync()` | Polls `DoMinderAlarmActions` SharedPreferences for `completed_<id>` and `snoozed_<id>` entries, then calls `markReminderDone()` / `rescheduleReminderByIdAt()` to sync JS state | `_layout.tsx` line ~90 |
| `checkAndTriggerPendingNotifications()` | Reads reminders from AsyncStorage, compares scheduled times to `now`, and classifies overdue ringer reminders as **MISSED** (>5 min late) or **OVERDUE** (<5 min late) | `_layout.tsx` line ~384 |

**There is no ordering guarantee between them.** Both start in separate `useEffect` hooks after the first render.

### What Happens When the App Was Killed During the Alarm Cycle

This is the primary scenario. Native alarms fire and the user interacts with the native `AlarmActivity`, but the React Native JS context is dead.

#### Timeline

```
2:00pm  AlarmReceiver fires
          -> recordNativeTrigger() increments actualTriggerCount to 1
          -> Shows native AlarmActivity

        User presses Snooze 5min on native AlarmActivity
          -> AlarmActivity saves snoozed_<id> to DoMinderAlarmActions SharedPrefs
          -> ALARM_SNOOZE broadcast -> AlarmActionBridge:
               - Rolls back actualTriggerCount to 0
               - Sets meta_<id>_snoozeUntil and meta_<id>_wasSnoozed
               - Schedules native alarm at 2:05pm (isSnooze=true)
               - Emits alarmSnooze to JS -> FAILS (no React context)
          -> JS state in AsyncStorage is NOT updated (app killed)

2:05pm  AlarmReceiver fires (snooze alarm)
          -> Detects wasSnoozed=true, clears snooze flags
          -> Clears snoozed_<id> from DoMinderAlarmActions
          -> recordNativeTrigger() increments actualTriggerCount to 1
          -> Shows native AlarmActivity

        User presses Done
          -> AlarmActivity saves completed_<id> to DoMinderAlarmActions SharedPrefs
          -> ALARM_DONE broadcast -> AlarmActionBridge:
               - Emits alarmDone to JS -> FAILS (no React context)
               - Calls scheduleNextOccurrenceIfNeeded() -> schedules 2:06pm natively

~2:06pm User opens the app (fresh React Native start)
```

#### The Race on App Open

Both effects start concurrently:

**Path A: `useCompletedAlarmSync`** (reads `completed_<id>` -> calls `markReminderDone` -> updates AsyncStorage with `nextReminderDate: 2:06pm`)

**Path B: `checkAndTriggerPendingNotifications`** (reads reminders from AsyncStorage -> computes scheduled time -> classifies)

**If Path B executes its per-reminder check BEFORE Path A finishes updating AsyncStorage:**

1. The JS/AsyncStorage state is **stale** (from before the app was killed)
2. `snoozeUntil` is NOT set in JS (the snooze event was never processed by JS)
3. `nextReminderDate` is the **original** value (e.g., `2:00pm`) or not set at all
4. The startup check falls back to computing `scheduledTime` from `reminder.date` + `reminder.time` = **2:00pm**

```
scheduledTime = 2:00pm
now           = ~2:06pm
timeDiff      = ~6 minutes = 360,000ms
missedThreshold = 5 * 60 * 1000 = 300,000ms

timeDiff > missedThreshold --> TRUE --> CLASSIFIED AS "MISSED RINGER"
```

5. `showExpiredRingerNotifications()` is called -> displays **"You missed a Ringer reminder"**

### The Missing Check

**`checkAndTriggerPendingNotifications()` in `startup-notification-check.ts` does NOT check for pending completed alarms.**

It checks:
- Pending snoozes via `AlarmModule.getSnoozedAlarms()` (from `DoMinderAlarmActions`)
- Native meta snooze via `nativeStates[id].snoozeUntil` (from `DoMinderReminderMeta`)

It does **NOT** check:
- Pending completions via `AlarmModule.getCompletedAlarms()` (from `DoMinderAlarmActions`)

By the time the user opens the app after the snooze->done cycle:
- The `snoozed_<id>` entry was **already cleared** by `AlarmReceiver` when the snooze alarm fired at 2:05pm
- The `meta_<id>_snoozeUntil` was **already cleared** by `AlarmReceiver`
- Only `completed_<id>` exists in `DoMinderAlarmActions` -- but the startup check doesn't look for it

So the startup check has no way to know the alarm was actively handled.

---

## Affected Code Locations

| File | Lines | Issue |
|---|---|---|
| `services/startup-notification-check.ts` | ~137-224 | Does not check `getCompletedAlarms()` before classifying reminders. Uses stale JS state. |
| `services/startup-notification-check.ts` | ~205-224 | Classification logic: `timeDiff > missedThreshold` for ringer -> "MISSED RINGER" based on potentially stale `scheduledTime` |
| `app/_layout.tsx` | ~90, ~384 | `useCompletedAlarmSync()` and `checkAndTriggerPendingNotifications()` run concurrently with no ordering |

---

## Proposed Fix (Native Plugin: `plugins/with-alarm-module.js`)

Since the native plugin code is where the fix needs to happen, here are the approaches:

### Fix 1: Check Completed Alarms in Startup Check (Recommended)

In `startup-notification-check.ts`, before the per-reminder classification loop, fetch pending completed alarms and skip those reminders:

```typescript
// In checkAndTriggerPendingNotifications(), after fetching pendingSnoozes:

let pendingCompletions: Record<string, string> = {};
if (AlarmModule && AlarmModule.getCompletedAlarms) {
    try {
        pendingCompletions = await AlarmModule.getCompletedAlarms();
        if (Object.keys(pendingCompletions).length > 0) {
            console.log('[StartupCheck] Found pending completions:', 
                        Object.keys(pendingCompletions));
        }
    } catch (e) {
        console.log('[StartupCheck] Could not get completed alarms:', e);
    }
}

// Then inside the for-loop, add this check after the displayedIds check:
if (pendingCompletions[reminder.id]) {
    console.log(`[StartupCheck] Reminder ${reminder.id} has pending completion, skipping`);
    continue;
}
```

### Fix 2: Use Native `lastTriggerTime` as a Guard

In the classification logic, check if the native state shows a recent trigger that indicates the alarm was handled:

```typescript
// Before classifying as MISSED RINGER:
const nativeState = nativeStates[reminder.id];
if (nativeState && nativeState.lastTriggerTime > 0) {
    const timeSinceLastTrigger = now - nativeState.lastTriggerTime;
    // If native triggered recently (within 10 min), it was handled, not missed
    if (timeSinceLastTrigger < 10 * 60 * 1000) {
        console.log(`[StartupCheck] Reminder ${reminder.id} was triggered natively ` +
                    `${timeSinceLastTrigger}ms ago, skipping missed classification`);
        remindersToReschedule.push(reminder);
        continue;
    }
}
```

### Fix 3: Ensure Sequential Execution (Defense in Depth)

In `_layout.tsx`, ensure `useCompletedAlarmSync` finishes before `checkAndTriggerPendingNotifications()` runs:

```typescript
// Option: Make checkAndTriggerPendingNotifications await syncCompletedAlarms first
useEffect(() => {
    (async () => {
        await ensureBaseChannels();
        // Sync completed/snoozed alarms FIRST so JS state is up-to-date
        await syncCompletedAlarmsOnce(); // extracted from useCompletedAlarmSync
        // THEN check for pending notifications with fresh state
        await checkAndTriggerPendingNotifications();
    })();
}, []);
```

This requires extracting the sync logic from `useCompletedAlarmSync` into a standalone async function that can be awaited.

---

## Why the Subsequent Alarms (2:06, 2:07 etc.) Still Work

The "every 1 minute" alarms continuing at 2:06, 2:07 etc. is **expected behavior**. After the Done action at 2:05pm:

- **If app was alive:** `markReminderDone()` calculates the next occurrence (2:06pm) and schedules it via `AlarmModule.scheduleAlarm()`
- **If app was killed:** `AlarmActionBridge.scheduleNextOccurrenceIfNeeded()` natively calculates and schedules the next occurrence at 2:06pm

The native scheduling chain continues regardless of JS state, which is the correct behavior.

---

## Summary

| Aspect | Detail |
|---|---|
| **Bug** | False "You missed a Ringer reminder" notification after user actively snoozed and completed the alarm |
| **Root Cause** | `checkAndTriggerPendingNotifications()` does not check `DoMinderAlarmActions` for pending completions, and races against `useCompletedAlarmSync()` on startup, leading it to use stale JS state |
| **Trigger Condition** | App process was killed during the snooze->done cycle (common on Android due to OEM battery optimizations), AND the stale scheduled time is >5 minutes in the past when the user reopens the app |
| **Primary Fix** | Add `getCompletedAlarms()` check in `startup-notification-check.ts` to skip reminders with pending completions |
| **Secondary Fix** | Use native `lastTriggerTime` as a guard against false "missed" classification |
| **Defense Fix** | Ensure `useCompletedAlarmSync` runs before `checkAndTriggerPendingNotifications()` on startup |
