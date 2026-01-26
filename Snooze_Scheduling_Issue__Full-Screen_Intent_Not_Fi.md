# Snooze Scheduling Issue: Full-Screen Intent Not Firing When App is Closed

**Analysis Date:** January 26, 2026  
**Issue:** When a user snoozes a reminder for 5 minutes while the full-screen intent is displayed and the app is subsequently closed, the snooze alarm does not schedule. The reminder only reschedules when the user reopens the app.

---

## Executive Summary

The snooze functionality in Dominder has a critical architectural flaw: **snooze scheduling is entirely dependent on JavaScript execution context**, which is unavailable when the app is closed. When a user taps the "Snooze 5" action on a full-screen intent notification while the app is in the background or closed, the notification action is received by the native Android layer, but the corresponding snooze scheduling logic never executes because the JavaScript bridge is not active.

---

## Root Cause Analysis

### 1. **Notification Action Handling Flow**

The snooze action is initiated through Notifee's action system:

```
User taps "Snooze 5" on notification
    ↓
Native Android receives action (AlarmManager/Notifee)
    ↓
Notifee queues action event
    ↓
JavaScript onForegroundEvent listener (if app is in foreground)
    ↓
rescheduleReminderById() executes
    ↓
Snooze timestamp stored in AsyncStorage
    ↓
Native alarm scheduled
```

**Problem:** Steps 4-6 only execute if the JavaScript context is active (app in foreground).

### 2. **Missing Background Action Handler**

**Location:** `app/_layout.tsx` (lines 141-322)

The codebase registers a foreground event listener:

```typescript
const unsub = notifee.onForegroundEvent(async ({ type, detail }) => {
  // ... handles snooze_5, snooze_10, etc.
  const snoozeMatch = /^snooze_(\d+)$/.exec(pressAction.id);
  if (snoozeMatch) {
    const mins = parseInt(snoozeMatch[1], 10);
    const { rescheduleReminderById } = require('@/services/reminder-scheduler');
    await rescheduleReminderById(reminderId, mins);
  }
});
```

**Critical Gap:** There is **no corresponding `onBackgroundEvent` handler** for when the app is closed or in the background. Notifee provides `notifee.onBackgroundEvent()` for exactly this scenario, but it is not implemented.

### 3. **Snooze Scheduling Logic Dependency Chain**

**Location:** `services/reminder-scheduler.ts` (lines 8-111)

The `rescheduleReminderById()` function performs these steps:

1. Retrieves the reminder from AsyncStorage via `getReminder()`
2. Calculates snooze timestamp: `Date.now() + minutes * 60 * 1000`
3. For repeating reminders: creates a "shadow snooze" via native module
4. For one-off reminders: sets `snoozeUntil` field and updates AsyncStorage
5. Calls `notificationService.scheduleReminderByModel()` to schedule the snooze notification

**Why it fails when app is closed:**

- Steps 1, 4, 5 require **JavaScript execution** (AsyncStorage access, data transformation)
- When the app is closed, the JavaScript context is terminated
- The native layer receives the snooze action but cannot execute JavaScript to update the reminder state
- No snooze timestamp is persisted, and no native alarm is scheduled

### 4. **Reminder Engine Does Not Detect Snoozed State**

**Location:** `hooks/reminder-engine.tsx` (lines 89-91)

The ReminderEngine checks for `reminder.snoozeUntil` to identify snoozed reminders:

```typescript
if (reminder.snoozeUntil) {
  nextFireTime = new Date(reminder.snoozeUntil);
  console.log(`[ReminderEngine] Reminder ${reminder.id} is snoozed until ${nextFireTime.toISOString()}`);
}
```

Since the snooze state was never persisted to AsyncStorage (due to the missing background handler), the ReminderEngine has no knowledge that a snooze was requested. When the app reopens, it processes the reminder as if the snooze never happened, eventually triggering a reschedule on the next engine tick.

### 5. **Native Module Limitations**

**Location:** `hooks/notification-service.ts` (lines 27-56)

The native AlarmModule is only called from JavaScript:

```typescript
const AlarmModule = Platform.OS === 'android' ? (NativeModules as any)?.AlarmModule ?? null : null;
```

The native layer has no way to:
- Directly access AsyncStorage to update reminder state
- Invoke the snooze scheduling logic independently
- Persist the snooze timestamp without JavaScript coordination

---

## Detailed Issue Breakdown

### Scenario: User Snoozes While App is Closed

| Step | Action | Current Behavior | Expected Behavior |
|------|--------|------------------|-------------------|
| 1 | Full-screen alarm fires | Native alarm fires, notification displayed | ✓ Works correctly |
| 2 | User taps "Snooze 5" | Native receives action | ✓ Works correctly |
| 3 | App is closed/background | Notifee queues action | ✓ Works correctly |
| 4 | onForegroundEvent triggered? | **NO** - JS context inactive | ✗ Missing handler |
| 5 | rescheduleReminderById() called? | **NO** - Never reached | ✗ Not executed |
| 6 | snoozeUntil persisted? | **NO** - AsyncStorage not updated | ✗ No state change |
| 7 | Native snooze alarm scheduled? | **NO** - No native call made | ✗ Not scheduled |
| 8 | App reopened | ReminderEngine sees no snooze state | ✗ Reminder reschedules as normal |
| 9 | Snooze fires 5 min later? | **NO** - Never scheduled | ✗ Does not fire |

### Scenario: User Snoozes While App is Open

| Step | Action | Current Behavior | Expected Behavior |
|------|--------|------------------|-------------------|
| 1-3 | Same as above | Same as above | ✓ Works correctly |
| 4 | onForegroundEvent triggered? | **YES** - JS context active | ✓ Works correctly |
| 5 | rescheduleReminderById() called? | **YES** - Handler executes | ✓ Works correctly |
| 6 | snoozeUntil persisted? | **YES** - AsyncStorage updated | ✓ Works correctly |
| 7 | Native snooze alarm scheduled? | **YES** - Native call made | ✓ Works correctly |
| 8 | App remains open | ReminderEngine sees snooze state | ✓ Works correctly |
| 9 | Snooze fires 5 min later? | **YES** - Alarm fires | ✓ Works correctly |

---

## Code Evidence

### Missing Background Handler

**File:** `app/_layout.tsx`

The codebase has:
```typescript
const unsub = notifee.onForegroundEvent(async ({ type, detail }) => {
  // ... handles snooze actions
});
```

But lacks:
```typescript
// THIS IS MISSING - No background event handler
notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Handle snooze actions when app is closed
});
```

### Snooze Action Detection

**File:** `app/_layout.tsx` (lines 312-317)

```typescript
const snoozeMatch = /^snooze_(\d+)$/.exec(pressAction.id);
if (snoozeMatch) {
  const mins = parseInt(snoozeMatch[1], 10);
  const { rescheduleReminderById } = require('@/services/reminder-scheduler');
  await rescheduleReminderById(reminderId, mins);
}
```

This code only runs in the foreground event handler. When the app is closed, this code path is never reached.

### Snooze Scheduling Implementation

**File:** `services/reminder-scheduler.ts` (lines 8-111)

The `rescheduleReminderById()` function performs all necessary operations but requires JavaScript execution:

1. **AsyncStorage access** (line 11): `const reminder = await getReminder(reminderId);`
2. **Timestamp calculation** (line 27): `const snoozeTime = Date.now() + minutes * 60 * 1000;`
3. **State persistence** (line 101): `await updateReminder(reminder);`
4. **Notification scheduling** (line 106): `await notificationService.scheduleReminderByModel(updatedReminder);`

All of these operations are JavaScript-dependent and cannot execute when the app is closed.

---

## Impact Assessment

### Severity: **CRITICAL**

This issue affects the core functionality of the reminder app:

- **User Impact:** Users who snooze reminders while the app is closed will not receive the snoozed reminder notification
- **Frequency:** Occurs every time a user snoozes while the app is not actively running
- **Data Integrity:** The snooze action is lost; no record is maintained
- **User Experience:** Confusing behavior where snooze works sometimes (app open) but not others (app closed)

### Affected Scenarios

1. ✗ User receives full-screen alarm, snoozes, closes app → **Snooze does not fire**
2. ✗ User receives notification while app is in background, snoozes → **Snooze does not fire**
3. ✗ User receives notification, snoozes, immediately closes app → **Snooze does not fire**
4. ✓ User receives notification while app is open, snoozes → **Snooze fires correctly**

---

## Technical Architecture Issues

### 1. **JavaScript-Only State Management**

The app stores reminder state exclusively in AsyncStorage (JavaScript-accessible). The native Android layer cannot independently:
- Read reminder state
- Update reminder state
- Calculate next fire times
- Persist snooze timestamps

### 2. **Unidirectional Communication**

The data flow is: **Native → JS → Native**

When the app is closed, the middle step (JS) is unavailable, breaking the chain.

### 3. **No Native-Side Snooze Logic**

The native AlarmModule has no logic to:
- Interpret snooze actions
- Persist snooze state
- Calculate snooze timestamps
- Schedule follow-up alarms

All snooze logic is implemented in JavaScript.

---

## Recommended Fixes

### **Fix 1: Implement Background Event Handler (Primary Solution)**

**Priority:** CRITICAL  
**Complexity:** Medium  
**Location:** `app/_layout.tsx`

Register a background event handler that executes when the app is closed:

```typescript
// Add this after the foreground event handler
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail || {};
  
  if (type === EventType.ACTION_PRESS && notification && pressAction) {
    const reminderId = notification.data?.reminderId as string;
    if (!reminderId) return;
    
    // Handle snooze actions in background
    const snoozeMatch = /^snooze_(\d+)$/.exec(pressAction.id);
    if (snoozeMatch) {
      const mins = parseInt(snoozeMatch[1], 10);
      const { rescheduleReminderById } = require('@/services/reminder-scheduler');
      await rescheduleReminderById(reminderId, mins);
    }
    
    // Handle done action in background
    if (pressAction.id === 'done') {
      const { markReminderDone } = require('@/services/reminder-scheduler');
      await markReminderDone(reminderId, false);
    }
  }
});
```

**Why this works:**
- Notifee's `onBackgroundEvent` is designed to execute JavaScript code when the app is closed
- The same snooze logic (`rescheduleReminderById`) executes, updating AsyncStorage and scheduling the native alarm
- When the app reopens, the ReminderEngine detects the updated snooze state and processes it correctly

**Limitations:**
- Requires the app to be installed (not just in Expo Go)
- May have platform-specific timing constraints on Android

### **Fix 2: Extend Native AlarmModule (Long-Term Solution)**

**Priority:** HIGH  
**Complexity:** High  
**Location:** Native Android code (not in repository)

Implement native-side snooze logic in the AlarmModule:

1. Add a `snoozeAlarm(reminderId, minutes)` method to the native module
2. Store snooze state in SharedPreferences (native persistent storage)
3. Schedule a new alarm for the snooze timestamp
4. Sync snooze state back to JavaScript when the app reopens

**Benefits:**
- Eliminates dependency on JavaScript execution for snooze scheduling
- Provides true background snooze capability
- More reliable for edge cases (app crash, device reboot)

**Drawbacks:**
- Requires native Android development
- Increases code complexity
- Requires testing on multiple Android versions

### **Fix 3: Hybrid Approach (Recommended)**

**Priority:** CRITICAL  
**Complexity:** Medium

Implement both fixes:

1. **Immediate:** Add background event handler (Fix 1) to handle snooze actions when app is closed
2. **Follow-up:** Extend native module (Fix 2) to handle edge cases and improve reliability

This provides immediate relief while building a more robust long-term solution.

---

## Verification Steps

### Test Case 1: Snooze While App is Closed

1. Open Dominder and create a reminder for 1 minute from now
2. Wait for the full-screen alarm to fire
3. **Close the app completely** (swipe from recents, not just background)
4. Tap "Snooze 5" on the notification
5. Wait 5 minutes
6. **Expected:** Notification fires after 5 minutes
7. **Current:** Notification does not fire

### Test Case 2: Snooze While App is Open

1. Open Dominder and create a reminder for 1 minute from now
2. Wait for the full-screen alarm to fire
3. **Keep the app open**
4. Tap "Snooze 5" on the notification
5. Wait 5 minutes
6. **Expected:** Notification fires after 5 minutes
7. **Current:** Notification fires correctly ✓

### Test Case 3: Snooze While App is in Background

1. Open Dominder and create a reminder for 1 minute from now
2. Wait for the full-screen alarm to fire
3. **Minimize the app** (press home, don't close)
4. Tap "Snooze 5" on the notification
5. Wait 5 minutes
6. **Expected:** Notification fires after 5 minutes
7. **Current:** Notification does not fire (same as Test Case 1)

---

## Summary Table

| Aspect | Current State | Issue | Impact |
|--------|---------------|-------|--------|
| **Foreground Snooze** | Works | None | ✓ Functional |
| **Background Snooze** | Broken | Missing `onBackgroundEvent` handler | ✗ Critical |
| **State Persistence** | JS-only | No native fallback | ✗ Fragile |
| **Native Snooze Logic** | Absent | All logic in JavaScript | ✗ Unreliable |
| **User Experience** | Inconsistent | Works sometimes, fails others | ✗ Confusing |

---

## Conclusion

The snooze functionality fails when the app is closed because **the entire snooze scheduling pipeline is JavaScript-dependent**, and JavaScript execution is unavailable when the app is not running. The missing `onBackgroundEvent` handler in `app/_layout.tsx` is the immediate cause, but the underlying architectural issue is the lack of native-side snooze logic.

**Immediate action required:** Implement the background event handler (Fix 1) to restore snooze functionality when the app is closed. This is a straightforward addition that reuses existing code and provides immediate relief.

**Long-term improvement:** Extend the native AlarmModule with snooze capabilities (Fix 2) to eliminate JavaScript dependency and improve reliability.

---

## References

- **Notifee Documentation:** Background Event Handling - https://notifee.io/react-native/docs/events
- **Android AlarmManager:** Scheduling Alarms - https://developer.android.com/training/scheduling/alarms
- **React Native AsyncStorage:** Persistent State - https://react-native-async-storage.github.io/async-storage/
- **Expo Go Limitations:** Native Module Support - https://docs.expo.dev/build/setup/

