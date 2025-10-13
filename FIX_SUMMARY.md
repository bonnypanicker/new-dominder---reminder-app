# Dominder Alarm System - Fix Summary

## Problem Statement

**Critical Issue**: When a high-priority (ringer mode) alarm triggers on a **locked phone with the app closed**, pressing Done or Snooze causes the app's home screen to appear. This violates the requirement that the app should remain closed.

### Affected Scenario
**Condition E: Phone LOCKED + App CLOSED**
- ❌ Current: Alarm triggers → User presses Done/Snooze → **App home screen appears**
- ✅ Expected: Alarm triggers → User presses Done/Snooze → **Alarm disappears, phone returns to lock screen**

---

## Root Cause Analysis

### The Problem
`AlarmActivity.kt` uses this approach to handle Done/Snooze actions:

```kotlin
val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
startActivity(launchIntent)  // ❌ This launches MainActivity
```

**Why this is wrong**:
1. `getLaunchIntentForPackage()` explicitly launches the main activity
2. MainActivity becomes visible even when app was closed
3. React Native must be initialized to handle the action
4. Creates dependency on app being alive

### The Flow (Current - BROKEN)
```
AlarmActivity (Done/Snooze clicked)
  ↓
startActivity(MainActivity)  ← ❌ Makes app visible
  ↓
MainActivity.handleAlarmIntent()
  ↓
DeviceEventEmitter.emit("alarmAction")
  ↓
app/_layout.tsx listener
  ↓
reminder-scheduler.ts (process action)
```

---

## Solution Architecture

### The Fix: Broadcast-Based Architecture

Replace activity launching with broadcasts:

```
AlarmActivity (Done/Snooze clicked)
  ↓
sendBroadcast("app.rork.dominder.ALARM_ACTION")  ← ✅ No UI launch
  ↓
AlarmActionReceiver.onReceive()
  ↓
RescheduleAlarmsService.onStartCommand()
  ↓
Process action in background (update AsyncStorage, reschedule alarm)
```

**Benefits**:
- ✅ No MainActivity launch
- ✅ Works even when app is killed
- ✅ No dependency on React Native being initialized
- ✅ Clean separation of concerns
- ✅ Reliable background execution

---

## Files Modified

### 1. AlarmActivity.kt ✏️
**Changes**:
- Replace `startActivity()` with `sendBroadcast()`
- Add notification cancellation in `dismissAlarm()`
- Use `finish()` instead of `finishAffinity()`

**Key Changes**:
```kotlin
// OLD (BROKEN)
val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
startActivity(launchIntent)

// NEW (FIXED)
val intent = Intent("app.rork.dominder.ALARM_ACTION")
sendBroadcast(intent)
```

---

### 2. AlarmActionReceiver.kt ✨ NEW FILE
**Purpose**: Receives action broadcasts from AlarmActivity

**Location**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionReceiver.kt`

**What it does**:
1. Receives broadcast with action (done/snooze) and reminderId
2. Starts RescheduleAlarmsService to process the action
3. Logs the action for debugging

---

### 3. RescheduleAlarmsService.kt ✏️
**Changes**:
- Add action handling logic in `onStartCommand()`
- Implement `handleDoneAction()` method
- Implement `handleSnoozeAction()` method
- Add AsyncStorage helper for reading/writing reminders
- Add date/time parsing utilities

**What it does**:
1. Receives action from AlarmActionReceiver
2. Loads reminders from AsyncStorage
3. Finds the reminder by ID
4. Processes the action (mark done or snooze)
5. Reschedules the alarm if needed
6. Saves updated reminders back to AsyncStorage

---

### 4. AndroidManifest.xml ✏️
**Changes**:
- Register AlarmActionReceiver with intent filter

**Added**:
```xml
<receiver 
    android:name=".alarm.AlarmActionReceiver" 
    android:exported="false">
    <intent-filter>
        <action android:name="app.rork.dominder.ALARM_ACTION" />
    </intent-filter>
</receiver>
```

---

## Implementation Steps

### Step 1: Read the Analysis
Open and read: `COMPREHENSIVE_SYSTEM_ANALYSIS.md`

This document contains:
- Complete system architecture overview
- Detailed flow analysis for all scenarios
- All issues identified with severity levels
- Testing checklist for all conditions

---

### Step 2: Apply the Fixes
Open and follow: `GEMINI_KOTLIN_FIX_FINAL.md`

This document contains:
- Exact code changes for each file
- Line-by-line instructions
- Complete code for new files
- AndroidManifest.xml changes

**Recommended approach**: Use Gemini CLI to apply changes automatically:

```bash
# Save the prompt to a file
cat GEMINI_KOTLIN_FIX_FINAL.md > fix-prompt.txt

# Run Gemini CLI
gemini -m gemini-2.0-flash-exp -f fix-prompt.txt

# Ask Gemini to apply all changes and show diffs
```

---

### Step 3: Build and Test

#### Build the app:
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

#### Install on device:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

#### Test Condition E (Critical):
1. Create a high-priority reminder for 2 minutes from now
2. **Lock the phone**
3. **Close the app completely** (swipe away from recent apps)
4. Wait for alarm to trigger
5. Verify:
   - ✅ Screen lights up
   - ✅ AlarmActivity shows with alarm sound
   - ✅ Press "Done" or "Snooze"
   - ✅ Alarm UI disappears
   - ✅ **Phone returns to lock screen (NOT app home screen)**

#### Test Other Conditions:
Use the testing checklist in `COMPREHENSIVE_SYSTEM_ANALYSIS.md`

---

## Expected Behavior After Fix

### All Scenarios

#### A) Phone UNLOCKED + App CLOSED
- ✅ Persistent notification shows
- ✅ Tap notification → AlarmActivity opens
- ✅ Done/Snooze → Alarm disappears, **app stays closed**

#### B) Phone UNLOCKED + App OPENED & MINIMIZED
- ✅ Same as (A)

#### C) Phone UNLOCKED + App OPENED (at Home)
- ✅ Persistent notification shows
- ✅ Tap notification → AlarmActivity opens
- ✅ Done/Snooze → Alarm disappears, **remain in app**

#### D) Phone LOCKED + App MINIMIZED
- ✅ Screen lights up
- ✅ AlarmActivity shows
- ✅ Done/Snooze → Alarm disappears, **app stays closed**

#### E) Phone LOCKED + App CLOSED ⭐ **CRITICAL**
- ✅ Screen lights up
- ✅ AlarmActivity shows
- ✅ Done/Snooze → Alarm disappears, **app stays closed**
- ✅ **Phone returns to lock screen**

---

## Additional Improvements

### 1. Doze Mode Support ✅
Already implemented correctly in `AlarmModule.kt`:
```kotlin
alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMillis.toLong(), pendingIntent)
```

This ensures alarms fire even during Doze mode for standard and silent priorities.

---

### 2. Notification Cancellation ✅
Added in `AlarmActivity.dismissAlarm()`:
```kotlin
val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
reminderId?.let { 
    notificationManager.cancel(it.hashCode())
}
```

This ensures the persistent notification is removed when alarm is dismissed.

---

### 3. Comprehensive Logging ✅
All components now log their actions:
- `[AlarmActivity]` - Alarm UI events
- `[AlarmActionReceiver]` - Broadcast reception
- `[RescheduleAlarmsService]` - Action processing

Use `adb logcat` to monitor:
```bash
adb logcat | grep -E "AlarmActivity|AlarmActionReceiver|RescheduleAlarmsService"
```

---

## Troubleshooting

### Issue: Alarm doesn't trigger
**Check**:
1. Battery optimization disabled for the app
2. "Alarms & reminders" permission granted
3. Alarm is scheduled with `setExactAndAllowWhileIdle`

**Debug**:
```bash
adb logcat | grep AlarmModule
```

---

### Issue: Action not processed
**Check**:
1. AlarmActionReceiver is registered in AndroidManifest.xml
2. Broadcast is being sent (check logs)
3. RescheduleAlarmsService is starting

**Debug**:
```bash
adb logcat | grep -E "AlarmActionReceiver|RescheduleAlarmsService"
```

---

### Issue: App still appears after Done/Snooze
**Check**:
1. AlarmActivity is using `sendBroadcast()` not `startActivity()`
2. MainActivity is not being launched
3. No other code is calling `router.push()` or `router.replace()`

**Debug**:
```bash
adb logcat | grep -E "AlarmActivity|MainActivity"
```

---

## Files Reference

### Documentation
- `COMPREHENSIVE_SYSTEM_ANALYSIS.md` - Complete system analysis
- `GEMINI_KOTLIN_FIX_FINAL.md` - Detailed fix instructions
- `FIX_SUMMARY.md` - This file

### Code Files to Modify
- `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActivity.kt`
- `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionReceiver.kt` (NEW)
- `android/app/src/main/java/app/rork/dominder_android_reminder_app/RescheduleAlarmsService.kt`
- `android/app/src/main/AndroidManifest.xml`

---

## Success Criteria

✅ **Primary Goal**: Condition E works correctly
- Phone locked + app closed
- Alarm triggers and shows AlarmActivity
- User presses Done or Snooze
- Alarm disappears
- **App home screen does NOT appear**
- Phone returns to lock screen

✅ **Secondary Goals**:
- All other conditions (A, B, C, D) work correctly
- Alarms fire during Doze mode
- Notifications are cancelled properly
- Actions are processed reliably
- No crashes or errors

---

## Next Steps

1. ✅ Read `COMPREHENSIVE_SYSTEM_ANALYSIS.md` for full context
2. ✅ Follow `GEMINI_KOTLIN_FIX_FINAL.md` to apply fixes
3. ✅ Build and test the app
4. ✅ Verify all conditions work correctly
5. ✅ Monitor logs for any issues

---

## Questions?

If you encounter any issues:
1. Check the logs using `adb logcat`
2. Review the analysis document for context
3. Verify all changes were applied correctly
4. Test each condition systematically

Good luck! 🚀
