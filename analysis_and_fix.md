# Analysis of Ringer Time Slipping in Open App State

## Issue Description
When the app is in the foreground ("open" state), ringer mode alarms often "slip" or are off by 1-2 minutes. This issue does not occur when the app is closed/killed.

## Root Cause Analysis
The issue is caused by a **Race Condition** between the JavaScript `ReminderEngine` (which runs only when the app is open) and the native Android `AlarmManager`.

### The Mechanism of Failure
1.  **Scheduling**: A reminder is scheduled for `12:00:00`. `AlarmManager` has a pending intent for this exact time.
2.  **Trigger Moment**: At `12:00:00` (or milliseconds after), the `ReminderEngine`'s `setInterval` tick runs in the React Native JavaScript thread.
3.  **Premature Auto-Advance**:
    *   The `ReminderEngine` checks if the reminder's `nextFireTime` (`12:00:00`) is `<= Date.now()`.
    *   Since it is now `12:00:00` (or slightly past), the condition is true.
    *   The engine immediately runs its "Auto-advance" logic for repeating reminders.
    *   It calculates the *next* occurrence (e.g., `12:01:00` for a minutely reminder).
    *   It calls `NotificationService.scheduleReminderByModel` with the new time (`12:01:00`).
4.  **Overwrite & Cancellation**:
    *   `NotificationService` calls the native `AlarmModule.scheduleAlarm`.
    *   Android's `AlarmManager` updates the *existing* PendingIntent (because the `reminderId` and `requestCode` are the same).
    *   **Result**: The alarm for `12:00:00` is replaced by `12:01:00` **before** the system could deliver the broadcast for the `12:00:00` alarm (or while it was in the process of being delivered).
    *   The user misses the `12:00:00` alarm entirely.
    *   At `12:01:00`, the new alarm fires (unless the race happens again).
    *   To the user, the alarm "slipped" by 1 minute.

### Why it works when App is Closed
When the app is closed, `ReminderEngine` is not running. The native `AlarmReceiver` handles the `12:00:00` trigger undisturbed, starts the ringtone, and shows the UI. The JS logic only kicks in if the user opens the app or interacts with the notification.

### Secondary Contributor: NotificationService
The `NotificationService.ts` also contains logic that exacerbates this:
```typescript
if (when <= now) {
  // ...
  if (reminder.repeatType === 'every') {
     // Recalculates to next interval
  }
}
```
If `ReminderEngine` attempts to schedule the *current* alarm (e.g., due to a state update) at the exact moment it is due, `NotificationService` might deem it "in the past" and recalculate it to the future, causing the same overwrite effect.

## Proposed Fix

To fix this robustness issue with minimal code changes, we need to introduce a **Latency Buffer** (Grace Period) to the JavaScript logic. We must ensure JS does not "claim" an alarm is finished until we are certain the Native side has had time to fire it.

### 1. Update `hooks/reminder-engine.tsx`
Modify the auto-advance condition to wait for a buffer period (e.g., 45 seconds).

**Change:**
```typescript
} else if (nextFireTime && nextFireTime <= now) {
```

**To:**
```typescript
// LATENCY BUFFER: Wait 45 seconds after the due time before auto-advancing.
// This gives the Native Alarm ample time to fire, start the Activity, and play sound.
// If we advance too early, we overwrite the native alarm pending intent, cancelling the ring.
const LATENCY_BUFFER = 45000; 

} else if (nextFireTime && nextFireTime <= now - LATENCY_BUFFER) {
```

### 2. Update `hooks/notification-service.ts`
Relax the "past time" check to allow for slight processing delays without forcing a reschedule.

**Change:**
```typescript
if (when <= now) {
```

**To:**
```typescript
// Tolerance for "now": if it's within the last 5 seconds, consider it "now" and schedule it
// (AlarmManager will fire immediately for slightly past times).
const TOLERANCE = 5000; 

if (when <= now - TOLERANCE) {
```

## Summary
By adding these buffers, we prioritize the Native Alarm execution. The JS engine will patiently wait for the alarm to ring before calculating the next occurrence, eliminating the race condition and preventing time slippage.
