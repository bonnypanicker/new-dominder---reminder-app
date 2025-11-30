package app.rork.dominder_android_reminder_app

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class RescheduleAlarmsService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig? {
        return HeadlessJsTaskConfig(
            "RescheduleAlarms",
            Arguments.createMap(),
            5000, // timeout for the task
            true // allowed in foreground
        )
    }
}