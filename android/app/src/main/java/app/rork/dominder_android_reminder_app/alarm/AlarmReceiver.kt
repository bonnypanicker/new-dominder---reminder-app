package app.rork.dominder_android_reminder_app.alarm

import android.app.KeyguardManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import app.rork.dominder_android_reminder_app.R

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null) return
        
        Log.d("AlarmReceiver", "Alarm received!")

        val reminderId = intent?.getStringExtra("reminderId") ?: return
        val title = intent?.getStringExtra("title") ?: "Reminder"
        
        val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val isScreenOn = powerManager.isInteractive
        val isLocked = keyguardManager.isKeyguardLocked
        
        Log.d("AlarmReceiver", "Screen state - isScreenOn: $isScreenOn, isLocked: $isLocked")
        
        if (isLocked || !isScreenOn) {
            Log.d("AlarmReceiver", "Launching full-screen AlarmActivity")
            val alarmIntent = Intent(context, AlarmActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("reminderId", reminderId)
                putExtra("title", title)
            }
            context.startActivity(alarmIntent)
        } else {
            Log.d("AlarmReceiver", "Showing persistent notification")
            showPersistentNotification(context, reminderId, title)
        }
    }
    
    private fun showPersistentNotification(context: Context, reminderId: String, title: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "ringer-notifications"
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Ringer Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High priority reminder notifications"
                setSound(null, null)
                enableVibration(false)
            }
            notificationManager.createNotificationChannel(channel)
        }
        
        val tapIntent = Intent(context, AlarmActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("reminderId", reminderId)
            putExtra("title", title)
            putExtra("fromNotification", true)
        }
        val tapPendingIntent = PendingIntent.getActivity(
            context,
            reminderId.hashCode(),
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

// Create full-screen intent for locked screen
val fullScreenIntent = Intent(context, AlarmActivity::class.java).apply {
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    putExtra("reminderId", reminderId)
    putExtra("title", title)
    putExtra("fromFullScreen", true)
}
val fullScreenPendingIntent = PendingIntent.getActivity(
    context,
    (reminderId.hashCode() + 1000),
    fullScreenIntent,
    PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
)
        
        val notification = NotificationCompat.Builder(context, channelId)
            .setContentTitle(title)
            .setContentText("Tap to open alarm")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(tapPendingIntent)
            .setFullScreenIntent(fullScreenPendingIntent, true)  // ADD THIS LINE
            .build()
        
        notificationManager.notify(reminderId.hashCode(), notification)
        Log.d("AlarmReceiver", "Persistent notification shown for reminderId: $reminderId")
    }
}