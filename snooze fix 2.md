
Action: file_editor create /app/dominder_repo/SNOOZE_BACKGROUND_MINIMAL_FIX.md --file-text "# Snooze (Full-screen Ringer) not firing in app-closed state — Root cause & minimal fix

## What you observe
- When a **Ringer mode / High priority** reminder fires, the **full-screen alarm UI** opens.
- Tapping **Snooze 5 min** closes the alarm UI.
- If the app process is not running (\"app closed\" / swiped away / killed), the reminder **does not re-trigger after 5 minutes**.
- When you later open the app, it suddenly schedules the reminder for +5 min and then it rings.

This is a classic sign that the **native snooze path is not actually scheduling an AlarmManager alarm**, and the alarm only gets scheduled later when the JS engine starts and re-runs scheduling.

---

## Expected design (how it should work)
For high-priority (ringer) reminders, the app intentionally uses a **native AlarmManager + full-screen Activity** so that alarms can fire even when:
- the JS runtime is dead,
- the app is backgrounded,
- the phone is in Doze.

Therefore, **Snooze from the full-screen UI must schedule the snooze alarm natively**, not rely on JS.

---

## Actual flow in this repo
### 1) Alarm fires (native)
- `AlarmModule.scheduleAlarm(...)` schedules an AlarmManager broadcast.
- `AlarmReceiver` receives `app.rork.dominder.ALARM_FIRED` and launches `AlarmActivity` as full-screen.

(See: `plugins/with-alarm-module.js` → generated `alarm/AlarmReceiver.kt` and `alarm/AlarmActivity.kt`.)

### 2) User taps Snooze (native)
- `AlarmActivity.handleSnooze(minutes)`:
  - stores some state to `DoMinderAlarmActions`
  - sends broadcast: `app.rork.dominder.ALARM_SNOOZE` (explicit `setPackage(packageName)`)
  - closes the alarm UI

### 3) Snooze broadcast handler (native)
- `AlarmActionBridge.onReceive()` handles `app.rork.dominder.ALARM_SNOOZE` and calls:
  - `scheduleNativeAlarm(...)` (or `scheduleNativeAlarmAtTime(...)`)
  - which schedules a new AlarmManager alarm to `AlarmReceiver`.

---

## Core root cause
### The native snooze scheduling path refuses to schedule unless Exact Alarm permission is granted
In the generated Kotlin (inside `plugins/with-alarm-module.js`):

- `AlarmActionBridge.scheduleNativeAlarm(...)`
- `AlarmActionBridge.scheduleNativeAlarmAtTime(...)`
- `AlarmModule.scheduleAlarm(...)`

All include logic like:

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
  if (!alarmManager.canScheduleExactAlarms()) {
    // ... log ...
    return // <- snooze scheduling is skipped
  }
}
```

So on Android 12+ (S / API 31+), if the user **didn’t grant exact alarms**, the snooze alarm is never scheduled.

Why it looks like it “works when I open the app”:
- When the app is opened, JS scheduling (`notificationService.scheduleReminderByModel`) may use Notifee’s fallback:
  - `AlarmType.SET_AND_ALLOW_WHILE_IDLE` (inexact) when exact alarms aren’t granted.
- That JS fallback is not available while the app is closed.

Result: **Snooze works only when JS runtime comes back (app opened)**.

---

## Minimal fix (do NOT redesign; just make native snooze schedule even without exact alarms)

### Change: fall back to inexact alarms instead of skipping
In `AlarmActionBridge.scheduleNativeAlarm(...)` and `scheduleNativeAlarmAtTime(...)`:

- Keep using `setExactAndAllowWhileIdle(...)` when `canScheduleExactAlarms()==true`.
- Otherwise schedule with **best-effort**:
  - `alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)`

This preserves the “ringer works in background” behavior (timing may drift slightly without exact permission, but it will still fire).

#### Patch sketch (Kotlin)
```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
  DebugLogger.log(\"Exact alarm not allowed; using setAndAllowWhileIdle for snooze\")
  alarmManager.setAndAllowWhileIdle(
    AlarmManager.RTC_WAKEUP,
    triggerTime,
    pendingIntent
  )
  return
}

alarmManager.setExactAndAllowWhileIdle(
  AlarmManager.RTC_WAKEUP,
  triggerTime,
  pendingIntent
)
```

### Where to apply
Because this repo injects Kotlin through Expo config plugins, the real source-of-truth is:
- `plugins/with-alarm-module.js`

Search inside it for these functions and apply the fallback logic:
- `private fun scheduleNativeAlarmAtTime(...)`
- `private fun scheduleNativeAlarm(...)`
- also consider `fun scheduleAlarm(...)` inside `AlarmModule` (same issue for initial scheduling)

---

## Why previous fixes likely missed it
Many “snooze fixes” focus on:
- JS state (`snoozeUntil`),
- Notifee trigger notifications,
- rescheduling on app startup.

But your bug happens specifically when **JS is not running**, so only the **native AlarmManager path** matters. The permission gate is the key blocker.

---

## Quick validation checklist (after applying the minimal fix)
1. On Android 12+ device, ensure **Exact alarms are NOT granted** for the app.
2. Create a **High priority / ringer** reminder to fire soon.
3. When it fires, tap **Snooze 5m**.
4. Swipe the app away / keep it closed.
5. Wait 5 minutes:
   - Expected: alarm fires (may be a few seconds off if inexact).

---

## Optional (recommended) product improvement (not required for the minimal fix)
- In the app UI, detect `canScheduleExactAlarms` and show a one-time banner:
  - “For precise ringer reminders and snooze, enable Exact Alarms permission.”

This reduces user confusion and makes the behavior deterministic.
"
Observation: Create successful: /app/dominder_repo/SNOOZE_BACKGROUND_MINIMAL_FIX.md