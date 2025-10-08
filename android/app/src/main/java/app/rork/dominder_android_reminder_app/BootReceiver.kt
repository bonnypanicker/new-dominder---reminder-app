package app.rork.dominder_android_reminder_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Intent.ACTION_BOOT_COMPLETED == intent.action) {
            DebugLogger.log("BootReceiver: ACTION_BOOT_COMPLETED received")
            val serviceIntent = Intent(context, RescheduleAlarmsService::class.java)
            context.startService(serviceIntent)
            DebugLogger.log("BootReceiver: Started RescheduleAlarmsService")
            HeadlessJsTaskService.acquireWakeLockNow(context)
        }
    }
}
