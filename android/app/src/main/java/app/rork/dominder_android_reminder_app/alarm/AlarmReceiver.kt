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

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        DebugLogger.log("AlarmReceiver: Received broadcast")
        val reminderId = intent.getStringExtra("reminderId")
        val title = intent.getStringExtra("title") ?: "Reminder"
        
        if (reminderId == null) {
            DebugLogger.log("AlarmReceiver: reminderId is null")
            return
        }

        DebugLogger.log("AlarmReceiver: Creating full-screen notification for $reminderId")
        
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        // Step 1: Create HIGH importance notification channel (Android 8+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "alarm_channel_v2",
                "Alarms",
                NotificationManager.IMPORTANCE_HIGH  // CRITICAL: Must be HIGH
            ).apply {
                description = "Full screen alarm notifications"
                setSound(null, null)
                enableLights(true)
                enableVibration(true)
                setBypassDnd(true)  // Bypass Do Not Disturb
            }
            notificationManager.createNotificationChannel(channel)
        }
        
        // Step 2: Create fullScreenIntent pointing to AlarmActivity
        val fullScreenIntent = Intent(context, AlarmActivity::class.java).apply {
            putExtra("reminderId", reminderId)
            putExtra("title", title)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            reminderId.hashCode(),
            fullScreenIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        // Step 3: Create content intent for notification tap
        val contentIntent = Intent(context, AlarmActivity::class.java).apply {
            putExtra("reminderId", reminderId)
            putExtra("title", title)
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            reminderId.hashCode() + 1,
            contentIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        // Step 4: Build notification with fullScreenIntent
        val notification = NotificationCompat.Builder(context, "alarm_channel_v2")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText("Tap to view alarm")
            .setPriority(NotificationCompat.PRIORITY_MAX)  // CRITICAL
            .setCategory(NotificationCompat.CATEGORY_ALARM)  // CRITICAL
            .setFullScreenIntent(fullScreenPendingIntent, true)  // CRITICAL: Shows full screen
            .setContentIntent(contentPendingIntent)
            .setAutoCancel(true)
            .setOngoing(true)
            .setVibrate(longArrayOf(0, 1000, 500, 1000))
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()
        
        // Step 5: Show notification (triggers fullScreenIntent on locked devices)
        notificationManager.notify(reminderId.hashCode(), notification)
        DebugLogger.log("AlarmReceiver: Full-screen notification created and shown")
    }
}