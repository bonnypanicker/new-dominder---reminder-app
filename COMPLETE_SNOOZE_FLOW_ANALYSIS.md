# Complete Snooze Flow Analysis - MAXIMUM EFFORT
**Date**: January 26, 2026
**Code Version**: Restored older code with shadow snooze approach

---

## 🔴 CRITICAL ISSUES FOUND

### Issue #1: PendingIntent Collision (CRITICAL)
**Location**: `scheduleNativeAlarm()` line 743
**Severity**: CRITICAL - Breaks repeating reminders

```kotlin
val pendingIntent = PendingIntent.getBroadcast(
    context,
    reminderId.hashCode(),  // ❌ PROBLEM: Uses same request code for both snooze and original
    intent,
    PendingIntent.FLAG_UPDATE_CURRENT  // ❌ This OVERWRITES the original alarm
)
```

**Problem**:
- For repeating reminders, the code creates a shadow snooze ID: `reminderId + "_snooze"`
- But `scheduleNativeAlarm()` uses `reminderId.hashCode()` as the request code
- `"abc123".hashCode()` ≠ `"abc123_snooze".hashCode()` ✅ (Different hash codes)
- **WAIT** - This should work! Let me verify...

Actually, the shadow ID approach SHOULD work because:
- Original reminder: `reminderId = "abc123"` → request code = `"abc123".hashCode()`
- Snooze alarm: `reminderId = "abc123_snooze"` → request code = `"abc123_snooze".hashCode()`
- These are DIFFERENT request codes ✅

**BUT WAIT** - Let me check if scheduleNextOccurrenceIfNeeded is called...

---

### Issue #2: scheduleNextOccurrenceIfNeeded May Not Work When App is Killed
**Location**: Line 296 in ALARM_SNOOZE handler

```kotlin
// 2. Advance Series (Schedule Next Regular Occurrence)
scheduleNextOccurrenceIfNeeded(context, reminderId)
```

**Problem**: This function is called AFTER snooze is scheduled. Let me check what it does:

---

## Complete Flow Trace

### Step 1: User Clicks Snooze (App May Be Killed After This)
**File**: AlarmActivity.kt
**Lines**: 1344-1380

```kotlin
private fun handleSnooze(minutes: Int) {
    // 1. Cancel timeout ✅
    timeoutRunnable?.let { handler.removeCallbacks(it) }
    
    // 2. Stop ringtone ✅
    AlarmRingtoneService.stopAlarmRingtone(this)
    
    // 3. Save to SharedPreferences ✅
    val prefs = getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
    prefs.edit().apply {
        putString("snoozed_${reminderId}", "${System.currentTimeMillis()}:${minutes}")
        apply()
    }
    
    // 4. Send broadcast ✅
    val intent = Intent("app.rork.dominder.ALARM_SNOOZE").apply {
        setPackage(packageName)
        putExtra("reminderId", reminderId)
        putExtra("snoozeMinutes", minutes)
        putExtra("title", title)  // ✅ Uses instance variable
        putExtra("priority", priority)
    }
    sendBroadcast(intent)
    
    // 5. Finish activity after 300ms
    Handler.postDelayed({
        cancelNotification()
        finishAlarmProperly()
    }, 300)
}
```

**Analysis**:
- ✅ Broadcast is sent BEFORE activity finishes
- ✅ 300ms delay gives time for broadcast to be received
- ⚠️ If app is killed during this 300ms, broadcast may not be received

---

### Step 2: AlarmActionBridge Receives Broadcast
**File**: AlarmActionBridge.kt
**Lines**: 264-380

```kotlin
"app.rork.dominder.ALARM_SNOOZE" -> {
    val reminderId = intent.getStringExtra("reminderId")
    val snoozeMinutes = intent.getIntExtra("snoozeMinutes", 0)
    val title = intent.getStringExtra("title") ?: "Reminder"
    val priority = intent.getStringExtra("priority") ?: "medium"
    
    if (reminderId != null) {
        // Check if repeating
        val metaPrefs = context.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
        val repeatType = metaPrefs.getString("meta_${reminderId}_repeatType", "none") ?: "none"
        
        if (repeatType != "none") {
            // REPEATING REMINDER PATH
            
            // 1. Create shadow snooze ID
            val shadowId = reminderId + "_snooze"
            
            // 2. Calculate snooze time
            val snoozeTimeMs = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000L)
            
            // 3. Store COMPLETE metadata for shadow snooze
            metaPrefs.edit().apply {
                putString("meta_${shadowId}_title", "Snoozed: ${title}")
                putString("meta_${shadowId}_priority", priority)
                putString("meta_${shadowId}_repeatType", "none")  // ✅ Force one-time
                putString("meta_${shadowId}_startDate", snoozeDate)
                putString("meta_${shadowId}_startTime", snoozeTime)
                // ... all other metadata fields
                apply()
            }
            
            // 4. Schedule shadow snooze alarm
            scheduleNativeAlarm(context, shadowId, "Snoozed: ${title}", priority, snoozeMinutes)
            
            // 5. Schedule next regular occurrence
            scheduleNextOccurrenceIfNeeded(context, reminderId)
            
        } else {
            // ONE-TIME REMINDER PATH
            
            // Update metadata with new snooze time
            metaPrefs.edit().apply {
                putString("meta_${reminderId}_startDate", snoozeDate)
                putString("meta_${reminderId}_startTime", snoozeTime)
                apply()
            }
            
            // Schedule snooze (overwrites original)
            scheduleNativeAlarm(context, reminderId, title, priority, snoozeMinutes)
        }
        
        // Try emit to RN (will fail if app is killed)
        emitEventToReactNative(context, "alarmSnooze", reminderId, snoozeMinutes)
    }
}
```

**Analysis**:
- ✅ Shadow ID approach prevents collision for repeating reminders
- ✅ Complete metadata stored for shadow snooze
- ✅ scheduleNextOccurrenceIfNeeded called to advance series
- ⚠️ **CRITICAL**: What if app is killed BEFORE this broadcast is received?

---

### Step 3: scheduleNativeAlarm Schedules the Alarm
**File**: AlarmActionBridge.kt
**Lines**: 727-768

```kotlin
private fun scheduleNativeAlarm(context: Context, reminderId: String, title: String, priority: String, minutes: Int) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    
    val triggerTime = System.currentTimeMillis() + (minutes * 60 * 1000L)
    
    val intent = Intent(context, AlarmReceiver::class.java).apply {
        action = "app.rork.dominder.ALARM_FIRED"
        putExtra("reminderId", reminderId)  // For repeating: "abc123_snooze"
        putExtra("title", title)
        putExtra("priority", priority)
        addFlags(Intent.FLAG_RECEIVER_FOREGROUND)
    }
    
    val pendingIntent = PendingIntent.getBroadcast(
        context,
        reminderId.hashCode(),  // "abc123_snooze".hashCode() - UNIQUE!
        intent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    
    // Check permission (API 31+)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        if (!alarmManager.canScheduleExactAlarms()) {
            return  // ❌ FAILS SILENTLY!
        }
    }
    
    // Schedule alarm
    alarmManager.setExactAndAllowWhileIdle(  // ✅ Doze-exempt
        AlarmManager.RTC_WAKEUP,              // ✅ Wake device
        triggerTime,
        pendingIntent
    )
}
```

**Analysis**:
- ✅ Uses `setExactAndAllowWhileIdle()` - Doze-exempt
- ✅ Uses `RTC_WAKEUP` - Wakes device
- ✅ Shadow ID creates unique request code
- ❌ **FAILS SILENTLY** if exact alarm permission denied

---

## 🔴 ROOT CAUSE ANALYSIS

### The Real Problem: Broadcast Delivery When App is Killed

**Scenario**:
1. User clicks snooze button
2. `handleSnooze()` sends broadcast
3. Activity finishes after 300ms
4. **App process is killed** (by system or user)
5. ❌ **Broadcast is LOST** - AlarmActionBridge never receives it
6. ❌ **Snooze alarm is NEVER scheduled**

**Why This Happens**:
- Broadcasts are delivered to **running** BroadcastReceivers
- If app process is killed before broadcast is delivered, it's lost
- AlarmActionBridge is NOT a manifest-registered receiver (it's dynamically registered)
- **Wait, let me check the manifest...**

---

## Manifest Check

Let me search for AlarmActionBridge in manifest registration:

<function_calls>
<invoke name="grepSearch">
<parameter name="explanation">Checking if AlarmActionBridge is registered in the manifest