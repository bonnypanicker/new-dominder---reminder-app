const { withDangerousMod, withPlugins, withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// =================================
// 1. NEW: activity_alarm.xml content
// =================================
const activityAlarmXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#1C1B1F"
    android:orientation="vertical"
    android:paddingStart="24dp"
    android:paddingEnd="24dp"
    android:paddingTop="48dp"
    android:paddingBottom="32dp">

    <!-- Header -->
    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="REMINDER"
        android:textColor="#D0BCFF"
        android:textSize="14sp"
        android:fontFamily="sans-serif-medium"
        android:letterSpacing="0.05"
        android:gravity="center"
        android:layout_marginBottom="16dp" />

    <!-- Reminder Title -->
    <TextView
        android:id="@+id/alarm_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textColor="#E6E1E5"
        android:textSize="28sp"
        android:fontFamily="sans-serif"
        android:gravity="center"
        android:lineSpacingMultiplier="1.3"
        android:layout_marginBottom="48dp"
        tools:text="Reminder Title" />

    <!-- Center Time Display -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:gravity="center"
        android:layout_marginBottom="48dp">

        <TextView
            android:id="@+id/current_time"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textColor="#D0BCFF"
            android:textSize="72sp"
            android:fontFamily="sans-serif-light"
            android:letterSpacing="-0.02"
            tools:text="12:34 PM" />
    </LinearLayout>

    <!-- Snooze Label -->
    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="SNOOZE FOR"
        android:textColor="#CAC4D0"
        android:textSize="12sp"
        android:fontFamily="sans-serif-medium"
        android:letterSpacing="0.05"
        android:gravity="center"
        android:layout_marginBottom="16dp" />

    <!-- Snooze Buttons -->
    <LinearLayout
        android:id="@+id/snooze_buttons"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center"
        android:layout_marginBottom="24dp">

        <Button
            android:id="@+id/snooze_5m"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:backgroundTint="#2B2930"
            android:textColor="#D0BCFF"
            android:text="5m"
            android:textSize="14sp"
            android:fontFamily="sans-serif-medium"
            android:paddingVertical="12dp"
            android:layout_marginEnd="6dp"
            style="?attr/materialButtonOutlinedStyle" />

        <Button
            android:id="@+id/snooze_10m"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:backgroundTint="#2B2930"
            android:textColor="#D0BCFF"
            android:text="10m"
            android:textSize="14sp"
            android:fontFamily="sans-serif-medium"
            android:paddingVertical="12dp"
            android:layout_marginEnd="6dp"
            style="?attr/materialButtonOutlinedStyle" />

        <Button
            android:id="@+id/snooze_15m"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:backgroundTint="#2B2930"
            android:textColor="#D0BCFF"
            android:text="15m"
            android:textSize="14sp"
            android:fontFamily="sans-serif-medium"
            android:paddingVertical="12dp"
            android:layout_marginEnd="6dp"
            style="?attr/materialButtonOutlinedStyle" />

        <Button
            android:id="@+id/snooze_30m"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:backgroundTint="#2B2930"
            android:textColor="#D0BCFF"
            android:text="30m"
            android:textSize="14sp"
            android:fontFamily="sans-serif-medium"
            android:paddingVertical="12dp"
            style="?attr/materialButtonOutlinedStyle" />
    </LinearLayout>

    <!-- Done Button -->
    <Button
        android:id="@+id/done_button"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:backgroundTint="#6750A4"
        android:textColor="#FFFFFF"
        android:text="Done"
        android:textSize="16sp"
        android:fontFamily="sans-serif-medium"
        android:letterSpacing="0.05"
        android:paddingVertical="20dp"
        android:elevation="3dp" />

</LinearLayout>`;

// =================================
// 2. UPDATED: Kotlin files array
// =================================
const files = [
  // NEW: AlarmActionBridge.kt
  {
    path: 'alarm/AlarmActionBridge.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.DebugLogger
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class AlarmActionBridge : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        DebugLogger.log("AlarmActionBridge: ===== onReceive called! =====")
        val action = intent.action
        DebugLogger.log("AlarmActionBridge: Received action: \${action}")
        DebugLogger.log("AlarmActionBridge: Intent extras: \${intent.extras}")
        
        when (action) {
            "app.rork.dominder.ALARM_DONE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                DebugLogger.log("AlarmActionBridge: ALARM_DONE - reminderId: \${reminderId}")
                if (reminderId != null) {
                    DebugLogger.log("AlarmActionBridge: About to emit alarmDone event to React Native")
                    emitEventToReactNative(context, "alarmDone", reminderId, 0)
                    DebugLogger.log("AlarmActionBridge: emitEventToReactNative call completed")
                } else {
                    DebugLogger.log("AlarmActionBridge: ERROR - reminderId is NULL!")
                }
            }
            "app.rork.dominder.ALARM_SNOOZE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                val snoozeMinutes = intent.getIntExtra("snoozeMinutes", 0)
                DebugLogger.log("AlarmActionBridge: ALARM_SNOOZE - reminderId: \${reminderId}, minutes: \${snoozeMinutes}")
                if (reminderId != null) {
                    DebugLogger.log("AlarmActionBridge: About to emit alarmSnooze event to React Native")
                    emitEventToReactNative(context, "alarmSnooze", reminderId, snoozeMinutes)
                    DebugLogger.log("AlarmActionBridge: emitEventToReactNative call completed")
                } else {
                    DebugLogger.log("AlarmActionBridge: ERROR - reminderId is NULL!")
                }
            }
            else -> {
                DebugLogger.log("AlarmActionBridge: Unknown action received: \${action}")
            }
        }
    }
    
    private fun emitEventToReactNative(context: Context, eventName: String, reminderId: String, snoozeMinutes: Int) {
        try {
            DebugLogger.log("AlarmActionBridge: ===== emitEventToReactNative START =====")
            DebugLogger.log("AlarmActionBridge: Event name: \${eventName}, reminderId: \${reminderId}")
            
            val app = context.applicationContext
            DebugLogger.log("AlarmActionBridge: Got application context: \${app.javaClass.name}")
            
            if (app is ReactApplication) {
                DebugLogger.log("AlarmActionBridge: App is ReactApplication ✓")
                
                val reactInstanceManager = app.reactNativeHost.reactInstanceManager
                DebugLogger.log("AlarmActionBridge: Got ReactInstanceManager: \${reactInstanceManager}")
                
                val reactContext = reactInstanceManager.currentReactContext
                DebugLogger.log("AlarmActionBridge: ReactContext: \${reactContext}")
                
                if (reactContext != null) {
                    DebugLogger.log("AlarmActionBridge: ReactContext is VALID ✓")
                    DebugLogger.log("AlarmActionBridge: Creating params map...")
                    
                    val params = Arguments.createMap().apply {
                        putString("reminderId", reminderId)
                        if (eventName == "alarmSnooze") {
                            putInt("snoozeMinutes", snoozeMinutes)
                        }
                    }
                    
                    DebugLogger.log("AlarmActionBridge: Params created, emitting event '\${eventName}'...")
                    
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(eventName, params)
                    
                    DebugLogger.log("AlarmActionBridge: ✓✓✓ Event '\${eventName}' emitted successfully! ✓✓✓")
                } else {
                    DebugLogger.log("AlarmActionBridge: ✗✗✗ ERROR - ReactContext is NULL! ✗✗✗")
                    DebugLogger.log("AlarmActionBridge: This means React Native is not running or was killed")
                }
            } else {
                DebugLogger.log("AlarmActionBridge: ✗✗✗ ERROR - App is NOT ReactApplication! ✗✗✗")
                DebugLogger.log("AlarmActionBridge: App type: \${app.javaClass.name}")
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: ✗✗✗ EXCEPTION in emitEventToReactNative ✗✗✗")
            DebugLogger.log("AlarmActionBridge: Exception: \${e.message}")
            DebugLogger.log("AlarmActionBridge: Stack trace: \${e.stackTraceToString()}")
        }
    }
}`
  },
  // UPDATED: AlarmActivity.kt
  {
    path: 'alarm/AlarmActivity.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

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
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var priority: String = "medium"
    private var timeUpdateRunnable: Runnable? = null
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DebugLogger.log("AlarmActivity: onCreate")

        // --- Wake Lock and Screen On Logic (preserved) ---
        acquireWakeLock()
        setShowWhenLockedAndTurnScreenOn()

        // --- New UI Logic ---
        setContentView(R.layout.activity_alarm)

        reminderId = intent.getStringExtra("reminderId")
        val title = intent.getStringExtra("title") ?: "Reminder"
        priority = intent.getStringExtra("priority") ?: "medium"
        notificationId = reminderId?.hashCode() ?: 0
        
        DebugLogger.log("AlarmActivity: Priority = \$priority")

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

        // --- Start Ringtone and Vibration ---
        playAlarmRingtone()
        startVibration()

        findViewById<Button>(R.id.snooze_5m).setOnClickListener { handleSnooze(5) }
        findViewById<Button>(R.id.snooze_10m).setOnClickListener { handleSnooze(10) }
        findViewById<Button>(R.id.snooze_15m).setOnClickListener { handleSnooze(15) }
        findViewById<Button>(R.id.snooze_30m).setOnClickListener { handleSnooze(30) }
        findViewById<Button>(R.id.done_button).setOnClickListener { handleDone() }
    }

    private fun handleSnooze(minutes: Int) {
        DebugLogger.log("AlarmActivity: Snoozing for \${minutes} minutes, reminderId: \${reminderId}")
        
        // Stop ringtone and vibration
        stopRingtone()
        stopVibration()
        
        // NEW: Persist to SharedPreferences immediately
        try {
            val prefs = getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString("snoozed_\${reminderId}", "\${System.currentTimeMillis()}:\${minutes}")
                apply()
            }
            DebugLogger.log("AlarmActivity: Saved snooze to SharedPreferences for \${reminderId}")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Error saving snooze to SharedPreferences: \${e.message}")
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
            finishAndRemoveTask()
        }, 300)
    }

    private fun handleDone() {
        DebugLogger.log("AlarmActivity: Done clicked for reminderId: \${reminderId}")
        
        // Stop ringtone and vibration
        stopRingtone()
        stopVibration()
        
        // NEW: Persist to SharedPreferences immediately
        try {
            val prefs = getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString("completed_\${reminderId}", System.currentTimeMillis().toString())
                apply()
            }
            DebugLogger.log("AlarmActivity: Saved completion to SharedPreferences for \${reminderId}")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Error saving to SharedPreferences: \${e.message}")
        }
        
        // Keep existing broadcast as fallback for when app is running
        val intent = Intent("app.rork.dominder.ALARM_DONE").apply {
            setPackage(packageName)
            putExtra("reminderId", reminderId)
        }
        
        DebugLogger.log("AlarmActivity: Sending ALARM_DONE broadcast with action: \${intent.action}, package: \${intent.\`package\`}")
        sendBroadcast(intent)
        DebugLogger.log("AlarmActivity: Broadcast sent successfully")
        
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            cancelNotification()
            finishAndRemoveTask()
        }, 300)
    }

    private fun cancelNotification() {
        if (notificationId != 0) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
            DebugLogger.log("AlarmActivity: Canceled notification with ID: \$notificationId")
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

    private fun playAlarmRingtone() {
        try {
            // Only play custom ringtone for high priority alarms
            if (priority != "high") {
                DebugLogger.log("AlarmActivity: Skipping ringtone (priority=\$priority, only high priority plays custom ringtone)")
                return
            }
            
            // Get saved ringtone URI from SharedPreferences
            val prefs = getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
            val savedUriString = prefs.getString("alarm_ringtone_uri", null)
            
            val ringtoneUri = if (savedUriString != null) {
                DebugLogger.log("AlarmActivity: Using saved ringtone: \$savedUriString")
                Uri.parse(savedUriString)
            } else {
                DebugLogger.log("AlarmActivity: Using default alarm ringtone")
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            }
            
            // Use MediaPlayer for full song playback
            mediaPlayer = MediaPlayer().apply {
                try {
                    setDataSource(applicationContext, ringtoneUri)
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                .build()
                        )
                    } else {
                        @Suppress("DEPRECATION")
                        setAudioStreamType(AudioManager.STREAM_ALARM)
                    }
                    
                    // Set looping and completion listener as backup
                    isLooping = true
                    setOnCompletionListener {
                        // Restart if somehow looping fails
                        try {
                            if (!it.isLooping) {
                                it.seekTo(0)
                                it.start()
                            }
                        } catch (e: Exception) {
                            DebugLogger.log("AlarmActivity: Error in completion listener: \${e.message}")
                        }
                    }
                    
                    setOnErrorListener { mp, what, extra ->
                        DebugLogger.log("AlarmActivity: MediaPlayer error: what=\$what, extra=\$extra")
                        false // Return false to trigger OnCompletionListener
                    }
                    
                    prepare()
                    start()
                    
                    DebugLogger.log("AlarmActivity: MediaPlayer started playing full song (looping=\${isLooping})")
                } catch (e: Exception) {
                    DebugLogger.log("AlarmActivity: Error preparing MediaPlayer: \${e.message}")
                    throw e
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Error playing ringtone: \${e.message}")
        }
    }
    
    private fun stopRingtone() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
                DebugLogger.log("AlarmActivity: MediaPlayer stopped and released")
            }
            mediaPlayer = null
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Error stopping ringtone: \${e.message}")
        }
    }
    
    private fun startVibration() {
        try {
            vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            
            if (vibrator?.hasVibrator() == true) {
                // Vibration pattern: [delay, vibrate, sleep, vibrate, ...]
                // Pattern: 0ms delay, 1000ms vibrate, 1000ms pause, repeat
                val pattern = longArrayOf(0, 1000, 1000)
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val vibrationEffect = VibrationEffect.createWaveform(
                        pattern,
                        0 // Repeat from index 0 (loops the entire pattern)
                    )
                    vibrator?.vibrate(vibrationEffect)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(pattern, 0) // 0 = repeat from start
                }
                
                DebugLogger.log("AlarmActivity: Vibration started")
            } else {
                DebugLogger.log("AlarmActivity: Device has no vibrator")
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Error starting vibration: \${e.message}")
        }
    }
    
    private fun stopVibration() {
        try {
            vibrator?.cancel()
            DebugLogger.log("AlarmActivity: Vibration stopped")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Error stopping vibration: \${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        timeUpdateRunnable?.let { handler.removeCallbacks(it) }
        stopRingtone()
        stopVibration()
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
                DebugLogger.log("AlarmActivity: WakeLock released")
            }
        }
    }
}`
  },
  // --- Other files are preserved as they were ---
  {
    path: 'alarm/AlarmReceiver.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

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

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        DebugLogger.log("AlarmReceiver: Received broadcast")
        val reminderId = intent.getStringExtra("reminderId")
        val title = intent.getStringExtra("title") ?: "Reminder"
        val priority = intent.getStringExtra("priority") ?: "medium"
        
        if (reminderId == null) {
            DebugLogger.log("AlarmReceiver: reminderId is null")
            return
        }

        DebugLogger.log("AlarmReceiver: Creating full-screen notification for \$reminderId")
        
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "alarm_channel_v2",
                "Alarms",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Full screen alarm notifications"
                setSound(null, null)
                enableLights(true)
                enableVibration(true)
                setBypassDnd(true)
            }
            notificationManager.createNotificationChannel(channel)
        }
        
        // Intent for the full-screen activity
        val fullScreenIntent = Intent(context, AlarmActivity::class.java).apply {
            putExtra("reminderId", reminderId)
            putExtra("title", title)
            putExtra("priority", priority)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            reminderId.hashCode(),
            fullScreenIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        // FIX: Create a content intent for when the user taps the notification itself.
        // This should also open the AlarmActivity.
        val contentIntent = Intent(context, AlarmActivity::class.java).apply {
            putExtra("reminderId", reminderId)
            putExtra("title", title)
            putExtra("priority", priority)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            reminderId.hashCode() + 1, // Use a different request code from fullScreenPendingIntent
            contentIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        val notification = NotificationCompat.Builder(context, "alarm_channel_v2")
            .setSmallIcon(R.drawable.small_icon_card)
            .setColor(0xFF6750A4.toInt())
            .setColorized(true)
            .setContentTitle(title)
            .setContentText("Alarm is ringing")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            // FIX: Add content intent for notification tap handling.
            .setContentIntent(contentPendingIntent)
            // FIX: setAutoCancel(true) allows dismissal, so remove contradictory setOngoing(true).
            .setAutoCancel(true)
            // FIX: Add vibration pattern for better user alert.
            .setVibrate(longArrayOf(0, 1000, 500, 1000))
            .build()
        
        notificationManager.notify(reminderId.hashCode(), notification)
        DebugLogger.log("AlarmReceiver: Full-screen notification created and shown")
    }
}`
  },
  {
    path: 'alarm/RingtonePickerActivity.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import app.rork.dominder_android_reminder_app.DebugLogger
import app.rork.dominder_android_reminder_app.R

class RingtonePickerActivity : AppCompatActivity() {
    private var selectedUri: Uri? = null
    private var currentlyPlaying: Ringtone? = null
    private var customSongUri: Uri? = null
    private var customSongName: String? = null
    private val PICK_AUDIO_REQUEST = 2001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Create layout programmatically to match app theme
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0xFFFAFAFA.toInt()) // Material3 background
            setPadding(0, 0, 0, 0)
        }

        // Header
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(16, 40, 16, 16)
            setBackgroundColor(0xFFFFFFFF.toInt())
            elevation = 4f
        }

        val titleText = TextView(this).apply {
            text = "Select Alarm Sound"
            textSize = 20f
            setTextColor(0xFF1C1B1F.toInt())
            layoutParams = LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
            )
        }

        val cancelButton = Button(this).apply {
            text = "Cancel"
            setTextColor(0xFF6750A4.toInt())
            setBackgroundColor(0x00000000)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                stopCurrentRingtone()
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }

        header.addView(titleText)
        header.addView(cancelButton)
        mainLayout.addView(header)

        // ListView for ringtones
        val listView = ListView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
            dividerHeight = 1
            setBackgroundColor(0xFFFAFAFA.toInt())
        }

        // Load ringtones
        val ringtoneManager = RingtoneManager(this)
        ringtoneManager.setType(RingtoneManager.TYPE_ALARM)
        val cursor = ringtoneManager.cursor

        val ringtones = mutableListOf<Pair<String, Uri>>()
        
        // Add default option
        val defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ringtones.add(Pair("Default Alarm", defaultUri))

        // Add all alarm sounds
        while (cursor.moveToNext()) {
            val title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX)
            val uri = ringtoneManager.getRingtoneUri(cursor.position)
            ringtones.add(Pair(title, uri))
        }

        // Get currently selected URI
        val currentUriString = intent.getStringExtra("currentUri")
        selectedUri = if (currentUriString != null) Uri.parse(currentUriString) else defaultUri
        
        // Check if current selection is a custom song (not in system ringtones)
        if (currentUriString != null && !currentUriString.contains("internal") && !currentUriString.contains("settings/system")) {
            customSongUri = Uri.parse(currentUriString)
            customSongName = getFileName(customSongUri!!)
        }

        // Add "Browse Files" button before the list
        val browseButton = Button(this).apply {
            text = "📁 Browse Custom Songs"
            textSize = 16f
            setTextColor(0xFFFFFFFF.toInt())
            setBackgroundColor(0xFF6750A4.toInt())
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(48, 24, 48, 24)
            }
            setPadding(32, 32, 32, 32)
            setOnClickListener {
                stopCurrentRingtone()
                openFilePicker()
            }
        }
        mainLayout.addView(browseButton)
        
        // Show custom song if one is selected
        if (customSongUri != null && customSongName != null) {
            val customSongView = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
                setPadding(48, 24, 48, 24)
                setBackgroundColor(0xFFE8DEF8.toInt()) // Light primary container
                
                setOnClickListener {
                    stopCurrentRingtone()
                    selectedUri = customSongUri
                    
                    // Play preview
                    try {
                        currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, customSongUri)
                        currentlyPlaying?.play()
                    } catch (e: Exception) {
                        DebugLogger.log("Error playing custom song: \${e.message}")
                    }
                }
            }

            val radioButton = RadioButton(this).apply {
                isChecked = customSongUri == selectedUri
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
            }

            val textView = TextView(this).apply {
                text = "🎵 \${customSongName}"
                textSize = 16f
                setTextColor(0xFF1C1B1F.toInt())
                setPadding(32, 0, 0, 0)
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }

            customSongView.addView(radioButton)
            customSongView.addView(textView)
            mainLayout.addView(customSongView)
        }

        // Create adapter
        val adapter = object : BaseAdapter() {
            override fun getCount() = ringtones.size
            override fun getItem(position: Int) = ringtones[position]
            override fun getItemId(position: Int) = position.toLong()

            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val (title, uri) = ringtones[position]
                
                val itemLayout = LinearLayout(this@RingtonePickerActivity).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                    )
                    setPadding(48, 32, 48, 32)
                    setBackgroundColor(0xFFFFFFFF.toInt())
                    
                    setOnClickListener {
                        stopCurrentRingtone()
                        selectedUri = uri
                        notifyDataSetChanged()
                        
                        // Play preview
                        try {
                            currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, uri)
                            currentlyPlaying?.play()
                        } catch (e: Exception) {
                            DebugLogger.log("Error playing ringtone preview: \${e.message}")
                        }
                    }
                }

                val radioButton = RadioButton(this@RingtonePickerActivity).apply {
                    isChecked = uri == selectedUri
                    layoutParams = LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                    )
                    setOnClickListener { itemLayout.performClick() }
                }

                val textView = TextView(this@RingtonePickerActivity).apply {
                    text = title
                    textSize = 16f
                    setTextColor(0xFF1C1B1F.toInt())
                    setPadding(32, 0, 0, 0)
                    layoutParams = LinearLayout.LayoutParams(
                        0,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        1f
                    )
                }

                itemLayout.addView(radioButton)
                itemLayout.addView(textView)
                return itemLayout
            }
        }

        listView.adapter = adapter

        mainLayout.addView(listView)

        // Footer with OK button
        val footer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(16, 16, 16, 16)
            setBackgroundColor(0xFFFFFFFF.toInt())
            elevation = 4f
        }

        val okButton = Button(this).apply {
            text = "OK"
            setTextColor(0xFFFFFFFF.toInt())
            setBackgroundColor(0xFF6750A4.toInt())
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(32, 24, 32, 24)
            setOnClickListener {
                stopCurrentRingtone()
                val result = Intent().apply {
                    putExtra("selectedUri", selectedUri.toString())
                }
                setResult(Activity.RESULT_OK, result)
                finish()
            }
        }

        footer.addView(okButton)
        mainLayout.addView(footer)

        setContentView(mainLayout)
    }

    private fun stopCurrentRingtone() {
        try {
            currentlyPlaying?.let {
                if (it.isPlaying) {
                    it.stop()
                }
            }
            currentlyPlaying = null
        } catch (e: Exception) {
            DebugLogger.log("Error stopping ringtone: \${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCurrentRingtone()
    }

    override fun onPause() {
        super.onPause()
        stopCurrentRingtone()
    }
    
    private fun openFilePicker() {
        try {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "audio/*"
                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("audio/*"))
            }
            startActivityForResult(intent, PICK_AUDIO_REQUEST)
            DebugLogger.log("RingtonePickerActivity: Opened file picker")
        } catch (e: Exception) {
            DebugLogger.log("RingtonePickerActivity: Error opening file picker: \${e.message}")
            Toast.makeText(this, "Error opening file picker", Toast.LENGTH_SHORT).show()
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == PICK_AUDIO_REQUEST && resultCode == Activity.RESULT_OK) {
            data?.data?.let { uri ->
                try {
                    // Take persistable URI permission
                    contentResolver.takePersistableUriPermission(
                        uri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                    
                    customSongUri = uri
                    customSongName = getFileName(uri)
                    selectedUri = uri
                    
                    DebugLogger.log("RingtonePickerActivity: Selected custom song: \${customSongName}")
                    
                    // Persist immediately so next open shows latest selection without recreate
                    try {
                        val prefs = getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
                        prefs.edit().putString("alarm_ringtone_uri", uri.toString()).apply()
                    } catch (e: Exception) {
                        DebugLogger.log("RingtonePickerActivity: Error saving selected uri: \${e.message}")
                    }

                    // Return result immediately and finish (no recreate)
                    val result = Intent().apply {
                        putExtra("selectedUri", selectedUri.toString())
                    }
                    setResult(Activity.RESULT_OK, result)
                    finish()
                } catch (e: Exception) {
                    DebugLogger.log("RingtonePickerActivity: Error handling selected file: \${e.message}")
                    Toast.makeText(this, "Error loading audio file", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun getFileName(uri: Uri): String {
        var fileName = "Custom Song"
        try {
            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex >= 0) {
                        fileName = cursor.getString(nameIndex)
                    }
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("RingtonePickerActivity: Error getting file name: \${e.message}")
        }
        return fileName
    }
}`
  },
  {
    path: 'alarm/AlarmPackage.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AlarmModule(reactContext))
    }
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}`
  },
  {
    path: 'RescheduleAlarmsService.kt',
    content: `package app.rork.dominder_android_reminder_app

import android.app.Service
import android.content.Intent
import android.os.IBinder

class RescheduleAlarmsService : Service() {
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}`
  },
  {
    path: 'MainApplication.kt',
    content: `package app.rork.dominder_android_reminder_app

import android.app.Application
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import app.rork.dominder_android_reminder_app.alarm.AlarmActionBridge
import app.rork.dominder_android_reminder_app.alarm.AlarmPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
        this,
        object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<ReactPackage> {
            val packages = PackageList(this).packages
            packages.add(AlarmPackage())
            return packages
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)

    // Note: AlarmActionBridge is registered via AndroidManifest.xml
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}`
  },
  {
    path: 'MainActivity.kt',
    content: `package app.rork.dominder_android_reminder_app

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import app.rork.dominder_android_reminder_app.DebugLogger

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "main"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    intent.getStringExtra("reminderId")?.let {
        DebugLogger.log("MainActivity: Alarm intent received for reminderId=$it")
    }
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return DefaultReactActivityDelegate(
      this,
      mainComponentName,
      DefaultNewArchitectureEntryPoint.fabricEnabled
    )
  }
}`
  },
  {
    path: 'DebugLogger.kt',
    content: `package app.rork.dominder_android_reminder_app

import android.util.Log

object DebugLogger {
    private const val TAG = "DoMinderDebug"
    fun log(message: String) {
        Log.d(TAG, message)
    }
}`
  },
  {
    path: 'BootReceiver.kt',
    content: `package app.rork.dominder_android_reminder_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val serviceIntent = Intent(context, RescheduleAlarmsService::class.java)
            context.startService(serviceIntent)
        }
    }
}`
  },
  {
    path: 'alarm/AlarmModule.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import android.app.Activity
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import app.rork.dominder_android_reminder_app.DebugLogger

class AlarmModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var ringtonePickerPromise: Promise? = null
    private val RINGTONE_PICKER_REQUEST_CODE = 1001

    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity?,
            requestCode: Int,
            resultCode: Int,
            data: Intent?
        ) {
            if (requestCode == RINGTONE_PICKER_REQUEST_CODE) {
                handleRingtonePickerResult(resultCode, data)
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "AlarmModule"

    @ReactMethod
    fun scheduleAlarm(reminderId: String, title: String, triggerTime: Double, priority: String? = null, promise: Promise? = null) {
        try {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    DebugLogger.log("AlarmModule: SCHEDULE_EXACT_ALARM permission not granted")
                    promise?.reject("PERMISSION_DENIED", "SCHEDULE_EXACT_ALARM permission not granted")
                    return
                }
            }
            
            val intent = Intent(reactContext, AlarmReceiver::class.java).apply {
                action = "app.rork.dominder.ALARM_FIRED"
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("priority", priority ?: "medium")
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            DebugLogger.log("AlarmModule: Scheduling alarm broadcast for \$reminderId at \$triggerTime")
            
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime.toLong(),
                pendingIntent
            )
            
            DebugLogger.log("AlarmModule: Successfully scheduled alarm broadcast")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error scheduling alarm: \$e.message")
            promise?.reject("SCHEDULE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAlarm(reminderId: String, promise: Promise? = null) {
        try {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(reactContext, AlarmReceiver::class.java).apply {
                action = "app.rork.dominder.ALARM_FIRED"
            }
            val pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            promise?.resolve(true)
        } catch (e: Exception) {
            promise?.reject("CANCEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCompletedAlarms(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            val completed = Arguments.createMap()
            
            prefs.all.forEach { (key, value) ->
                if (key.startsWith("completed_")) {
                    val reminderId = key.removePrefix("completed_")
                    completed.putString(reminderId, value.toString())
                }
            }
            
            DebugLogger.log("AlarmModule: Retrieved \${completed.toHashMap().size} completed alarms")
            promise.resolve(completed)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error getting completed alarms: \${e.message}")
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearCompletedAlarm(reminderId: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().remove("completed_\${reminderId}").apply()
            DebugLogger.log("AlarmModule: Cleared completed alarm \${reminderId}")
            promise.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error clearing completed alarm: \${e.message}")
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getSnoozedAlarms(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            val snoozed = Arguments.createMap()
            
            prefs.all.forEach { (key, value) ->
                if (key.startsWith("snoozed_")) {
                    val reminderId = key.removePrefix("snoozed_")
                    snoozed.putString(reminderId, value.toString())
                }
            }
            
            DebugLogger.log("AlarmModule: Retrieved \${snoozed.toHashMap().size} snoozed alarms")
            promise.resolve(snoozed)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error getting snoozed alarms: \${e.message}")
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearSnoozedAlarm(reminderId: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().remove("snoozed_\${reminderId}").apply()
            DebugLogger.log("AlarmModule: Cleared snoozed alarm \${reminderId}")
            promise.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error clearing snoozed alarm: \${e.message}")
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openRingtonePicker(promise: Promise) {
        try {
            val activity = reactContext.currentActivity
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "Activity not available")
                return
            }

            if (ringtonePickerPromise != null) {
                promise.reject("ALREADY_OPEN", "Ringtone picker is already open")
                return
            }

            ringtonePickerPromise = promise

            // Get currently selected ringtone
            val prefs = reactContext.getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
            val savedUriString = prefs.getString("alarm_ringtone_uri", null)

            // Use custom themed ringtone picker
            val intent = Intent(reactContext, RingtonePickerActivity::class.java).apply {
                putExtra("currentUri", savedUriString)
            }

            activity.startActivityForResult(intent, RINGTONE_PICKER_REQUEST_CODE)
            DebugLogger.log("AlarmModule: Launched custom ringtone picker")
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error opening ringtone picker: \${e.message}")
            ringtonePickerPromise?.reject("ERROR", e.message, e)
            ringtonePickerPromise = null
        }
    }

    private fun handleRingtonePickerResult(resultCode: Int, data: Intent?) {
        if (ringtonePickerPromise == null) {
            DebugLogger.log("AlarmModule: No promise for ringtone picker result")
            return
        }

        try {
            if (resultCode == Activity.RESULT_OK && data != null) {
                val uriString = data.getStringExtra("selectedUri")
                
                if (uriString != null) {
                    val uri = Uri.parse(uriString)
                    
                    // Save the selected ringtone URI
                    val prefs = reactContext.getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
                    prefs.edit().putString("alarm_ringtone_uri", uriString).apply()
                    
                    // Get ringtone title for display
                    val ringtone = RingtoneManager.getRingtone(reactContext, uri)
                    val title = ringtone?.getTitle(reactContext) ?: "Custom Ringtone"
                    
                    val result = Arguments.createMap().apply {
                        putString("uri", uriString)
                        putString("title", title)
                    }
                    
                    DebugLogger.log("AlarmModule: Ringtone selected: \$title")
                    ringtonePickerPromise?.resolve(result)
                } else {
                    ringtonePickerPromise?.reject("ERROR", "No URI returned")
                }
            } else {
                ringtonePickerPromise?.reject("CANCELLED", "User cancelled ringtone picker")
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error handling ringtone result: \${e.message}")
            ringtonePickerPromise?.reject("ERROR", e.message, e)
        } finally {
            ringtonePickerPromise = null
        }
    }

    @ReactMethod
    fun getAlarmRingtone(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
            val savedUriString = prefs.getString("alarm_ringtone_uri", null)
            
            if (savedUriString != null) {
                val uri = Uri.parse(savedUriString)
                val ringtone = RingtoneManager.getRingtone(reactContext, uri)
                val title = ringtone?.getTitle(reactContext) ?: "Custom Ringtone"
                
                val result = Arguments.createMap().apply {
                    putString("uri", savedUriString)
                    putString("title", title)
                }
                promise.resolve(result)
            } else {
                val defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                val result = Arguments.createMap().apply {
                    putString("uri", defaultUri.toString())
                    putString("title", "Default Alarm")
                }
                promise.resolve(result)
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error getting ringtone: \${e.message}")
            promise.reject("ERROR", e.message, e)
        }
    }
}`
  }
];

// ==================================================
// 3. NEW: withResourceFiles function
// ==================================================
const withResourceFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const layoutDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'layout');
      
      if (!fs.existsSync(layoutDir)) {
        fs.mkdirSync(layoutDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(layoutDir, 'activity_alarm.xml'), activityAlarmXml);

      // Copy small_icon_card.png into res/drawable (no compression)
      try {
        const drawableDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable');
        if (!fs.existsSync(drawableDir)) {
          fs.mkdirSync(drawableDir, { recursive: true });
        }
        const sourceIcon = path.join(projectRoot, 'small_icon_card.png');
        const targetIcon = path.join(drawableDir, 'small_icon_card.png');
        if (fs.existsSync(sourceIcon)) {
          fs.copyFileSync(sourceIcon, targetIcon);
          console.log('✅ Copied small_icon_card.png to res/drawable');
        } else {
          console.warn('⚠️ small_icon_card.png not found at project root; skipping copy.');
        }
      } catch (e) {
        console.warn('⚠️ Could not copy small_icon_card.png:', e);
      }
      
      return config;
    },
  ]);
};

const withKotlinFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const javaRoot = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'app', 'rork', 'dominder_android_reminder_app');

      files.forEach(file => {
        const filePath = path.join(javaRoot, file.path);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content);
      });

      return config;
    },
  ]);
};

// ==================================================
// 4. UPDATED: withAlarmManifest function
// ==================================================
const withAlarmManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    const requiredPermissions = [
      'android.permission.WAKE_LOCK',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.POST_NOTIFICATIONS',
      // FIX: VIBRATE permission is needed for the custom vibration pattern.
      'android.permission.VIBRATE'
    ];
    requiredPermissions.forEach(permission => {
      if (!manifest["uses-permission"].some(p => p.$['android:name'] === permission)) {
        manifest["uses-permission"].push({ $: { 'android:name': permission } });
      }
    });

    const application = manifest.application[0];

    if (!application.activity) application.activity = [];
    const activities = application.activity.filter(a => 
        a.$['android:name'] !== '.alarm.AlarmActivity' && 
        a.$['android:name'] !== '.alarm.RingtonePickerActivity'
    );
    activities.push({
      $: {
        'android:name': '.alarm.AlarmActivity',
        'android:showWhenLocked': 'true',
        'android:turnScreenOn': 'true',
        'android:excludeFromRecents': 'true',
        'android:exported': 'true', // Must be true to be started by system
        'android:launchMode': 'singleTask',
        'android:theme': '@style/Theme.AppCompat.DayNight.NoActionBar'
      },
    });
    // Add RingtonePickerActivity
    activities.push({
      $: {
        'android:name': '.alarm.RingtonePickerActivity',
        'android:exported': 'false',
        'android:theme': '@style/Theme.AppCompat.DayNight.NoActionBar'
      },
    });
    application.activity = activities;

    if (!application.receiver) application.receiver = [];
    const receivers = application.receiver.filter(r => 
        r.$['android:name'] !== '.alarm.AlarmReceiver' && 
        r.$['android:name'] !== '.BootReceiver' &&
        r.$['android:name'] !== '.alarm.AlarmActionBridge' // Filter out old one if present
    );
    
    // FIX: Add intent-filter to AlarmReceiver to reliably receive 'ALARM_FIRED' broadcasts,
    // which is crucial for Android 12+ compatibility.
    receivers.push({
      $: { 'android:name': '.alarm.AlarmReceiver', 'android:exported': 'false' },
      'intent-filter': [{
        action: [
          { $: { 'android:name': 'app.rork.dominder.ALARM_FIRED' } }
        ]
      }]
    });

    receivers.push({
      $: { 'android:name': '.BootReceiver', 'android:exported': 'true', 'android:enabled': 'true' },
      'intent-filter': [{
        action: [
          { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
          { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } }
        ]
      }]
    });
    
    // NEW: Register AlarmActionBridge
    // FIX: Change 'android:exported' from a boolean to a string 'false' for consistency
    // with other manifest entries.
    receivers.push({
        $: { 'android:name': '.alarm.AlarmActionBridge', 'android:exported': 'false' },
        'intent-filter': [{
            action: [
                { $: { 'android:name': 'app.rork.dominder.ALARM_DONE' } },
                { $: { 'android:name': 'app.rork.dominder.ALARM_SNOOZE' } }
            ]
        }]
    });
    application.receiver = receivers;

    if (!application.service) application.service = [];
    const services = application.service.filter(s => s.$['android:name'] !== '.RescheduleAlarmsService');
    services.push({
      $: { 
        'android:name': '.RescheduleAlarmsService',
        'android:exported': 'false'
      },
    });
    application.service = services;

    return config;
  });
};

const withAppGradle = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      if (!buildGradle.includes('kotlinOptions')) {
        buildGradle = buildGradle.replace(
          /(\n\s*android\s*{\s*)/,
          `$1    kotlinOptions {
        jvmTarget = "17"
    }
`
        );
      }
      if (!buildGradle.includes('compileOptions')) {
        buildGradle = buildGradle.replace(
          /(\n\s*android\s*{\s*)/,
          `$1    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
`
        );
      }
      config.modResults.contents = buildGradle;
    }
    return config;
  });
};

// ==================================================
// 5. UPDATED: module.exports
// ==================================================
module.exports = (config) => withPlugins(config, [
    withResourceFiles, // Added first
    withKotlinFiles, 
    withAlarmManifest,
    withAppGradle
]);
