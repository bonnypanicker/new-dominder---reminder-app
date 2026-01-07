package app.rork.dominder_android_reminder_app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.content.Context
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.ReactApplication

class BackgroundActionService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val extras = intent?.extras
        val data = Arguments.createMap()
        if (extras != null) {
            for (key in extras.keySet()) {
                val value = extras.get(key)
                if (value is String) data.putString(key, value)
                if (value is Int) data.putInt(key, value)
                if (value is Long) data.putDouble(key, value.toDouble())
                if (value is Boolean) data.putBoolean(key, value)
            }
        }
        return HeadlessJsTaskConfig(
            "BackgroundActionTask",
            data,
            30000L, // 30s timeout
            true // allowed in foreground
        )
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = "background_action_channel"
            val channelName = "Background Actions"
            val notificationManager = getSystemService(NotificationManager::class.java)
            
            if (notificationManager != null) {
                val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW)
                notificationManager.createNotificationChannel(channel)
                
                val notification = NotificationCompat.Builder(this, channelId)
                    .setContentTitle("Processing Reminder")
                    .setContentText("Updating your reminders...")
                    .setSmallIcon(R.drawable.small_icon_noti)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .build()
                
                if (Build.VERSION.SDK_INT >= 34) {
                    try {
                        startForeground(1002, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
                    } catch (e: Exception) {
                        DebugLogger.error("BackgroundActionService: Failed to start foreground service", e)
                        stopSelf()
                    }
                } else {
                    startForeground(1002, notification)
                }
            }
        }

        // Ensure React Context is initialized
        try {
            val app = application
            if (app is ReactApplication) {
                val reactInstanceManager = app.reactNativeHost.reactInstanceManager
                if (!reactInstanceManager.hasStartedCreatingInitialContext()) {
                    reactInstanceManager.createReactContextInBackground()
                }
            }
        } catch (e: Exception) {
            DebugLogger.error("BackgroundActionService: Failed to initialize React Context", e)
        }

        try {
            return super.onStartCommand(intent, flags, startId)
        } catch (e: Exception) {
            DebugLogger.error("BackgroundActionService: Failed to start headless task", e)
            stopSelf()
            return START_NOT_STICKY
        }
    }
}