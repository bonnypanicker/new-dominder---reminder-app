package app.rork.dominder_android_reminder_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.alarm.MidnightRefreshReceiver

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val serviceIntent = Intent(context, RescheduleAlarmsService::class.java)
            context.startService(serviceIntent)
            
            // Schedule midnight notification refresh
            MidnightRefreshReceiver.scheduleNextMidnightRefresh(context)
            DebugLogger.log("BootReceiver: Scheduled midnight refresh on boot")
        }
    }
}