# Final Snooze Flow Analysis - MAXIMUM EFFORT
**Date**: January 26, 2026
**Status**: COMPLETE ANALYSIS

---

## ✅ GOOD NEWS: AlarmActionBridge IS Manifest-Registered!

**Location**: `plugins/with-alarm-module.js` lines 3456-3465

```javascript
receivers.push({
    $: { 'android:name': '.alarm.AlarmActionBridge', 'android:exported': 'false' },
    'intent-filter': [{
        action: [
            { $: { 'android:name': 'app.rork.dominder.ALARM_DONE' } },
            { $: { 'android:name': 'app.rork.dominder.ALARM_SNOOZE' } },  // ✅ REGISTERED!
            { $: { 'android:name': 'com.dominder.MISSED_ALARM' } }
        ]
    }]
});
```

**This means**:
- ✅ AlarmActionBridge will receive broadcasts even when app is killed
- ✅ Android system will start the app process to deliver the broadcast
- ✅ Snooze scheduling WILL work in background

---

## Complete Snooze Flow (When App is Killed)

### Step 1: User Clicks Snooze → Activity Sends Broadcast
```kotlin
// AlarmActivity.handleSnooze()
val intent = Intent("app.rork.dominder.ALARM_SNOOZE").apply {
    setPackage(packageName)
    putExtra("reminderId", reminderId)
    putExtra("snoozeMinutes", minutes)
    putExtra("title", title)
    putExtra("priority", priority)
}
sendBroadcast(intent)
```

### Step 2: Android System Delivers Broadcast
- App process may be killed
- Android sees manifest-registered receiver for "app.rork.dominder.ALARM_SNOOZE"
- Android **starts app process** to deliver broadcast
- AlarmActionBridge.onReceive() is called

### Step 3: AlarmActionBridge Schedules Snooze

#### For Repeating Reminders:
```kotlin
// Create shadow snooze ID
val shadowId = reminderId + "_snooze"  // e.g., "abc123_snooze"

// Store complete metadata
metaPrefs.edit().apply {
    putString("meta_${shadowId}_title", "Snoozed: ${title}")
    putString("meta_${shadowId}_priority", priority)
    putString("meta_${shadowId}_repeatType", "none")  // One-time
    putString("meta_${shadowId}_startDate", snoozeDate)
    putString("meta_${shadowId}_startTime", snoozeTime)
    // ... all other fields
    apply()
}

// Schedule shadow snooze
scheduleNativeAlarm(context, shadowId, "Snoozed: ${title}", priority, snoozeMinutes)
// Request code: "abc123_snooze".hashCode()

// Schedule next regular occurrence
scheduleNextOccurrenceIfNeeded(context, reminderId)
// Request code: "abc123".hashCode()
```

**Result**: Two separate alarms scheduled with different request codes ✅

#### For One-Time Reminders:
```kotlin
// Update metadata with new time
metaPrefs.edit().apply {
    putString("meta_${reminderId}_startDate", snoozeDate)
    putString("meta_${reminderId}_startTime", snoozeTime)
    apply()
}

// Schedule snooze (overwrites original - OK for one-time)
scheduleNativeAlarm(context, reminderId, title, priority, snoozeMinutes)
```

### Step 4: AlarmManager Schedules Alarm
```kotlin
alarmManager.setExactAndAllowWhileIdle(  // ✅ Doze-exempt
    AlarmManager.RTC_WAKEUP,              // ✅ Wakes device
    triggerTime,
    pendingIntent
)
```

### Step 5: Alarm Fires After Snooze Duration
- AlarmReceiver receives broadcast
- Creates full-screen notification
- Starts AlarmRingtoneService (if high priority)
- User sees alarm

---

## ✅ Why This SHOULD Work

### 1. Manifest Registration ✅
- AlarmActionBridge is registered in manifest
- Will receive broadcasts even when app is killed
- Android will start app process to deliver broadcast

### 2. Shadow ID Approach ✅
- Repeating reminders use shadow snooze ID
- Different hash codes prevent collision
- Original reminder preserved

### 3. Doze Mode Compliance ✅
- Uses `setExactAndAllowWhileIdle()`
- Alarm will fire during Doze mode
- Device will wake up

### 4. Complete Metadata ✅
- Shadow snooze has all required metadata
- Can be rescheduled if needed
- No missing fields

---

## ⚠️ POTENTIAL ISSUES FOUND

### Issue #1: Silent Failure on Permission Denial
**Location**: `scheduleNativeAlarm()` line 753

```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
    if (!alarmManager.canScheduleExactAlarms()) {
        DebugLogger.log("AlarmActionBridge: cannot schedule exact alarm, skipping native fallback")
        return  // ❌ FAILS SILENTLY - No fallback!
    }
}
```

**Problem**: If exact alarm permission is denied, snooze is silently skipped

**Fix**: Add fallback to inexact alarm:
```kotlin
if (!alarmManager.canScheduleExactAlarms()) {
    // Fallback to inexact alarm
    alarmManager.setAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP,
        triggerTime,
        pendingIntent
    )
    return
}
```

---

### Issue #2: No Pause Check for Snooze
**Location**: ALARM_SNOOZE handler line 270

**Problem**: Snooze doesn't check if reminder is paused

**Fix**: Add pause check:
```kotlin
"app.rork.dominder.ALARM_SNOOZE" -> {
    val reminderId = intent.getStringExtra("reminderId")
    
    // Check if paused
    val pausePrefs = context.getSharedPreferences("DoMinderPausedReminders", Context.MODE_PRIVATE)
    val isPaused = pausePrefs.getBoolean("paused_${reminderId}", false)
    if (isPaused) {
        DebugLogger.log("AlarmActionBridge: Reminder is PAUSED - ignoring snooze")
        return
    }
    
    // ... rest of snooze logic
}
```

---

### Issue #3: Title Variable Scope (Cosmetic)
**Status**: ✅ ALREADY FIXED

Title is now an instance variable in AlarmActivity, so correct title is passed to snooze.

---

## 🔍 Testing Checklist

### Test 1: One-Time Reminder Snooze (App Killed)
1. Create one-time reminder
2. Let it fire
3. Snooze for 5 minutes
4. **Kill the app** (force stop)
5. ✅ Verify snooze fires after 5 minutes

**Expected**: Snooze works ✅

---

### Test 2: Repeating Reminder Snooze (App Killed)
1. Create repeating reminder (every 1 hour)
2. Let first occurrence fire at 10:00 AM
3. Snooze for 10 minutes
4. **Kill the app** (force stop)
5. ✅ Verify snooze fires at 10:10 AM
6. ✅ Verify next regular occurrence fires at 11:00 AM

**Expected**: Both alarms fire independently ✅

---

### Test 3: Doze Mode Test
1. Create reminder
2. Let it fire
3. Snooze for 15 minutes
4. Put device in Doze mode (screen off, idle)
5. ✅ Verify snooze fires during Doze

**Expected**: Alarm fires during Doze ✅

---

### Test 4: Permission Denied Test
1. Revoke exact alarm permission (if possible)
2. Create reminder
3. Let it fire
4. Snooze for 5 minutes
5. ❌ **BUG**: Snooze fails silently

**Expected**: Should use inexact alarm as fallback

---

## 📊 Summary

### What Works ✅
1. ✅ Manifest registration - Broadcasts received when app is killed
2. ✅ Shadow ID approach - No collision for repeating reminders
3. ✅ Doze mode compliance - Uses correct APIs
4. ✅ Complete metadata - All fields populated
5. ✅ Title variable - Fixed to use instance variable

### What Needs Fixing ⚠️
1. ⚠️ **Silent failure on permission denial** - Add fallback
2. ⚠️ **No pause check** - Add pause state verification

### Critical Question: Why Might Snooze Still Fail?

If snooze is still not working when app is killed, possible causes:

1. **Exact alarm permission denied** (Issue #1)
   - Check: Settings → Apps → DoMinder → Alarms & reminders
   - Fix: Add fallback to inexact alarm

2. **Broadcast delivery timing**
   - Activity finishes before broadcast is delivered
   - Fix: Increase delay from 300ms to 500ms

3. **Metadata not persisted**
   - SharedPreferences not committed before app is killed
   - Fix: Use `commit()` instead of `apply()` for critical data

4. **Device-specific restrictions**
   - Some manufacturers (Xiaomi, Huawei) have aggressive battery optimization
   - Fix: Request battery optimization exemption

---

## 🎯 Recommended Fixes

### Priority 1: Add Fallback for Permission Denial
```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
    if (!alarmManager.canScheduleExactAlarms()) {
        // Fallback to inexact alarm
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerTime,
            pendingIntent
        )
        DebugLogger.log("AlarmActionBridge: Using inexact alarm as fallback")
        return
    }
}
```

### Priority 2: Add Pause Check
```kotlin
"app.rork.dominder.ALARM_SNOOZE" -> {
    val reminderId = intent.getStringExtra("reminderId")
    
    // Check if paused
    val pausePrefs = context.getSharedPreferences("DoMinderPausedReminders", Context.MODE_PRIVATE)
    val isPaused = pausePrefs.getBoolean("paused_${reminderId}", false)
    if (isPaused) {
        return
    }
    
    // ... rest of logic
}
```

### Priority 3: Use commit() for Critical Data
```kotlin
// In handleSnooze()
prefs.edit().apply {
    putString("snoozed_${reminderId}", "${System.currentTimeMillis()}:${minutes}")
    commit()  // ✅ Synchronous - ensures data is saved
}
```

---

## Conclusion

**The snooze flow architecture is CORRECT**:
- ✅ Manifest-registered receiver
- ✅ Shadow ID approach
- ✅ Doze-exempt scheduling
- ✅ Complete metadata

**Minor issues to fix**:
- ⚠️ Add fallback for permission denial
- ⚠️ Add pause check
- ⚠️ Use commit() for critical data

**If snooze still doesn't work after these fixes**, the issue is likely:
- Device-specific battery optimization
- Manufacturer-specific restrictions
- Need to request battery optimization exemption

**Confidence**: HIGH - Architecture is sound, just needs minor fixes.
