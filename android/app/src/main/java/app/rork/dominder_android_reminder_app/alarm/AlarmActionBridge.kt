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
                val triggerTime = intent.getLongExtra("triggerTime", System.currentTimeMillis())
                DebugLogger.log("AlarmActionBridge: ALARM_DONE - reminderId: ${reminderId}, triggerTime: ${triggerTime}")
                if (reminderId != null) {
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
                    DebugLogger.log("AlarmActionBridge: Starting BackgroundActionService to handle '${eventName}'")
                    
                    // Map event name to cleaner action string
                    val action = when(eventName) {
                        "alarmDone" -> "done"
                        "alarmSnooze" -> "snooze"
                        else -> eventName
                    }
                    
                    startBackgroundService(context, reminderId, action, snoozeMinutes, triggerTime)
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

    private fun startBackgroundService(context: Context, reminderId: String, action: String, snoozeMinutes: Int, triggerTime: Long) {
        try {
            val serviceIntent = Intent(context, BackgroundActionService::class.java).apply {
                putExtra("reminderId", reminderId)
                putExtra("action", action)
                if (action == "snooze") {
                    putExtra("snoozeMinutes", snoozeMinutes)
                }
                if (triggerTime > 0) {
                    putExtra("triggerTime", triggerTime)
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            DebugLogger.log("AlarmActionBridge: Started BackgroundActionService")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Failed to start service: ${e.message}")
        }
    }
}