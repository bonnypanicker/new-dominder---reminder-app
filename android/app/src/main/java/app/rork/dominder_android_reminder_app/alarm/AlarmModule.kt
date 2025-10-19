package app.rork.dominder_android_reminder_app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import app.rork.dominder_android_reminder_app.DebugLogger

class AlarmModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AlarmModule"

    @ReactMethod
    fun scheduleAlarm(reminderId: String, title: String, triggerTime: Double, promise: Promise? = null) {
        try {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    DebugLogger.log("AlarmModule: SCHEDULE_EXACT_ALARM permission not granted")
                    promise?.reject("PERMISSION_DENIED", "SCHEDULE_EXACT_ALARM permission not granted")
                    return
                }
            }
            
            val intent = Intent(reactContext, AlarmReceiver::class.java).apply {
                action = "app.rork.dominder.ALARM_FIRED"
                putExtra("reminderId", reminderId)
                putExtra("title", title)
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            DebugLogger.log("AlarmModule: Scheduling alarm broadcast for $reminderId at $triggerTime")
            
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime.toLong(),
                pendingIntent
            )
            
            DebugLogger.log("AlarmModule: Successfully scheduled alarm broadcast")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error scheduling alarm: $e.message")
            promise?.reject("SCHEDULE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAlarm(reminderId: String, promise: Promise? = null) {
        try {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(reactContext, AlarmReceiver::class.java).apply {
                action = "app.rork.dominder.ALARM_FIRED"
            }
            val pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            promise?.resolve(true)
        } catch (e: Exception) {
            promise?.reject("CANCEL_ERROR", e.message, e)
        }
    }
}