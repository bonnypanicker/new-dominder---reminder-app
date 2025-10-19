package app.rork.dominder_android_reminder_app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.DebugLogger
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class AlarmActionBridge : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        DebugLogger.log("AlarmActionBridge: Received action: ${action}")
        
        when (action) {
            "app.rork.dominder.ALARM_DONE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                DebugLogger.log("AlarmActionBridge: Done for ${reminderId}")
                if (reminderId != null) {
                    emitEventToReactNative(context, "alarmDone", reminderId, 0)
                }
            }
            "app.rork.dominder.ALARM_SNOOZE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                val snoozeMinutes = intent.getIntExtra("snoozeMinutes", 0)
                DebugLogger.log("AlarmActionBridge: Snooze ${reminderId} for ${snoozeMinutes} min")
                if (reminderId != null) {
                    emitEventToReactNative(context, "alarmSnooze", reminderId, snoozeMinutes)
                }
            }
        }
    }
    
    private fun emitEventToReactNative(context: Context, eventName: String, reminderId: String, snoozeMinutes: Int) {
        try {
            val app = context.applicationContext
            if (app is ReactApplication) {
                val reactInstanceManager = app.reactNativeHost.reactInstanceManager
                val reactContext = reactInstanceManager.currentReactContext
                
                if (reactContext != null) {
                    DebugLogger.log("AlarmActionBridge: Emitting ${eventName} event to React Native")
                    
                    val params = Arguments.createMap().apply {
                        putString("reminderId", reminderId)
                        if (eventName == "alarmSnooze") {
                            putInt("snoozeMinutes", snoozeMinutes)
                        }
                    }
                    
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(eventName, params)
                    
                    DebugLogger.log("AlarmActionBridge: Event ${eventName} emitted successfully")
                } else {
                    DebugLogger.log("AlarmActionBridge: ReactContext is null")
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error emitting event: ${e.message}")
        }
    }
}