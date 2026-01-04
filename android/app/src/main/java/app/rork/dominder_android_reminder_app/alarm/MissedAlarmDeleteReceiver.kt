package app.rork.dominder_android_reminder_app.alarm

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.DebugLogger
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class MissedAlarmDeleteReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "com.dominder.DISMISS_MISSED_ALARM") return
        
        val reminderId = intent.getStringExtra("reminderId") ?: return
        val notificationId = intent.getIntExtra("notificationId", 0)
        val isRepeating = intent.getBooleanExtra("isRepeating", false)
        
        DebugLogger.log("MissedAlarmDeleteReceiver: Dismiss action for reminder $reminderId (isRepeating: $isRepeating)")
        
        // Cancel the notification
        if (notificationId != 0) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
            DebugLogger.log("MissedAlarmDeleteReceiver: Cancelled notification $notificationId")
        }
        
        // For repeating reminders, just cancel the notification (do nothing else)
        // For once reminders, permanently delete the reminder
        if (!isRepeating) {
            // Mark reminder as dismissed (permanently deleted) in SharedPreferences for JS to pick up
            try {
                val prefs = context.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
                prefs.edit().apply {
                    putString("dismissed_${reminderId}", System.currentTimeMillis().toString())
                    apply()
                }
                DebugLogger.log("MissedAlarmDeleteReceiver: Saved dismissal to SharedPreferences for once reminder")
            } catch (e: Exception) {
                DebugLogger.log("MissedAlarmDeleteReceiver: Error saving to SharedPreferences: ${e.message}")
            }
            
            // Try to emit event to React Native if app is running
            try {
                val app = context.applicationContext
                if (app is ReactApplication) {
                    val reactInstanceManager = app.reactNativeHost.reactInstanceManager
                    val reactContext = reactInstanceManager.currentReactContext
                    
                    if (reactContext != null) {
                        val params = Arguments.createMap().apply {
                            putString("reminderId", reminderId)
                        }
                        
                        reactContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            .emit("onMissedAlarmDismissed", params)
                            
                        DebugLogger.log("MissedAlarmDeleteReceiver: Emitted onMissedAlarmDismissed event")
                    } else {
                        DebugLogger.log("MissedAlarmDeleteReceiver: ReactContext is null, dismissal saved to SharedPreferences")
                    }
                }
            } catch (e: Exception) {
                DebugLogger.log("MissedAlarmDeleteReceiver: Error emitting event: ${e.message}")
            }
        } else {
            DebugLogger.log("MissedAlarmDeleteReceiver: Repeating reminder - just cancelled notification, no further action")
        }
    }
}