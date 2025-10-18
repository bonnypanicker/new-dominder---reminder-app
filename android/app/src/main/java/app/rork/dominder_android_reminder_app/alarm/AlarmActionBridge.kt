package app.rork.dominder_android_reminder_app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import app.rork.dominder_android_reminder_app.DebugLogger

class AlarmActionBridge(private val reactContext: ReactApplicationContext) : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        DebugLogger.log("AlarmActionBridge: Received action: $action")

        when (action) {
            "app.rork.dominder.ALARM_DONE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                if (reminderId != null) {
                    val params = Arguments.createMap().apply {
                        putString("reminderId", reminderId)
                    }
                    sendEvent("alarmDone", params)
                }
            }
            "app.rork.dominder.ALARM_SNOOZE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                val snoozeMinutes = intent.getIntExtra("snoozeMinutes", 0)
                if (reminderId != null && snoozeMinutes > 0) {
                    val params = Arguments.createMap().apply {
                        putString("reminderId", reminderId)
                        putInt("snoozeMinutes", snoozeMinutes)
                    }
                    sendEvent("alarmSnooze", params)
                }
            }
        }
    }

    private fun sendEvent(eventName: String, params: Any?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
            DebugLogger.log("AlarmActionBridge: Emitted event '$eventName'")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error sending event '$eventName': ${e.message}")
        }
    }
}