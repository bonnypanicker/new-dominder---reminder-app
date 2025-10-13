package app.rork.dominder_android_reminder_app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import app.rork.dominder_android_reminder_app.RescheduleAlarmsService

class AlarmActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        
        val action = intent.getStringExtra("action")
        val reminderId = intent.getStringExtra("reminderId")
        
        Log.d("AlarmActionReceiver", "Received action: $action for reminderId: $reminderId")
        
        if (action == null || reminderId == null) return
        
        val serviceIntent = Intent(context, RescheduleAlarmsService::class.java).apply {
            putExtra("action", action)
            putExtra("reminderId", reminderId)
            if (action == "snooze") {
                putExtra("snoozeMinutes", intent.getIntExtra("snoozeMinutes", 10))
            }
        }
        
        context.startService(serviceIntent)
        Log.d("AlarmActionReceiver", "Started RescheduleAlarmsService for action: $action")
    }
}