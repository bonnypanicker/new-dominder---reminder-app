# Ringer Mode Reminders (Every + End After N) — Findings

## Problem statement (repro)
- Reminder type: **Ringer mode** (Android native `AlarmManager` + `AlarmActivity` full-screen)
- Repeat type: **Every** (e.g., every 1 minute)
- Until type: **Count** ("end after N occurrences", e.g., 3)
- Observed:
  - Reminder **does not stop** after N occurrences (keeps ringing beyond the count cap).
  - **Completed tab history** is inaccurate/missing/has wrong occurrence info.

## What the log shows
Source: `dominder-full-log (2).md`

Key excerpt (near end of file):
- Reminder created: `repeatType=every`, `untilCount=3`.
- `calculateNextReminderDate` runs with:
  - `Count check: occurred=0, untilCount=3`
  - Next occurrence calculated at the expected minute boundary.
- Native scheduling was used:
  - `[NotificationService] Scheduled native alarm ... priority high`
  - `AlarmModule: Scheduling alarm broadcast ... interval=1.0 minutes`

Important: the log mainly covers scheduling/initial state; it doesn’t include the later alarm-done cycles, but the code-path analysis explains why the alarm can continue natively.

## Core architecture (who is authoritative)
There are **two rescheduling mechanisms** that can apply to ringer reminders:

### 1) JS/TS scheduling + repeat logic (authoritative for “until count”)
- Occurrence counting + termination is implemented in JS via:
  - `services/reminder-utils.ts` → `calculateNextReminderDate(reminder, fromDate)`
    - Enforces count cap:
      - If `reminder.untilType === 'count'` and `occurred >= untilCount` → returns `null`.
  - `services/reminder-scheduler.ts` → `markReminderDone(reminderId, shouldIncrementOccurrence)`
    - Increments `occurrenceCount` for native alarm completions and schedules next occurrence.

### 2) Native Android fallback rescheduling (currently missing “until count”)
- `android/.../AlarmActionBridge.kt` receives:
  - `app.rork.dominder.ALARM_DONE`
  - `com.dominder.MISSED_ALARM`
- And **immediately reschedules** next alarm natively if it sees `interval > 0` and `unit != null`:
  - `scheduleNextAlarm(...)`
- **Problem**: `scheduleNextAlarm(...)` only checks `endDate` (untilType=endsAt), not `untilCount`.
  - So it will keep scheduling recurring alarms even after JS would have stopped.

## Root cause (why it keeps ringing past N)
- For ringer reminders, scheduling uses native `AlarmManager`:
  - `hooks/notification-service.ts` calls `AlarmModule.scheduleAlarm(...)`.
- The native layer includes recurrence info (`interval`, `unit`, `endDate`) so that when the user taps **Done** (or the alarm is missed), the native bridge can **fallback-reschedule**.
- However, **`untilCount` and `occurrenceCount` are not passed into native** at all:
  - `AlarmModule.kt.scheduleAlarm(...)` does not include them.
  - `AlarmReceiver.kt` doesn’t receive them.
  - `AlarmActivity.kt` doesn’t broadcast them.
  - `AlarmActionBridge.kt.scheduleNextAlarm(...)` cannot enforce count cap.

Result:
- Even when JS would reach the count cap and stop scheduling, native fallback keeps scheduling, causing extra rings (4th, 5th, etc.).

## Completed tab history inaccuracies — where they come from
Completed history for repeating reminders relies on **history items** (reminder clones) added as completed occurrences:

### Correct model
- Each time a repeating reminder occurrence is completed:
  - Create a new reminder record:
    - `id: ${parentId}_${Date.now()}_hist`
    - `parentId: parentId`
    - `isCompleted: true`, `repeatType: 'none'`
  - This record is what the Completed tab groups by `parentId`.

### Current issues (JS)
1) `services/reminder-scheduler.ts` (native alarm done path)
- In `markReminderDone(reminderId, true)`:
  - `calcContext` increments `occurrenceCount` (`occurred + 1`).
  - But the history item is built with `...reminder` (the *original* reminder object), not `calcContext`.
  - That means the history item may carry a **stale `occurrenceCount`**.

2) `app/_layout.tsx` foreground DELIVERED final occurrence path
- In the “final occurrence reached” branch (no nextDate):
  - It creates a history item with `...reminder` (not `forCalc` which has the incremented `occurrenceCount`).
  - Again: history item can have **wrong occurrence count** compared to the just-completed event.

3) Background delivery path (`index.js`)
- Background handler updates occurrenceCount with a cap-safe increment:
  - `nextOccurCount = occurred >= untilCount ? occurred : occurred + 1`
- It explicitly avoids marking completed immediately at delivery.
- But it **does not create a history item** in the final-occurrence delivery path; history is expected to be created on action (Done).

Net effect:
- Completed tab grouping is present, but the history items can be missing the **correct post-increment count** (and depending on timing paths, history creation may be inconsistent).

## High-risk race/invariant notes
- `services/reminder-service.ts.updateReminder(...)` cancels notifications if `updatedReminder.isCompleted`.
  - This makes it important that “final occurrence” logic doesn’t prematurely mark complete at delivery time (some paths correctly avoid this).
- There are multiple places that can increment occurrence count:
  - Foreground delivered event (`app/_layout.tsx`): always increments.
  - Background delivered event (`index.js`): increments with cap.
  - ReminderEngine auto-advance (`hooks/reminder-engine.tsx`): increments when it detects past fire time.
  - Native alarm Done (`markReminderDone(..., true)`): increments.

Because of this, “who increments when” must remain consistent:
- Notifee action Done uses `markReminderDone(reminderId, false)` because delivery already incremented.
- Native alarm Done uses `markReminderDone(reminderId, true)`.

## Planned fix (code-level)
### Native stop enforcement
Goal: native fallback rescheduling must respect `untilCount` (count cap), just like JS.

Plan:
1) `hooks/notification-service.ts`
- Extend native bridge call to include `untilCount` and `occurrenceCount`:
  - `AlarmModule.scheduleAlarm(..., untilCount?, occurrenceCount?)`

2) `android/.../AlarmModule.kt`
- Update method signature and intent extras:
  - putExtra("untilCount", untilCount)
  - putExtra("occurrenceCount", occurrenceCount)

3) `android/.../AlarmReceiver.kt`
- Read these extras and forward them into the `AlarmActivity` intent.

4) `android/.../AlarmActivity.kt`
- Forward these extras into broadcasts:
  - `ALARM_DONE`
  - `MISSED_ALARM`

5) `android/.../AlarmActionBridge.kt`
- Read `untilCount` + `occurrenceCount` from the received intents.
- Before `scheduleNextAlarm(...)`, gate:
  - If `untilCount > 0` and `occurrenceCount >= untilCount` → **skip native reschedule**.
- When scheduling next, increment `occurrenceCount` that gets passed forward.

### History correctness
Goal: history items represent the just-completed occurrence.

Fixes:
- In `services/reminder-scheduler.ts`:
  - Build history item using `calcContext` (or explicitly set `occurrenceCount: occurred + 1` when `shouldIncrementOccurrence=true`).
- In `app/_layout.tsx` final-occurrence path:
  - Build history item using `forCalc` (includes incremented `occurrenceCount`).

## Verification checklist (post-fix)
Scenario: **Every 1 minute**, **End after 3 occurrences**, **Priority high**
- Expected rings:
  - Exactly 3 rings.
  - No 4th ring (native fallback must stop).
- Expected Completed tab:
  - Group shows 3 occurrences (history items).
  - Each history occurrence timestamp matches the scheduled fire time.
  - No extra/missing occurrences.

## Files involved
- JS/TS:
  - `hooks/notification-service.ts`
  - `services/reminder-utils.ts`
  - `services/reminder-scheduler.ts`
  - `app/_layout.tsx`
  - `index.js`
  - `hooks/reminder-engine.tsx`
  - `app/index.tsx` (Completed grouping UI)

- Android:
  - `android/.../alarm/AlarmModule.kt`
  - `android/.../alarm/AlarmReceiver.kt`
  - `android/.../alarm/AlarmActivity.kt`
  - `android/.../alarm/AlarmActionBridge.kt`
  - `android/.../alarm/MissedAlarmReceiver.kt` (event bridge; less relevant to count cap)
