# Gemini CLI Prompt: Fix Android Alarm System

## Context
You are fixing a React Native Expo app's Android native alarm system. The app is a reminder app called "Dominder". The critical issue is that when a high-priority alarm triggers on a locked phone with the app closed, pressing Done or Snooze causes the app's home screen to appear, which should NOT happen.

## Root Cause
`AlarmActivity.kt` launches `MainActivity` using `startActivity()` to pass action data to React Native. This makes the app visible even when it should remain closed.

## Solution Architecture
Replace the activity-launching approach with a broadcast-based architecture:
1. AlarmActivity sends broadcasts for actions (done/snooze)
2. AlarmActionReceiver receives these broadcasts
3. RescheduleAlarmsService processes the actions in the background
4. No MainActivity launch = app stays closed

---

## Files to Modify

### 1. AlarmActivity.kt
**Location**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActivity.kt`

**Changes Required**:

#### A. Add import for NotificationManager
Add after line 4:
```kotlin
import android.app.NotificationManager
```

#### B. Replace handleSnooze() method (lines 64-76)
Replace with:
```kotlin
    private fun handleSnooze() {
        if (reminderId != null) {
            val intent = Intent("app.rork.dominder.ALARM_ACTION").apply {
                putExtra("action", "snooze")
                putExtra("reminderId", reminderId)
                putExtra("snoozeMinutes", 10)
            }
            sendBroadcast(intent)
            Log.d("AlarmActivity", "Sent snooze broadcast for reminderId: $reminderId")
        }
        dismissAlarm()
    }
```

#### C. Replace handleDismiss() method (lines 78-89)
Replace with:
```kotlin
    private fun handleDismiss() {
        if (reminderId != null) {
            val intent = Intent("app.rork.dominder.ALARM_ACTION").apply {
                putExtra("action", "done")
                putExtra("reminderId", reminderId)
            }
            sendBroadcast(intent)
            Log.d("AlarmActivity", "Sent done broadcast for reminderId: $reminderId")
        }
        dismissAlarm()
    }
```

#### D. Replace dismissAlarm() method (lines 91-96)
Replace with:
```kotlin
    private fun dismissAlarm() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        reminderId?.let { 
            notificationManager.cancel(it.hashCode())
            Log.d("AlarmActivity", "Cancelled notification for reminderId: $it")
        }
        
        finish()
        Log.d("AlarmActivity", "AlarmActivity finished")
    }
```

---

### 2. Create AlarmActionReceiver.kt (NEW FILE)
**Location**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActionReceiver.kt`

**Full content**:
```kotlin
package app.rork.dominder_android_reminder_app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import app.rork.dominder_android_reminder_app.RescheduleAlarmsService

class AlarmActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        
        val action = intent.getStringExtra("action")
        val reminderId = intent.getStringExtra("reminderId")
        
        Log.d("AlarmActionReceiver", "Received action: $action for reminderId: $reminderId")
        
        if (action == null || reminderId == null) return
        
        val serviceIntent = Intent(context, RescheduleAlarmsService::class.java).apply {
            putExtra("action", action)
            putExtra("reminderId", reminderId)
            if (action == "snooze") {
                putExtra("snoozeMinutes", intent.getIntExtra("snoozeMinutes", 10))
            }
        }
        
        context.startService(serviceIntent)
        Log.d("AlarmActionReceiver", "Started RescheduleAlarmsService for action: $action")
    }
}
```

---

### 3. RescheduleAlarmsService.kt
**Location**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/RescheduleAlarmsService.kt`

**Changes Required**:

#### A. Add imports at the top (after existing imports)
```kotlin
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread
```

#### B. Add AsyncStorage helper class (before the RescheduleAlarmsService class)
```kotlin
import android.content.SharedPreferences
import androidx.preference.PreferenceManager

object AsyncStorage {
    private lateinit var prefs: SharedPreferences
    
    fun getInstance(context: Context): AsyncStorage {
        prefs = PreferenceManager.getDefaultSharedPreferences(context)
        return this
    }
    
    fun getItem(key: String): String? {
        return prefs.getString(key, null)
    }
    
    fun setItem(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }
}
```

#### C. Replace the entire onStartCommand method
Replace the existing `onStartCommand` with:
```kotlin
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.getStringExtra("action")
        val reminderId = intent?.getStringExtra("reminderId")
        
        if (action != null && reminderId != null) {
            Log.d("RescheduleAlarmsService", "Handling action: $action for reminderId: $reminderId")
            
            thread {
                try {
                    val storage = AsyncStorage.getInstance(applicationContext)
                    val stored = storage.getItem("dominder_reminders")
                    val reminders = if (stored != null) {
                        JSONArray(stored)
                    } else {
                        JSONArray()
                    }
                    
                    for (i in 0 until reminders.length()) {
                        val reminder = reminders.getJSONObject(i)
                        if (reminder.getString("id") == reminderId) {
                            when (action) {
                                "done" -> {
                                    handleDoneAction(reminder, reminders, i, storage)
                                }
                                "snooze" -> {
                                    val snoozeMinutes = intent.getIntExtra("snoozeMinutes", 10)
                                    handleSnoozeAction(reminder, snoozeMinutes, reminders, i, storage)
                                }
                            }
                            break
                        }
                    }
                    
                    storage.setItem("dominder_reminders", reminders.toString())
                    Log.d("RescheduleAlarmsService", "Action $action completed for reminderId: $reminderId")
                    
                } catch (e: Exception) {
                    Log.e("RescheduleAlarmsService", "Error handling action", e)
                } finally {
                    stopSelf(startId)
                }
            }
            
            return START_NOT_STICKY
        }
        
        // Original reschedule logic for boot/reboot
        Log.d("RescheduleAlarmsService", "Starting reschedule service")
        
        thread {
            try {
                val storage = AsyncStorage.getInstance(applicationContext)
                val stored = storage.getItem("dominder_reminders")
                val reminders = if (stored != null) {
                    JSONArray(stored)
                } else {
                    JSONArray()
                }
                
                Log.d("RescheduleAlarmsService", "Found ${reminders.length()} reminders to reschedule")
                
                for (i in 0 until reminders.length()) {
                    val reminder = reminders.getJSONObject(i)
                    val isActive = reminder.optBoolean("isActive", false)
                    val isCompleted = reminder.optBoolean("isCompleted", false)
                    val isPaused = reminder.optBoolean("isPaused", false)
                    
                    if (isActive && !isCompleted && !isPaused) {
                        val id = reminder.getString("id")
                        val title = reminder.getString("title")
                        val priority = reminder.optString("priority", "medium")
                        
                        if (priority == "high") {
                            val nextReminderDate = reminder.optString("nextReminderDate", null)
                            val snoozeUntil = reminder.optString("snoozeUntil", null)
                            
                            val triggerTime = when {
                                snoozeUntil != null -> parseISODate(snoozeUntil)
                                nextReminderDate != null -> parseISODate(nextReminderDate)
                                else -> {
                                    val date = reminder.getString("date")
                                    val time = reminder.getString("time")
                                    parseDateTime(date, time)
                                }
                            }
                            
                            if (triggerTime > System.currentTimeMillis()) {
                                val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
                                val alarmIntent = Intent(this, app.rork.dominder_android_reminder_app.alarm.AlarmReceiver::class.java).apply {
                                    putExtra("reminderId", id)
                                    putExtra("title", title)
                                }
                                val pendingIntent = PendingIntent.getBroadcast(
                                    this,
                                    id.hashCode(),
                                    alarmIntent,
                                    PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                                )
                                
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                                } else {
                                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                                }
                                
                                Log.d("RescheduleAlarmsService", "Rescheduled alarm for $title ($id) at $triggerTime")
                            }
                        }
                    }
                }
                
            } catch (e: Exception) {
                Log.e("RescheduleAlarmsService", "Error rescheduling alarms", e)
            } finally {
                stopSelf(startId)
            }
        }
        
        return START_NOT_STICKY
    }
    
    private fun handleDoneAction(reminder: JSONObject, reminders: JSONArray, index: Int, storage: AsyncStorage) {
        val repeatType = reminder.optString("repeatType", "none")
        
        if (repeatType == "none") {
            reminder.put("isCompleted", true)
            reminder.put("snoozeUntil", JSONObject.NULL)
            reminder.put("wasSnoozed", JSONObject.NULL)
            reminder.put("lastTriggeredAt", getCurrentISODate())
            reminders.put(index, reminder)
            Log.d("RescheduleAlarmsService", "Marked one-time reminder as completed")
        } else {
            val nextDate = calculateNextReminderDate(reminder)
            if (nextDate != null) {
                reminder.put("nextReminderDate", nextDate)
                reminder.put("lastTriggeredAt", getCurrentISODate())
                reminder.put("snoozeUntil", JSONObject.NULL)
                reminder.put("wasSnoozed", JSONObject.NULL)
                reminders.put(index, reminder)
                
                rescheduleReminder(reminder)
                Log.d("RescheduleAlarmsService", "Scheduled next occurrence for repeating reminder")
            } else {
                reminder.put("isCompleted", true)
                reminders.put(index, reminder)
                Log.d("RescheduleAlarmsService", "No next occurrence, marked as completed")
            }
        }
    }
    
    private fun handleSnoozeAction(reminder: JSONObject, snoozeMinutes: Int, reminders: JSONArray, index: Int, storage: AsyncStorage) {
        val snoozeUntil = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000)
        reminder.put("snoozeUntil", formatISODate(snoozeUntil))
        reminder.put("wasSnoozed", true)
        reminder.put("lastTriggeredAt", getCurrentISODate())
        reminders.put(index, reminder)
        
        rescheduleReminder(reminder)
        Log.d("RescheduleAlarmsService", "Snoozed reminder for $snoozeMinutes minutes")
    }
    
    private fun rescheduleReminder(reminder: JSONObject) {
        val id = reminder.getString("id")
        val title = reminder.getString("title")
        val priority = reminder.optString("priority", "medium")
        
        if (priority == "high") {
            val nextReminderDate = reminder.optString("nextReminderDate", null)
            val snoozeUntil = reminder.optString("snoozeUntil", null)
            
            val triggerTime = when {
                snoozeUntil != null -> parseISODate(snoozeUntil)
                nextReminderDate != null -> parseISODate(nextReminderDate)
                else -> {
                    val date = reminder.getString("date")
                    val time = reminder.getString("time")
                    parseDateTime(date, time)
                }
            }
            
            if (triggerTime > System.currentTimeMillis()) {
                val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val alarmIntent = Intent(this, app.rork.dominder_android_reminder_app.alarm.AlarmReceiver::class.java).apply {
                    putExtra("reminderId", id)
                    putExtra("title", title)
                }
                val pendingIntent = PendingIntent.getBroadcast(
                    this,
                    id.hashCode(),
                    alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                )
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                }
                
                Log.d("RescheduleAlarmsService", "Rescheduled alarm for $title ($id) at $triggerTime")
            }
        }
    }
    
    private fun calculateNextReminderDate(reminder: JSONObject): String? {
        // Simplified next date calculation - you may need to enhance this
        val repeatType = reminder.optString("repeatType", "none")
        if (repeatType == "none") return null
        
        // For now, return null - this should be implemented based on your repeat logic
        // You can port the logic from reminder-utils.ts
        return null
    }
    
    private fun parseISODate(isoString: String): Long {
        return try {
            val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
            format.timeZone = java.util.TimeZone.getTimeZone("UTC")
            format.parse(isoString)?.time ?: 0L
        } catch (e: Exception) {
            Log.e("RescheduleAlarmsService", "Error parsing ISO date: $isoString", e)
            0L
        }
    }
    
    private fun parseDateTime(date: String, time: String): Long {
        return try {
            val parts = date.split("-")
            val timeParts = time.split(":")
            val calendar = java.util.Calendar.getInstance()
            calendar.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt(), timeParts[0].toInt(), timeParts[1].toInt(), 0)
            calendar.timeInMillis
        } catch (e: Exception) {
            Log.e("RescheduleAlarmsService", "Error parsing date/time: $date $time", e)
            0L
        }
    }
    
    private fun getCurrentISODate(): String {
        val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
        format.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return format.format(java.util.Date())
    }
    
    private fun formatISODate(timestamp: Long): String {
        val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
        format.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return format.format(java.util.Date(timestamp))
    }
```

---

### 4. AndroidManifest.xml
**Location**: `android/app/src/main/AndroidManifest.xml`

**Changes Required**:

Add this receiver registration after line 48 (after the existing AlarmReceiver):
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

## Summary of Changes

1. **AlarmActivity.kt**: Changed from launching MainActivity to sending broadcasts
2. **AlarmActionReceiver.kt**: NEW - Receives action broadcasts and starts service
3. **RescheduleAlarmsService.kt**: Enhanced to handle done/snooze actions in background
4. **AndroidManifest.xml**: Registered the new AlarmActionReceiver

## Expected Behavior After Fix

### Condition E: Phone LOCKED + App CLOSED
1. ✅ Screen lights up at trigger time
2. ✅ AlarmActivity shows with alarm sound
3. ✅ User presses Done or Snooze
4. ✅ AlarmActivity sends broadcast and finishes
5. ✅ AlarmActionReceiver receives broadcast
6. ✅ RescheduleAlarmsService processes action in background
7. ✅ Alarm UI disappears
8. ✅ **App home screen does NOT appear**
9. ✅ Phone returns to lock screen

## Testing Instructions

1. Build and install the app
2. Create a high-priority reminder for 2 minutes from now
3. Lock the phone and wait
4. When alarm triggers, verify:
   - Screen lights up
   - AlarmActivity shows
   - Press Done
   - Alarm disappears
   - **App home screen does NOT appear**
   - Phone returns to lock screen

## Additional Notes

- The AsyncStorage implementation uses SharedPreferences as a simple key-value store
- The calculateNextReminderDate function is simplified - you may need to port the full logic from reminder-utils.ts
- All actions are logged for debugging
- The service runs in a background thread to avoid blocking

---

## Gemini CLI Command

Save this entire prompt to a file called `fix-prompt.txt` and run:

```bash
gemini -m gemini-2.0-flash-exp -f fix-prompt.txt
```

Then ask Gemini to:
1. Read and understand the current code
2. Apply all the changes listed above
3. Verify the changes are correct
4. Show the diff for each file
