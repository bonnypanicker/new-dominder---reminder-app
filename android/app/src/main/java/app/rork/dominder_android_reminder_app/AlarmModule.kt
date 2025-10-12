package app.rork.dominder_android_reminder_app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.app.Activity
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import app.rork.dominder_android_reminder_app.alarm.AlarmReceiver

class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AlarmModule"
    }

    @ReactMethod
    fun finishAffinity() {
        val activity: Activity? = currentActivity
        activity?.finishAffinity()
    }

    @ReactMethod
    fun scheduleAlarm(reminderId: String, title: String, triggerTimeMillis: Double) {
        val context = reactApplicationContext
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            putExtra("reminderId", reminderId)
            putExtra("title", title)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context, 
            reminderId.hashCode(), // Use reminderId for unique request code
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMillis.toLong(), pendingIntent)
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTimeMillis.toLong(), pendingIntent)
        }
        Log.d("AlarmModule", "Alarm scheduled for $title ($reminderId) at $triggerTimeMillis")
    }

    @ReactMethod
    fun cancelAlarm(reminderId: String) {
        val context = reactApplicationContext
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, AlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context, 
            reminderId.hashCode(), // Use reminderId for unique request code
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )
        alarmManager.cancel(pendingIntent)
        Log.d("AlarmModule", "Alarm cancelled for $reminderId")
    }
}
