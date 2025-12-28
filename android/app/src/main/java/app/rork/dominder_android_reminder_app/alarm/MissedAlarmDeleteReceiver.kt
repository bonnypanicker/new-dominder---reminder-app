package app.rork.dominder_android_reminder_app.alarm

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.DebugLogger
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

class MissedAlarmDeleteReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "com.dominder.DELETE_MISSED_ALARM") return
        
        val reminderId = intent.getStringExtra("reminderId") ?: return
        val notificationId = intent.getIntExtra("notificationId", 0)
        
        DebugLogger.log("MissedAlarmDeleteReceiver: Delete action for reminder $reminderId")
        
        // Cancel the notification
        if (notificationId != 0) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
            DebugLogger.log("MissedAlarmDeleteReceiver: Cancelled notification $notificationId")
        }
        
        // Mark reminder as deleted in SharedPreferences for JS to pick up
        try {
            val prefs = context.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString("deleted_${reminderId}", System.currentTimeMillis().toString())
                apply()
            }
            DebugLogger.log("MissedAlarmDeleteReceiver: Saved deletion to SharedPreferences")
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
                        .emit("onMissedAlarmDeleted", params)
                        
                    DebugLogger.log("MissedAlarmDeleteReceiver: Emitted onMissedAlarmDeleted event")
                } else {
                    DebugLogger.log("MissedAlarmDeleteReceiver: ReactContext is null, deletion saved to SharedPreferences")
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("MissedAlarmDeleteReceiver: Error emitting event: ${e.message}")
        }
    }
}