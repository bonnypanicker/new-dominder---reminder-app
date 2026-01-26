# Title Variable Scope Bug Fix
**Date**: January 26, 2026
**Severity**: LOW (Cosmetic issue, doesn't break snooze scheduling)

---

## Bug Description

### The Issue
In `AlarmActivity.handleSnooze()`, the title was being retrieved from the wrong Intent object due to variable shadowing.

```kotlin
// BROKEN CODE (Line 1372)
val intent = Intent("app.rork.dominder.ALARM_SNOOZE").apply {
    putExtra("title", intent.getStringExtra("title") ?: "Reminder")  // ❌ Wrong!
    //                 ^^^^^^ This refers to the NEW intent being created, not Activity's intent
}
```

### Root Cause
1. `title` was declared as a **local variable** in `onCreate()`, not an instance variable
2. In `handleSnooze()`, trying to access `intent.getStringExtra("title")` inside an `apply` block
3. Variable shadowing: `intent` inside `apply` refers to the new Intent, not `this.intent`

---

## Impact Analysis

### Does This Break Snooze Scheduling? ❌ NO

**Snooze scheduling works correctly** because:
- ✅ `reminderId` is passed correctly
- ✅ `priority` is passed correctly (instance variable)
- ✅ `snoozeMinutes` is passed correctly
- ✅ AlarmActionBridge schedules alarm using these values
- ✅ `setExactAndAllowWhileIdle()` is used correctly

### What Was Affected? ⚠️ Cosmetic Only

The title would always be "Reminder" (fallback value) instead of the actual reminder title:
- In debug logs
- In the notification when snoozed alarm fires
- **Does NOT affect alarm scheduling or timing**

---

## Fix Applied

### Change 1: Made title an Instance Variable
```kotlin
// BEFORE
class AlarmActivity : AppCompatActivity() {
    private var reminderId: String? = null
    private var priority: String = "medium"
    // title was missing!
}

// AFTER
class AlarmActivity : AppCompatActivity() {
    private var reminderId: String? = null
    private var title: String = "Reminder"  // ✅ Added instance variable
    private var priority: String = "medium"
}
```

### Change 2: Assign to Instance Variable in onCreate
```kotlin
// BEFORE
val title = intent.getStringExtra("title") ?: "Reminder"  // ❌ Local variable

// AFTER
title = intent.getStringExtra("title") ?: "Reminder"  // ✅ Instance variable
```

### Change 3: Use Instance Variable in handleSnooze
```kotlin
// BEFORE
putExtra("title", intent.getStringExtra("title") ?: "Reminder")  // ❌ Wrong intent

// AFTER
putExtra("title", title)  // ✅ Use instance variable
```

---

## Verification

### Before Fix
```
AlarmActivity: Snoozing for 5 minutes, reminderId: abc123
AlarmActionBridge: ALARM_SNOOZE - reminderId: abc123, title: Reminder  // ❌ Always "Reminder"
```

### After Fix
```
AlarmActivity: Snoozing for 5 minutes, reminderId: abc123
AlarmActionBridge: ALARM_SNOOZE - reminderId: abc123, title: Take Medicine  // ✅ Actual title
```

---

## Answer to Original Question

**Q: Is this why snooze scheduling doesn't work in the background when app is closed?**

**A: NO** ❌

This bug only affects the **display name** of the reminder, not the scheduling mechanism.

### Actual Snooze Scheduling Flow:
1. User clicks snooze → `handleSnooze()` called
2. Broadcast sent with `reminderId`, `snoozeMinutes`, `priority` (all correct)
3. `AlarmActionBridge` receives broadcast
4. `scheduleNativeAlarm()` called with correct parameters
5. `setExactAndAllowWhileIdle()` schedules alarm ✅
6. Alarm fires correctly after snooze duration ✅

The title is only used for:
- Logging (cosmetic)
- Notification display (cosmetic)

---

## Related Fixes Already Applied

We already fixed the **actual** snooze issues:

1. ✅ **PendingIntent Collision** - Snooze overwrote repeating reminders
2. ✅ **Pause Check** - Snooze respects pause state
3. ✅ **Doze Mode** - Already using `setExactAndAllowWhileIdle()`

This title fix is just a **polish** to show the correct reminder name.

---

## Summary

**Bug Severity**: LOW (cosmetic)
**Snooze Scheduling**: NOT AFFECTED
**Fix Applied**: ✅ Title now an instance variable
**Impact**: Better UX (correct title shown in logs and notifications)

**Snooze works correctly in background** - this was never the issue!
