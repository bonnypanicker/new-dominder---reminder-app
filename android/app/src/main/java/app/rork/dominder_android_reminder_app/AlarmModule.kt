package app.rork.dominder_android_reminder_app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import app.rork.dominder_android_reminder_app.alarm.AlarmReceiver

class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AlarmModule"
    }

    @ReactMethod
    fun setAlarm(reminderId: String, timestamp: Double) {
        DebugLogger.log("AlarmModule: Setting alarm for reminderId: $reminderId at $timestamp")
        val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(reactApplicationContext, AlarmReceiver::class.java).apply {
            putExtra("reminderId", reminderId)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            reactApplicationContext,
            reminderId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp.toLong(), pendingIntent)
    }

    @ReactMethod
    fun cancelAlarm(reminderId: String) {
        DebugLogger.log("AlarmModule: Cancelling alarm for reminderId: $reminderId")
        val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(reactApplicationContext, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            reactApplicationContext,
            reminderId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pendingIntent)
    }
}