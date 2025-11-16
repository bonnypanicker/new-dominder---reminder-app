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

        // --- Set status bar color to match dark background ---
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = android.graphics.Color.parseColor("#1A1A1A")
            
            // Make status bar icons light colored for dark background
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                window.decorView.systemUiVisibility = 0 // Clear light status bar flag for dark theme
            }
        }

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
            
            // Send missed alarm broadcast
            val missedIntent = Intent("com.dominder.MISSED_ALARM").apply {
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("time", timeFormat.format(Date()))
            }
            sendBroadcast(missedIntent)
            DebugLogger.log("AlarmActivity: Missed alarm broadcast sent")
            
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
            acquire(30 * 1000L) // 30 seconds timeout
        }
    }

    private fun setShowWhenLockedAndTurnScreenOn() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
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