package app.rork.dominder_android_reminder_app.alarm

import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.Process
import android.os.Vibrator
import android.os.VibrationEffect
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import app.rork.dominder_android_reminder_app.DebugLogger
import app.rork.dominder_android_reminder_app.R
import java.text.SimpleDateFormat
import java.util.*

class AlarmActivity : AppCompatActivity() {
    private var wakeLock: PowerManager.WakeLock? = null
    private var reminderId: String? = null
    private var notificationId: Int = 0
    private var priority: String = "medium"
    private var timeUpdateRunnable: Runnable? = null
    private var timeoutRunnable: Runnable? = null
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())
    private val TIMEOUT_DURATION = 5 * 60 * 1000L // 5 minutes in milliseconds

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DebugLogger.log("AlarmActivity: onCreate")

        // --- Edge-to-Edge & Status Bar (Android 15+ compatible) ---
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        // For dark theme (dark background), we want light icons (so isAppearanceLightStatusBars = false)
        windowInsetsController.isAppearanceLightStatusBars = false 
        window.statusBarColor = android.graphics.Color.TRANSPARENT // Let layout draw behind

        // --- Wake Lock and Screen On Logic (preserved) ---
        acquireWakeLock()
        setShowWhenLockedAndTurnScreenOn()

        // --- New UI Logic ---
        setContentView(R.layout.activity_alarm)

        reminderId = intent.getStringExtra("reminderId")
        val title = intent.getStringExtra("title") ?: "Reminder"
        priority = intent.getStringExtra("priority") ?: "medium"
        notificationId = reminderId?.hashCode() ?: 0
        
        DebugLogger.log("AlarmActivity: Priority = $priority")

        if (reminderId == null) {
            DebugLogger.log("AlarmActivity: reminderId is null, finishing.")
            finish()
            return
        }

        val alarmTitle: TextView = findViewById(R.id.alarm_title)
        alarmTitle.text = title

        // --- Update current time display ---
        val currentTimeView: TextView = findViewById(R.id.current_time)
        val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
        
        timeUpdateRunnable = object : Runnable {
            override fun run() {
                currentTimeView.text = timeFormat.format(Date())
                handler.postDelayed(this, 1000) // Update every second
            }
        }
        timeUpdateRunnable?.run()

        // --- Setup 5-minute timeout ---
        timeoutRunnable = Runnable {
            DebugLogger.log("AlarmActivity: 5-minute timeout reached, sending missed alarm broadcast")
            
            // Stop the ringtone service first
            AlarmRingtoneService.stopAlarmRingtone(this)
            
            // Send missed alarm broadcast for JS (if alive) - with package for Android 14+ compatibility
            val missedIntent = Intent("com.dominder.MISSED_ALARM").apply {
                setPackage(packageName)
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("time", timeFormat.format(Date()))
            }
            sendBroadcast(missedIntent)
            DebugLogger.log("AlarmActivity: Missed alarm broadcast sent")
            
            // Post Native "Missed Reminder" Notification immediately
            // This ensures the user sees it even if the app process is dead
            postMissedNotification(reminderId, title)

            // Cancel the ACTIVE ringing notification to stop the fullscreen/ongoing state
            cancelNotification()
            
            // Finish the activity
            finishAlarmProperly()
        }
        
        handler.postDelayed(timeoutRunnable!!, TIMEOUT_DURATION)
        DebugLogger.log("AlarmActivity: 5-minute timeout scheduled")

        // --- Ringtone Service Already Playing ---
        DebugLogger.log("AlarmActivity: Ringtone service should already be playing")

        findViewById<Button>(R.id.snooze_5m).setOnClickListener { handleSnooze(5) }
        findViewById<Button>(R.id.snooze_10m).setOnClickListener { handleSnooze(10) }
        findViewById<Button>(R.id.snooze_15m).setOnClickListener { handleSnooze(15) }
        findViewById<Button>(R.id.snooze_30m).setOnClickListener { handleSnooze(30) }
        findViewById<Button>(R.id.done_button).setOnClickListener { handleDone() }
    }

    private fun handleSnooze(minutes: Int) {
        DebugLogger.log("AlarmActivity: Snoozing for ${minutes} minutes, reminderId: ${reminderId}")
        
        // Stop ringtone service
        AlarmRingtoneService.stopAlarmRingtone(this)
        
        // NEW: Persist to SharedPreferences immediately
        try {
            val prefs = getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString("snoozed_${reminderId}", "${System.currentTimeMillis()}:${minutes}")
                apply()
            }
            DebugLogger.log("AlarmActivity: Saved snooze to SharedPreferences for ${reminderId}")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Error saving snooze to SharedPreferences: ${e.message}")
        }
        
        // Keep existing broadcast
        val intent = Intent("app.rork.dominder.ALARM_SNOOZE").apply {
            setPackage(packageName)
            putExtra("reminderId", reminderId)
            putExtra("snoozeMinutes", minutes)
            putExtra("title", intent.getStringExtra("title") ?: "Reminder")
            putExtra("priority", priority)
        }
        
        DebugLogger.log("AlarmActivity: Sending ALARM_SNOOZE broadcast")
        sendBroadcast(intent)
        DebugLogger.log("AlarmActivity: Snooze broadcast sent")
        
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            cancelNotification()
            finishAlarmProperly()
        }, 300)
    }

    private fun handleDone() {
        DebugLogger.log("AlarmActivity: Done clicked for reminderId: ${reminderId}")
        
        // Stop ringtone service
        AlarmRingtoneService.stopAlarmRingtone(this)
        
        // NEW: Persist to SharedPreferences immediately
        try {
            val prefs = getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString("completed_${reminderId}", System.currentTimeMillis().toString())
                apply()
            }
            DebugLogger.log("AlarmActivity: Saved completion to SharedPreferences for ${reminderId}")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Error saving to SharedPreferences: ${e.message}")
        }
        
        // Keep existing broadcast as fallback for when app is running
        val intent = Intent("app.rork.dominder.ALARM_DONE").apply {
            setPackage(packageName)
            putExtra("reminderId", reminderId)
        }
        
        DebugLogger.log("AlarmActivity: Sending ALARM_DONE broadcast with action: ${intent.action}, package: ${intent.`package`}")
        sendBroadcast(intent)
        DebugLogger.log("AlarmActivity: Broadcast sent successfully")
        
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            cancelNotification()
            finishAlarmProperly()
        }, 300)
    }

    private fun cancelNotification() {
        if (notificationId != 0) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
            DebugLogger.log("AlarmActivity: Canceled notification with ID: $notificationId")
        }
    }

    private fun acquireWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
            PowerManager.ACQUIRE_CAUSES_WAKEUP or
            PowerManager.ON_AFTER_RELEASE,
            "DoMinder:AlarmWakeLock"
        ).apply {
            acquire(10 * 60 * 1000L) // 10 minutes timeout (covers 5-min cutoff + buffer)
        }
        DebugLogger.log("AlarmActivity: Wake lock acquired for 10 minutes")
    }

    private fun setShowWhenLockedAndTurnScreenOn() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
            
            // Keep screen on until user action or timeout
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }
        DebugLogger.log("AlarmActivity: Screen will stay on until user action or timeout")
    }

    private fun postMissedNotification(id: String?, title: String?) {
        if (id == null) return
        
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Create a dedicated channel for missed alarms
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    "missed_alarm_channel",
                    "Missed Ringer Alarms",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notifications for missed ringer reminders"
                    setSound(null, null)
                    enableVibration(false)
                }
                notificationManager.createNotificationChannel(channel)
            }
            
            // Create delete action intent
            val deleteIntent = Intent(this, MissedAlarmDeleteReceiver::class.java).apply {
                action = "com.dominder.DELETE_MISSED_ALARM"
                putExtra("reminderId", id)
                putExtra("notificationId", id.hashCode() + 999)
            }
            val deletePendingIntent = PendingIntent.getBroadcast(
                this,
                id.hashCode() + 500,
                deleteIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            // Create content intent to open app
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("reminderId", id)
            }
            val contentPendingIntent = if (launchIntent != null) {
                PendingIntent.getActivity(
                    this, 
                    id.hashCode() + 10, 
                    launchIntent, 
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
            } else null

            val notifBuilder = androidx.core.app.NotificationCompat.Builder(this, "missed_alarm_channel")
                .setContentTitle("You missed a Ringer reminder")
                .setContentText(title ?: "Reminder")
                .setSmallIcon(R.drawable.small_icon_noti)
                .setColor(0xFFF44336.toInt()) // Red color for missed
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                .setOngoing(true) // Non-swipable
                .setAutoCancel(false)
                .addAction(0, "Delete", deletePendingIntent)
            
            if (contentPendingIntent != null) {
                notifBuilder.setContentIntent(contentPendingIntent)
            }

            notificationManager.notify(id.hashCode() + 999, notifBuilder.build())
            DebugLogger.log("AlarmActivity: Posted non-swipable missed notification with delete button")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Failed to post missed notification: ${e.message}")
        }
    }

    /**
     * Properly finish the alarm activity without bringing the main app to foreground
     * when it's in a minimized/backgrounded state.
     */
    private fun finishAlarmProperly() {
        try {
            DebugLogger.log("AlarmActivity: Finishing alarm activity properly")
            
            // Method 1: Move task to back before finishing
            // This ensures we don't bring the main app forward if it's backgrounded
            moveTaskToBack(true)
            
            // Method 2: Finish this activity
            finish()
            
            // Method 3: As a final cleanup, exit this process after a delay
            // This ensures the alarm activity process is completely cleaned up
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                try {
                    // Only kill this specific activity's process, not the main app
                    Process.killProcess(Process.myPid())
                } catch (e: Exception) {
                    DebugLogger.log("AlarmActivity: Error killing process: ${e.message}")
                }
            }, 500)
            
            DebugLogger.log("AlarmActivity: Finish sequence initiated")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Error in finishAlarmProperly: ${e.message}")
            // Fallback to standard finish
            finish()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        timeUpdateRunnable?.let { handler.removeCallbacks(it) }
        timeoutRunnable?.let { handler.removeCallbacks(it) }
        DebugLogger.log("AlarmActivity: Canceled timeout and time update runnables")
        
        // Stop the ringtone service if it's running
        AlarmRingtoneService.stopAlarmRingtone(this)
        
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
                DebugLogger.log("AlarmActivity: WakeLock released")
            }
        }
    }
}