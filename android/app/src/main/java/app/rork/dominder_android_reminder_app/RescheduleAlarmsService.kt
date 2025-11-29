package app.rork.dominder_android_reminder_app

import android.app.Service
import android.content.Intent
import android.os.IBinder
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class RescheduleAlarmsService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        DebugLogger.log("RescheduleAlarmsService: Starting headless task 'RescheduleAlarms'")
        return intent?.let {
            HeadlessJsTaskConfig(
                "RescheduleAlarms",
                Arguments.createMap(),
                60000, // 60 second timeout - enough time to check and trigger all pending notifications
                true  // Allow in foreground
            )
        }
    }
}