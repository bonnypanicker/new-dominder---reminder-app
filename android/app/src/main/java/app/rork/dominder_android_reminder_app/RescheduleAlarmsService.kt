package app.rork.dominder_android_reminder_app

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class RescheduleAlarmsService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val extras = intent?.extras
        return HeadlessJsTaskConfig(
            "RescheduleAlarms", // Task name
            Arguments.fromBundle(extras),
            5000, // Timeout
            true // Allow in foreground
        )
    }
}
