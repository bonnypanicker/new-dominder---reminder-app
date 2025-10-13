# Gemini CLI Prompt: Fix DoMinder Android Kotlin Code

## Context
You are fixing critical bugs in a React Native reminder app's Android native code. The app has ringer mode (high priority) reminders that should light up the screen when the phone is locked, but currently they don't work properly.

## Files to Fix

### 1. Fix AlarmReceiver.kt

**File:** `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt`

**Problem:** The persistent notification doesn't have a full-screen intent, so it won't light up the screen when the phone is locked.

**Instructions:**
1. Locate the `showPersistentNotification()` function (around line 46)
2. After creating `tapPendingIntent` (around line 74), add this code:

```kotlin
// Create full-screen intent for locked screen
val fullScreenIntent = Intent(context, AlarmActivity::class.java).apply {
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    putExtra("reminderId", reminderId)
    putExtra("title", title)
    putExtra("fromFullScreen", true)
}
val fullScreenPendingIntent = PendingIntent.getActivity(
    context,
    (reminderId.hashCode() + 1000),
    fullScreenIntent,
    PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
)
```

3. In the notification builder (around line 76), add `.setFullScreenIntent(fullScreenPendingIntent, true)` before `.build()`:

```kotlin
val notification = NotificationCompat.Builder(context, channelId)
    .setContentTitle(title)
    .setContentText("Tap to open alarm")
    .setSmallIcon(R.mipmap.ic_launcher)
    .setPriority(NotificationCompat.PRIORITY_HIGH)
    .setCategory(NotificationCompat.CATEGORY_ALARM)
    .setOngoing(true)
    .setAutoCancel(false)
    .setContentIntent(tapPendingIntent)
    .setFullScreenIntent(fullScreenPendingIntent, true)  // ADD THIS LINE
    .build()
```

---

### 2. Fix RescheduleAlarmsService.kt

**File:** `android/app/src/main/java/app/rork/dominder_android_reminder_app/RescheduleAlarmsService.kt`

**Problem:** The `calculateNextReminderDate()` function always returns null, breaking repeating reminders.

**Instructions:**
1. Locate the `calculateNextReminderDate()` function (around line 238)
2. Replace the entire function with this implementation:

```kotlin
private fun calculateNextReminderDate(reminder: JSONObject): String? {
    val repeatType = reminder.optString("repeatType", "none")
    if (repeatType == "none") return null
    
    val date = reminder.getString("date")
    val time = reminder.getString("time")
    val parts = date.split("-")
    val timeParts = time.split(":")
    
    val calendar = java.util.Calendar.getInstance()
    calendar.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt(), timeParts[0].toInt(), timeParts[1].toInt(), 0)
    calendar.set(java.util.Calendar.MILLISECOND, 0)
    
    val now = java.util.Calendar.getInstance()
    
    when (repeatType) {
        "daily" -> {
            // Move to next day if time has passed today
            if (calendar.before(now)) {
                calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
            }
            
            // Check if specific days are set
            val repeatDays = reminder.optJSONArray("repeatDays")
            if (repeatDays != null && repeatDays.length() > 0) {
                val allowedDays = mutableListOf<Int>()
                for (i in 0 until repeatDays.length()) {
                    allowedDays.add(repeatDays.getInt(i))
                }
                
                // Find next allowed day (convert Calendar.DAY_OF_WEEK to 0=Sun format)
                var attempts = 0
                while (attempts < 7) {
                    val dayOfWeek = (calendar.get(java.util.Calendar.DAY_OF_WEEK) + 5) % 7
                    if (allowedDays.contains(dayOfWeek)) {
                        break
                    }
                    calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
                    attempts++
                }
            }
        }
        "weekly" -> {
            // Check if specific days are set
            val repeatDays = reminder.optJSONArray("repeatDays")
            if (repeatDays != null && repeatDays.length() > 0) {
                val allowedDays = mutableListOf<Int>()
                for (i in 0 until repeatDays.length()) {
                    allowedDays.add(repeatDays.getInt(i))
                }
                
                // Move to next day first
                calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
                
                // Find next allowed day
                var attempts = 0
                while (attempts < 7) {
                    val dayOfWeek = (calendar.get(java.util.Calendar.DAY_OF_WEEK) + 5) % 7
                    if (allowedDays.contains(dayOfWeek)) {
                        break
                    }
                    calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
                    attempts++
                }
            } else {
                // No specific days, just add 7 days
                calendar.add(java.util.Calendar.WEEK_OF_YEAR, 1)
            }
        }
        "monthly" -> {
            calendar.add(java.util.Calendar.MONTH, 1)
        }
        "yearly" -> {
            calendar.add(java.util.Calendar.YEAR, 1)
        }
        "every" -> {
            val everyInterval = reminder.optJSONObject("everyInterval")
            if (everyInterval != null) {
                val value = everyInterval.optInt("value", 1)
                val unit = everyInterval.optString("unit", "hours")
                
                when (unit) {
                    "minutes" -> calendar.add(java.util.Calendar.MINUTE, value)
                    "hours" -> calendar.add(java.util.Calendar.HOUR_OF_DAY, value)
                    "days" -> calendar.add(java.util.Calendar.DAY_OF_MONTH, value)
                    "weeks" -> calendar.add(java.util.Calendar.WEEK_OF_YEAR, value)
                    "months" -> calendar.add(java.util.Calendar.MONTH, value)
                }
            } else {
                return null
            }
        }
        else -> return null
    }
    
    return formatISODate(calendar.timeInMillis)
}
```

---

### 3. Add DeviceEvent Emission (Optional but Recommended)

**File:** `android/app/src/main/java/app/rork/dominder_android_reminder_app/RescheduleAlarmsService.kt`

**Problem:** React Native doesn't know when native code modifies reminders.

**Instructions:**
1. Add this import at the top of the file:

```kotlin
import com.facebook.react.modules.core.DeviceEventManagerModule
```

2. After line 67 (after `storage.setItem("dominder_reminders", reminders.toString())`), add:

```kotlin
// Notify React Native about the change
try {
    val app = application as? MainApplication
    if (app != null) {
        val reactInstanceManager = app.reactNativeHost.reactInstanceManager
        val reactContext = reactInstanceManager.currentReactContext
        
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("remindersChanged", null)
            
            Log.d("RescheduleAlarmsService", "Emitted remindersChanged event")
        } else {
            Log.w("RescheduleAlarmsService", "React context not available")
        }
    }
} catch (e: Exception) {
    Log.e("RescheduleAlarmsService", "Error emitting event", e)
}
```

---

## Verification

After making these changes:

1. **Build the app:** `cd android && ./gradlew clean && ./gradlew assembleDebug`
2. **Install on device:** `adb install -r app/build/outputs/apk/debug/app-debug.apk`
3. **Test scenarios:**
   - Lock phone, wait for reminder → Screen should light up with AlarmActivity
   - Unlock phone, wait for reminder → Notification appears, tap opens AlarmActivity
   - Press Done/Snooze → Should work correctly
   - Test repeating reminders → Should reschedule properly

4. **Check logs:** `adb logcat | grep -E "(AlarmReceiver|AlarmActivity|RescheduleAlarmsService)"`

---

## Expected Behavior After Fixes

### When Phone is Locked:
- Screen lights up automatically
- AlarmActivity appears on top of lock screen
- User can press Done/Snooze without unlocking

### When Phone is Unlocked:
- Persistent notification appears
- Tapping notification opens AlarmActivity
- Done/Snooze buttons work correctly

### Repeating Reminders:
- Daily reminders reschedule to next day
- Weekly reminders reschedule to next week
- Monthly/Yearly reminders work correctly
- "Every X hours/days" reminders work correctly

---

## Important Notes

1. **Android 12+ Permission:** Users must grant "Alarms & reminders" permission for full-screen intents
2. **Testing:** Test on both locked and unlocked states
3. **Logs:** Monitor logcat for any errors
4. **State Sync:** The DeviceEvent emission ensures React Native stays in sync

---

## Command to Apply Fixes

If using Gemini CLI:

```bash
gemini apply-fixes \
  --file android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt \
  --file android/app/src/main/java/app/rork/dominder_android_reminder_app/RescheduleAlarmsService.kt \
  --instructions "$(cat GEMINI_KOTLIN_FIX_PROMPT.md)"
```

---

Generated: 2025-01-XX
