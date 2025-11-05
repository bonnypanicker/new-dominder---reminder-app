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
        DebugLogger.log("AlarmActionBridge: ===== onReceive called! =====")
        val action = intent.action
        DebugLogger.log("AlarmActionBridge: Received action: ${action}")
        DebugLogger.log("AlarmActionBridge: Intent extras: ${intent.extras}")
        
        when (action) {
            "app.rork.dominder.ALARM_DONE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                DebugLogger.log("AlarmActionBridge: ALARM_DONE - reminderId: ${reminderId}")
                if (reminderId != null) {
                    DebugLogger.log("AlarmActionBridge: About to emit alarmDone event to React Native")
                    emitEventToReactNative(context, "alarmDone", reminderId, 0)
                    DebugLogger.log("AlarmActionBridge: emitEventToReactNative call completed")
                } else {
                    DebugLogger.log("AlarmActionBridge: ERROR - reminderId is NULL!")
                }
            }
            "app.rork.dominder.ALARM_SNOOZE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                val snoozeMinutes = intent.getIntExtra("snoozeMinutes", 0)
                DebugLogger.log("AlarmActionBridge: ALARM_SNOOZE - reminderId: ${reminderId}, minutes: ${snoozeMinutes}")
                if (reminderId != null) {
                    DebugLogger.log("AlarmActionBridge: About to emit alarmSnooze event to React Native")
                    emitEventToReactNative(context, "alarmSnooze", reminderId, snoozeMinutes)
                    DebugLogger.log("AlarmActionBridge: emitEventToReactNative call completed")
                } else {
                    DebugLogger.log("AlarmActionBridge: ERROR - reminderId is NULL!")
                }
            }
            else -> {
                DebugLogger.log("AlarmActionBridge: Unknown action received: ${action}")
            }
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