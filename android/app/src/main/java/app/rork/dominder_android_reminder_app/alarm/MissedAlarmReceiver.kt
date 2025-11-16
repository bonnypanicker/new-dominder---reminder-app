package app.rork.dominder_android_reminder_app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import app.rork.dominder_android_reminder_app.DebugLogger

class MissedAlarmReceiver(private val reactContext: ReactApplicationContext) : BroadcastReceiver() {

    init {
        val filter = IntentFilter("com.dominder.MISSED_ALARM")
        reactContext.registerReceiver(this, filter)
        DebugLogger.log("MissedAlarmReceiver: Registered broadcast receiver")
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == "com.dominder.MISSED_ALARM") {
            val reminderId = intent.getStringExtra("reminderId") ?: return
            val title = intent.getStringExtra("title") ?: ""
            val time = intent.getStringExtra("time") ?: ""

            DebugLogger.log("MissedAlarmReceiver: Received missed alarm for $reminderId")

            val params: WritableMap = Arguments.createMap().apply {
                putString("reminderId", reminderId)
                putString("title", title)
                putString("time", time)
            }

            sendEvent(reactContext, "onMissedAlarm", params)
        }
    }

    private fun sendEvent(reactContext: ReactContext, eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    fun cleanup() {
        try {
            reactContext.unregisterReceiver(this)
            DebugLogger.log("MissedAlarmReceiver: Unregistered broadcast receiver")
        } catch (e: Exception) {
            DebugLogger.log("MissedAlarmReceiver: Error unregistering: ${e.message}")
        }
    }
}