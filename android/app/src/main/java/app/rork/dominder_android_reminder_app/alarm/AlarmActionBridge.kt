package app.rork.dominder_android_reminder_app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import app.rork.dominder_android_reminder_app.DebugLogger
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.Calendar

class AlarmActionBridge : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        DebugLogger.log("AlarmActionBridge: ===== onReceive called! =====")
        val action = intent.action
        DebugLogger.log("AlarmActionBridge: Received action: ${action}")
        DebugLogger.log("AlarmActionBridge: Intent extras: ${intent.extras}")
        
        when (action) {
            "app.rork.dominder.ALARM_DONE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                val triggerTime = intent.getLongExtra("triggerTime", System.currentTimeMillis())
                DebugLogger.log("AlarmActionBridge: ALARM_DONE - reminderId: ${reminderId}, triggerTime: ${triggerTime}")
                if (reminderId != null) {
                    // Schedule next occurrence natively for repeating reminders
                    scheduleNextOccurrenceIfNeeded(context, reminderId)
                    
                    DebugLogger.log("AlarmActionBridge: About to emit alarmDone event to React Native")
                    emitEventToReactNative(context, "alarmDone", reminderId, 0, triggerTime)
                    DebugLogger.log("AlarmActionBridge: emitEventToReactNative call completed")
                } else {
                    DebugLogger.log("AlarmActionBridge: ERROR - reminderId is NULL!")
                }
            }
            "app.rork.dominder.ALARM_SNOOZE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                val snoozeMinutes = intent.getIntExtra("snoozeMinutes", 0)
                val title = intent.getStringExtra("title") ?: "Reminder"
                val priority = intent.getStringExtra("priority") ?: "medium"

                DebugLogger.log("AlarmActionBridge: ALARM_SNOOZE - reminderId: ${reminderId}, minutes: ${snoozeMinutes}")
                if (reminderId != null) {
                    // 1. Schedule Native Alarm IMMEDIATELY (Fallback)
                    scheduleNativeAlarm(context, reminderId, title, priority, snoozeMinutes)

                    // 2. Try emit to RN (UI Update)
                    DebugLogger.log("AlarmActionBridge: About to emit alarmSnooze event to React Native")
                    emitEventToReactNative(context, "alarmSnooze", reminderId, snoozeMinutes)
                    DebugLogger.log("AlarmActionBridge: emitEventToReactNative call completed")
                } else {
                    DebugLogger.log("AlarmActionBridge: ERROR - reminderId is NULL!")
                }
            }
            "com.dominder.MISSED_ALARM" -> {
                val reminderId = intent.getStringExtra("reminderId")
                val title = intent.getStringExtra("title")
                val time = intent.getStringExtra("time")
                
                DebugLogger.log("AlarmActionBridge: MISSED_ALARM - reminderId: ${reminderId}")
                
                if (reminderId != null) {
                    emitMissedAlarmToReactNative(context, reminderId, title, time)
                }
            }
            else -> {
                DebugLogger.log("AlarmActionBridge: Unknown action received: ${action}")
            }
        }
    }
    
    /**
     * Schedule the next occurrence for repeating reminders when Done is pressed
     * while the app is killed. This ensures alarms continue even without JS.
     */
    private fun scheduleNextOccurrenceIfNeeded(context: Context, reminderId: String) {
        try {
            val metaPrefs = context.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            val repeatType = metaPrefs.getString("meta_${reminderId}_repeatType", "none") ?: "none"
            
            if (repeatType == "none") {
                DebugLogger.log("AlarmActionBridge: Non-repeating reminder, no next occurrence needed")
                return
            }
            
            val everyValue = metaPrefs.getInt("meta_${reminderId}_everyValue", 1)
            val everyUnit = metaPrefs.getString("meta_${reminderId}_everyUnit", "minutes") ?: "minutes"
            val untilType = metaPrefs.getString("meta_${reminderId}_untilType", "forever") ?: "forever"
            val untilCount = metaPrefs.getInt("meta_${reminderId}_untilCount", 0)
            val untilDate = metaPrefs.getString("meta_${reminderId}_untilDate", "") ?: ""
            val untilTime = metaPrefs.getString("meta_${reminderId}_untilTime", "") ?: ""
            var occurrenceCount = metaPrefs.getInt("meta_${reminderId}_occurrenceCount", 0)
            val startDate = metaPrefs.getString("meta_${reminderId}_startDate", "") ?: ""
            val startTime = metaPrefs.getString("meta_${reminderId}_startTime", "") ?: ""
            val title = metaPrefs.getString("meta_${reminderId}_title", "Reminder") ?: "Reminder"
            val priority = metaPrefs.getString("meta_${reminderId}_priority", "high") ?: "high"
            
            DebugLogger.log("AlarmActionBridge: Metadata - repeatType=$repeatType, everyValue=$everyValue, everyUnit=$everyUnit, untilType=$untilType, untilCount=$untilCount, occurrenceCount=$occurrenceCount")
            
            // Increment occurrence count
            occurrenceCount++
            
            // Check if we've reached the limit
            if (untilType == "count" && occurrenceCount >= untilCount) {
                DebugLogger.log("AlarmActionBridge: Reached occurrence limit ($occurrenceCount >= $untilCount), no more occurrences")
                return
            }
            
            // Calculate next trigger time
            val nextTriggerTime = calculateNextTriggerTime(
                repeatType, everyValue, everyUnit, untilType, untilDate, untilTime, startDate, startTime
            )
            
            if (nextTriggerTime == null || nextTriggerTime <= System.currentTimeMillis()) {
                DebugLogger.log("AlarmActionBridge: No valid next trigger time, reminder may have ended")
                return
            }
            
            // Update occurrence count in SharedPreferences
            metaPrefs.edit().putInt("meta_${reminderId}_occurrenceCount", occurrenceCount).apply()
            DebugLogger.log("AlarmActionBridge: Updated occurrenceCount to $occurrenceCount")
            
            // Schedule the next alarm
            scheduleNativeAlarmAtTime(context, reminderId, title, priority, nextTriggerTime)
            DebugLogger.log("AlarmActionBridge: Scheduled next occurrence at ${java.util.Date(nextTriggerTime)}")
            
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error scheduling next occurrence: ${e.message}")
        }
    }
    
    private fun calculateNextTriggerTime(
        repeatType: String,
        everyValue: Int,
        everyUnit: String,
        untilType: String,
        untilDate: String,
        untilTime: String,
        startDate: String,
        startTime: String
    ): Long? {
        val now = System.currentTimeMillis()
        val calendar = Calendar.getInstance()
        
        when (repeatType) {
            "every" -> {
                // For 'every' type, calculate next aligned occurrence
                val intervalMs = when (everyUnit) {
                    "minutes" -> everyValue * 60 * 1000L
                    "hours" -> everyValue * 60 * 60 * 1000L
                    else -> everyValue * 60 * 1000L
                }
                
                // Parse start time to get the base alignment
                if (startDate.isNotEmpty() && startTime.isNotEmpty()) {
                    try {
                        val dateParts = startDate.split("-")
                        val timeParts = startTime.split(":")
                        if (dateParts.size == 3 && timeParts.size == 2) {
                            calendar.set(Calendar.YEAR, dateParts[0].toInt())
                            calendar.set(Calendar.MONTH, dateParts[1].toInt() - 1)
                            calendar.set(Calendar.DAY_OF_MONTH, dateParts[2].toInt())
                            calendar.set(Calendar.HOUR_OF_DAY, timeParts[0].toInt())
                            calendar.set(Calendar.MINUTE, timeParts[1].toInt())
                            calendar.set(Calendar.SECOND, 0)
                            calendar.set(Calendar.MILLISECOND, 0)
                            
                            val startMs = calendar.timeInMillis
                            
                            // Calculate how many intervals have passed since start
                            val elapsed = now - startMs
                            val intervalsPassed = (elapsed / intervalMs) + 1
                            val nextTrigger = startMs + (intervalsPassed * intervalMs)
                            
                            // Check against end boundary
                            if (untilType == "endsAt" && untilDate.isNotEmpty()) {
                                val endBoundary = parseEndBoundary(untilDate, untilTime, everyUnit)
                                if (nextTrigger > endBoundary) {
                                    return null
                                }
                            }
                            
                            return nextTrigger
                        }
                    } catch (e: Exception) {
                        DebugLogger.log("AlarmActionBridge: Error parsing start date/time: ${e.message}")
                    }
                }
                
                // Fallback: just add interval to now
                return now + intervalMs
            }
            "daily" -> {
                calendar.timeInMillis = now
                calendar.add(Calendar.DAY_OF_MONTH, 1)
                return calendar.timeInMillis
            }
            "weekly" -> {
                calendar.timeInMillis = now
                calendar.add(Calendar.WEEK_OF_YEAR, 1)
                return calendar.timeInMillis
            }
            "monthly" -> {
                calendar.timeInMillis = now
                calendar.add(Calendar.MONTH, 1)
                return calendar.timeInMillis
            }
            "yearly" -> {
                calendar.timeInMillis = now
                calendar.add(Calendar.YEAR, 1)
                return calendar.timeInMillis
            }
            else -> return null
        }
    }
    
    private fun parseEndBoundary(untilDate: String, untilTime: String, everyUnit: String): Long {
        val calendar = Calendar.getInstance()
        try {
            val dateParts = untilDate.split("-")
            if (dateParts.size == 3) {
                calendar.set(Calendar.YEAR, dateParts[0].toInt())
                calendar.set(Calendar.MONTH, dateParts[1].toInt() - 1)
                calendar.set(Calendar.DAY_OF_MONTH, dateParts[2].toInt())
                
                val isTimeBound = everyUnit == "minutes" || everyUnit == "hours"
                if (isTimeBound && untilTime.isNotEmpty()) {
                    val timeParts = untilTime.split(":")
                    if (timeParts.size == 2) {
                        calendar.set(Calendar.HOUR_OF_DAY, timeParts[0].toInt())
                        calendar.set(Calendar.MINUTE, timeParts[1].toInt())
                        calendar.set(Calendar.SECOND, 0)
                    }
                } else {
                    calendar.set(Calendar.HOUR_OF_DAY, 23)
                    calendar.set(Calendar.MINUTE, 59)
                    calendar.set(Calendar.SECOND, 59)
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error parsing end boundary: ${e.message}")
        }
        return calendar.timeInMillis
    }
    
    private fun scheduleNativeAlarmAtTime(context: Context, reminderId: String, title: String, priority: String, triggerTime: Long) {
        try {
            DebugLogger.log("AlarmActionBridge: Scheduling native alarm at specific time")
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = "app.rork.dominder.ALARM_FIRED"
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("priority", priority)
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    DebugLogger.log("AlarmActionBridge: cannot schedule exact alarm, skipping")
                    return
                }
            }

            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            )
            DebugLogger.log("AlarmActionBridge: Native alarm scheduled for ${java.util.Date(triggerTime)}")

        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error scheduling native alarm: ${e.message}")
        }
    }
    
    private fun scheduleNativeAlarm(context: Context, reminderId: String, title: String, priority: String, minutes: Int) {
        try {
            DebugLogger.log("AlarmActionBridge: Scheduling native fallback alarm")
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val triggerTime = System.currentTimeMillis() + (minutes * 60 * 1000L)
            
             val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = "app.rork.dominder.ALARM_FIRED"
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("priority", priority)
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                 if (!alarmManager.canScheduleExactAlarms()) {
                     DebugLogger.log("AlarmActionBridge: cannot schedule exact alarm, skipping native fallback")
                     return
                 }
            }

            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            )
            DebugLogger.log("AlarmActionBridge: Native fallback alarm scheduled for ${triggerTime}")

        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error scheduling native fallback: ${e.message}")
        }
    }
    
    private fun emitMissedAlarmToReactNative(context: Context, reminderId: String, title: String?, time: String?) {
        try {
            val app = context.applicationContext
            if (app is ReactApplication) {
                val reactInstanceManager = app.reactNativeHost.reactInstanceManager
                val reactContext = reactInstanceManager.currentReactContext
                
                if (reactContext != null) {
                    val params = Arguments.createMap().apply {
                        putString("reminderId", reminderId)
                        putString("title", title ?: "Reminder")
                        putString("time", time ?: "")
                    }
                    
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onMissedAlarm", params)
                        
                    DebugLogger.log("AlarmActionBridge: Emitted onMissedAlarm event")
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error emitting missed alarm: ${e.message}")
        }
    }

    private fun emitEventToReactNative(context: Context, eventName: String, reminderId: String, snoozeMinutes: Int, triggerTime: Long = 0L) {
        try {
            DebugLogger.log("AlarmActionBridge: ===== emitEventToReactNative START =====")
            DebugLogger.log("AlarmActionBridge: Event name: ${eventName}, reminderId: ${reminderId}, triggerTime: ${triggerTime}")
            
            val app = context.applicationContext
            DebugLogger.log("AlarmActionBridge: Got application context: ${app.javaClass.name}")
            
            if (app is ReactApplication) {
                DebugLogger.log("AlarmActionBridge: App is ReactApplication ✓")
                
                val reactInstanceManager = app.reactNativeHost.reactInstanceManager
                DebugLogger.log("AlarmActionBridge: Got ReactInstanceManager: ${reactInstanceManager}")
                
                val reactContext = reactInstanceManager.currentReactContext
                DebugLogger.log("AlarmActionBridge: ReactContext: ${reactContext}")
                
                if (reactContext != null) {
                    DebugLogger.log("AlarmActionBridge: ReactContext is VALID ✓")
                    DebugLogger.log("AlarmActionBridge: Creating params map...")
                    
                    val params = Arguments.createMap().apply {
                        putString("reminderId", reminderId)
                        if (eventName == "alarmSnooze") {
                            putInt("snoozeMinutes", snoozeMinutes)
                        }
                        if (eventName == "alarmDone" && triggerTime > 0) {
                            putDouble("triggerTime", triggerTime.toDouble())
                        }
                    }
                    
                    DebugLogger.log("AlarmActionBridge: Params created, emitting event '${eventName}'...")
                    
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(eventName, params)
                    
                    DebugLogger.log("AlarmActionBridge: ✓✓✓ Event '${eventName}' emitted successfully! ✓✓✓")
                } else {
                    DebugLogger.log("AlarmActionBridge: ✗✗✗ ERROR - ReactContext is NULL! ✗✗✗")
                    DebugLogger.log("AlarmActionBridge: This means React Native is not running or was killed")
                }
            } else {
                DebugLogger.log("AlarmActionBridge: ✗✗✗ ERROR - App is NOT ReactApplication! ✗✗✗")
                DebugLogger.log("AlarmActionBridge: App type: ${app.javaClass.name}")
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: ✗✗✗ EXCEPTION in emitEventToReactNative ✗✗✗")
            DebugLogger.log("AlarmActionBridge: Exception: ${e.message}")
            DebugLogger.log("AlarmActionBridge: Stack trace: ${e.stackTraceToString()}")
        }
    }
}