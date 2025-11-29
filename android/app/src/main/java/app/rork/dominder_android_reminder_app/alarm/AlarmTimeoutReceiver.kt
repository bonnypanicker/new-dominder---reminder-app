package app.rork.dominder_android_reminder_app.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import app.rork.dominder_android_reminder_app.DebugLogger
import app.rork.dominder_android_reminder_app.R
import java.text.SimpleDateFormat
import java.util.*

class AlarmTimeoutReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val reminderId = intent.getStringExtra("reminderId")
        val title = intent.getStringExtra("title") ?: "Reminder"
        
        if (reminderId == null) {
            DebugLogger.log("AlarmTimeoutReceiver: reminderId is null")
            return
        }
        
        DebugLogger.log("AlarmTimeoutReceiver: 5-minute timeout reached for $reminderId")
        
        // Stop the ringtone service
        AlarmRingtoneService.stopAlarmRingtone(context)
        DebugLogger.log("AlarmTimeoutReceiver: Stopped ringtone service")
        
        // Show "Missed Ringer" notification
        showMissedNotification(context, reminderId, title)
        
        // Send broadcast to close AlarmActivity if it's still open
        val closeIntent = Intent("app.rork.dominder.CLOSE_ALARM_ACTIVITY").apply {
            putExtra("reminderId", reminderId)
        }
        context.sendBroadcast(closeIntent)
        DebugLogger.log("AlarmTimeoutReceiver: Sent broadcast to close AlarmActivity")
    }
    
    private fun showMissedNotification(context: Context, reminderId: String, title: String) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val channelId = "missed_ringer_v1"
            
            // Create notification channel for missed ringers
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "Missed Ringer Alarms",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notifications for missed ringer alarms (timeout after 5 minutes)"
                    enableLights(true)
                    enableVibration(false) // No vibration for missed notification
                }
                notificationManager.createNotificationChannel(channel)
            }
            
            val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
            val timeText = timeFormat.format(Date())
            
            // Create Delete action with PendingIntent
            val deleteIntent = Intent(context, MissedReminderDeleteReceiver::class.java).apply {
                action = "app.rork.dominder.DELETE_MISSED_REMINDER"
                putExtra("reminderId", reminderId)
                putExtra("notificationId", "missed_$reminderId".hashCode())
            }
            
            val deletePendingIntent = PendingIntent.getBroadcast(
                context,
                "missed_delete_$reminderId".hashCode(),
                deleteIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            val notification = NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.small_icon_noti)
                .setContentTitle("You missed a Ringer reminder")
                .setContentText("$title (timed out at $timeText)")
                .setStyle(NotificationCompat.BigTextStyle().bigText("$title\n\nTimed out at $timeText after 5 minutes"))
                .setColor(context.getColor(android.R.color.holo_red_dark))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .addAction(0, "Delete", deletePendingIntent) // Add Delete button
                .build()
            
            notificationManager.notify("missed_$reminderId".hashCode(), notification)
            DebugLogger.log("AlarmTimeoutReceiver: Showed missed notification with Delete button for $reminderId")
        } catch (e: Exception) {
            DebugLogger.log("AlarmTimeoutReceiver: Error showing missed notification: ${e.message}")
        }
    }
}