package app.rork.dominder_android_reminder_app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class RescheduleAlarmsService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        return HeadlessJsTaskConfig(
            "RescheduleAlarms",
            Arguments.createMap(),
            30000L, // timeout for the task (30s)
            true // allowed in foreground
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = "alarm_reschedule_channel"
            val channelName = "System Maintenance"
            val notificationManager = getSystemService(NotificationManager::class.java)
            
            if (notificationManager != null) {
                val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW)
                notificationManager.createNotificationChannel(channel)
                
                val notification = NotificationCompat.Builder(this, channelId)
                    .setContentTitle("Updating Reminders")
                    .setContentText("Rescheduling your alarms...")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .build()
                
                startForeground(1001, notification)
            }
        }
        return super.onStartCommand(intent, flags, startId)
    }
}
