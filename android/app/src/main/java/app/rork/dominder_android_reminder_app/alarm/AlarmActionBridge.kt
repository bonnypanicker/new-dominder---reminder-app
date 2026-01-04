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

class AlarmActionBridge : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        DebugLogger.log("AlarmActionBridge: ===== onReceive called! =====")
        val action = intent.action
        DebugLogger.log("AlarmActionBridge: Received action: ${action}")
        DebugLogger.log("AlarmActionBridge: Intent extras: ${intent.extras}")
        
        when (action) {
            "app.rork.dominder.ALARM_DONE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                DebugLogger.log("AlarmActionBridge: ALARM_DONE - reminderId: ${reminderId}")
                
                val interval = intent.getDoubleExtra("interval", 0.0)
                val unit = intent.getStringExtra("unit")
                val endDate = intent.getDoubleExtra("endDate", 0.0)
                val triggerTime = intent.getDoubleExtra("triggerTime", 0.0)
                val title = intent.getStringExtra("title") ?: "Reminder"
                val priority = intent.getStringExtra("priority") ?: "medium"

                if (reminderId != null) {
                    DebugLogger.log("AlarmActionBridge: About to emit alarmDone event to React Native")
                    emitEventToReactNative(context, "alarmDone", reminderId, 0)
                    DebugLogger.log("AlarmActionBridge: emitEventToReactNative call completed")
                    
                    // Native Rescheduling Fallback
                    if (interval > 0 && unit != null) {
                        DebugLogger.log("AlarmActionBridge: Attempting native reschedule (interval=${interval} ${unit})")
                        scheduleNextAlarm(context, reminderId, title, priority, interval, unit, endDate, triggerTime)
                    }
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
                val title = intent.getStringExtra("title") ?: "Reminder"
                val time = intent.getStringExtra("time")
                
                // Get recurrence info from SharedPreferences or intent
                val interval = intent.getDoubleExtra("interval", 0.0)
                val unit = intent.getStringExtra("unit")
                val endDate = intent.getDoubleExtra("endDate", 0.0)
                val triggerTime = intent.getDoubleExtra("triggerTime", 0.0)
                val priority = intent.getStringExtra("priority") ?: "medium"
                
                DebugLogger.log("AlarmActionBridge: MISSED_ALARM - reminderId: ${reminderId}, interval: ${interval} ${unit}")
                
                if (reminderId != null) {
                    emitMissedAlarmToReactNative(context, reminderId, title, time)
                    
                    // Native Rescheduling Fallback for missed alarms with recurrence
                    if (interval > 0 && unit != null) {
                        DebugLogger.log("AlarmActionBridge: Attempting native reschedule for missed alarm (interval=${interval} ${unit})")
                        scheduleNextAlarm(context, reminderId, title, priority, interval, unit, endDate, triggerTime)
                    }
                }
            }
            else -> {
                DebugLogger.log("AlarmActionBridge: Unknown action received: ${action}")
            }
        }
    }
    
    private fun calculateNextTime(baseTime: Long, interval: Double, unit: String): Long {
        val multiplier = when (unit.lowercase()) {
            "minutes", "minute" -> 60 * 1000L
            "hours", "hour" -> 60 * 60 * 1000L
            "days", "day" -> 24 * 60 * 60 * 1000L
            "weeks", "week" -> 7 * 24 * 60 * 60 * 1000L
            else -> 0L
        }
        return baseTime + (interval * multiplier).toLong()
    }

    private fun scheduleNextAlarm(context: Context, reminderId: String, title: String, priority: String, interval: Double, unit: String, endDate: Double, lastTriggerTime: Double) {
        try {
            val now = System.currentTimeMillis()
            
            // Use lastTriggerTime as base to prevent slip. If invalid (0), fallback to now.
            var baseTime = if (lastTriggerTime > 0) lastTriggerTime.toLong() else now
            
            var nextTime = calculateNextTime(baseTime, interval, unit)
            
            // If nextTime is already in the past (e.g. user delayed action, or device was off),
            // catch up by adding intervals until we are in the future.
            // This maintains the cadence (e.g. 12:00, 12:02, 12:04) even if processed at 12:03.
            while (nextTime <= now) {
                DebugLogger.log("AlarmActionBridge: nextTime ${nextTime} is in past (now=${now}), adding interval to catch up")
                nextTime = calculateNextTime(nextTime, interval, unit)
            }
            
            // If endDate is set and nextTime is past it, don't schedule
            if (endDate > 0 && nextTime > endDate) {
                DebugLogger.log("AlarmActionBridge: Next alarm time ${nextTime} is past end date ${endDate}, skipping")
                return
            }
            
            DebugLogger.log("AlarmActionBridge: Scheduling next recurring alarm for ${nextTime}")
            
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = "app.rork.dominder.ALARM_FIRED"
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("priority", priority)
                // Pass recurrence info for next time
                putExtra("interval", interval)
                putExtra("unit", unit)
                putExtra("endDate", endDate)
                putExtra("triggerTime", nextTime.toDouble()) // Update triggerTime for next loop
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                 if (!alarmManager.canScheduleExactAlarms()) {
                     DebugLogger.log("AlarmActionBridge: cannot schedule exact alarm for recurrence")
                     return
                 }
            }

            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                nextTime,
                pendingIntent
            )
            DebugLogger.log("AlarmActionBridge: Recurring alarm scheduled successfully")

        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error scheduling recurring alarm: ${e.message}")
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

    private fun emitEventToReactNative(context: Context, eventName: String, reminderId: String, snoozeMinutes: Int) {
        try {
            DebugLogger.log("AlarmActionBridge: ===== emitEventToReactNative START =====")
            DebugLogger.log("AlarmActionBridge: Event name: ${eventName}, reminderId: ${reminderId}")
            
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