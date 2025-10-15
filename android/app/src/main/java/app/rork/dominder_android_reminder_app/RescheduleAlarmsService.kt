package app.rork.dominder_android_reminder_app

import android.app.Service
import android.content.Intent
import android.os.IBinder

class RescheduleAlarmsService : Service() {
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}