package app.rork.dominder_android_reminder_app.alarm

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.DebugLogger

class MissedReminderDeleteReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val reminderId = intent.getStringExtra("reminderId")
        val notificationId = intent.getIntExtra("notificationId", 0)
        
        if (reminderId == null) {
            DebugLogger.log("MissedReminderDeleteReceiver: reminderId is null")
            return
        }
        
        DebugLogger.log("MissedReminderDeleteReceiver: Deleting missed reminder: $reminderId")
        
        // Cancel the notification
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(notificationId)
        DebugLogger.log("MissedReminderDeleteReceiver: Cancelled notification $notificationId")
        
        // Save deletion to SharedPreferences for React Native to pick up
        try {
            val prefs = context.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString("deleted_$reminderId", System.currentTimeMillis().toString())
                apply()
            }
            DebugLogger.log("MissedReminderDeleteReceiver: Saved deletion to SharedPreferences for $reminderId")
        } catch (e: Exception) {
            DebugLogger.log("MissedReminderDeleteReceiver: Error saving deletion: ${e.message}")
        }
        
        // Also send broadcast to React Native if app is running
        val deleteIntent = Intent("app.rork.dominder.REMINDER_DELETED").apply {
            putExtra("reminderId", reminderId)
        }
        context.sendBroadcast(deleteIntent)
        DebugLogger.log("MissedReminderDeleteReceiver: Sent REMINDER_DELETED broadcast")
    }
}