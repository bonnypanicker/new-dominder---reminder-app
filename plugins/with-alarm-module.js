const { withDangerousMod, withPlugins, withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// =================================
// 1. NEW: activity_alarm.xml content
// =================================
const activityAlarmXml = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#1A1A1A"
    android:orientation="vertical"
    android:fitsSystemWindows="true">

    <!-- Status Bar Space -->
    <View
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="0"
        android:minHeight="24dp" />

    <!-- Main Content Container -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="vertical"
        android:paddingStart="24dp"
        android:paddingEnd="24dp"
        android:paddingTop="32dp"
        android:paddingBottom="32dp"
        android:gravity="center">

        <!-- Header Label -->
        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="REMINDER"
            android:textColor="#8A8A8A"
            android:textSize="11sp"
            android:fontFamily="sans-serif-medium"
            android:letterSpacing="0.15"
            android:layout_marginBottom="24dp" />

        <!-- Reminder Title -->
        <TextView
            android:id="@+id/alarm_title"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:textColor="#FFFFFF"
            android:textSize="28sp"
            android:fontFamily="sans-serif"
            android:gravity="center"
            android:lineSpacingMultiplier="1.3"
            android:layout_marginBottom="48dp"
            android:maxLines="3"
            android:ellipsize="end"
            tools:text="Reminder Title" />

        <!-- Time Display - Minimal Design -->
        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:gravity="center"
            android:layout_marginBottom="64dp">

            <TextView
                android:id="@+id/current_time"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textColor="#FFFFFF"
                android:textSize="72sp"
                android:fontFamily="sans-serif-light"
                android:letterSpacing="0.02"
                tools:text="12:34 PM" />
            
            <!-- Subtle underline -->
            <View
                android:layout_width="120dp"
                android:layout_height="1dp"
                android:background="#333333"
                android:layout_marginTop="12dp" />
        </LinearLayout>

    </LinearLayout>

    <!-- Bottom Action Section -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:paddingStart="24dp"
        android:paddingEnd="24dp"
        android:paddingBottom="40dp"
        android:background="#1A1A1A">

        <!-- Snooze Label -->
        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:text="Snooze Duration"
            android:textColor="#8A8A8A"
            android:textSize="12sp"
            android:fontFamily="sans-serif"
            android:letterSpacing="0.05"
            android:layout_marginBottom="16dp" />

        <!-- Snooze Buttons Grid -->
        <LinearLayout
            android:id="@+id/snooze_buttons"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center"
            android:layout_marginBottom="24dp">

            <com.google.android.material.button.MaterialButton
                android:id="@+id/snooze_5m"
                android:layout_width="0dp"
                android:layout_height="52dp"
                android:layout_weight="1"
                android:textColor="#E0E0E0"
                android:text="5m"
                android:textSize="16sp"
                android:fontFamily="sans-serif"
                android:layout_marginEnd="8dp"
                style="@style/Widget.Material3.Button.OutlinedButton"
                app:strokeWidth="1dp"
                app:strokeColor="#3A3A3A"
                app:cornerRadius="12dp"
                app:backgroundTint="#252525"
                app:rippleColor="#3A3A3A" />

            <com.google.android.material.button.MaterialButton
                android:id="@+id/snooze_10m"
                android:layout_width="0dp"
                android:layout_height="52dp"
                android:layout_weight="1"
                android:textColor="#E0E0E0"
                android:text="10m"
                android:textSize="16sp"
                android:fontFamily="sans-serif"
                android:layout_marginEnd="8dp"
                style="@style/Widget.Material3.Button.OutlinedButton"
                app:strokeWidth="1dp"
                app:strokeColor="#3A3A3A"
                app:cornerRadius="12dp"
                app:backgroundTint="#252525"
                app:rippleColor="#3A3A3A" />

            <com.google.android.material.button.MaterialButton
                android:id="@+id/snooze_15m"
                android:layout_width="0dp"
                android:layout_height="52dp"
                android:layout_weight="1"
                android:textColor="#E0E0E0"
                android:text="15m"
                android:textSize="16sp"
                android:fontFamily="sans-serif"
                android:layout_marginEnd="8dp"
                style="@style/Widget.Material3.Button.OutlinedButton"
                app:strokeWidth="1dp"
                app:strokeColor="#3A3A3A"
                app:cornerRadius="12dp"
                app:backgroundTint="#252525"
                app:rippleColor="#3A3A3A" />

            <com.google.android.material.button.MaterialButton
                android:id="@+id/snooze_30m"
                android:layout_width="0dp"
                android:layout_height="52dp"
                android:layout_weight="1"
                android:textColor="#E0E0E0"
                android:text="30m"
                android:textSize="16sp"
                android:fontFamily="sans-serif"
                style="@style/Widget.Material3.Button.OutlinedButton"
                app:strokeWidth="1dp"
                app:strokeColor="#3A3A3A"
                app:cornerRadius="12dp"
                app:backgroundTint="#252525"
                app:rippleColor="#3A3A3A" />
        </LinearLayout>

        <!-- Done Button -->
        <com.google.android.material.button.MaterialButton
            android:id="@+id/done_button"
            android:layout_width="match_parent"
            android:layout_height="56dp"
            android:textColor="#1A1A1A"
            android:text="Done"
            android:textSize="15sp"
            android:fontFamily="sans-serif-medium"
            android:letterSpacing="0.05"
            style="@style/Widget.Material3.Button"
            app:cornerRadius="12dp"
            app:rippleColor="#D0D0D0"
            app:backgroundTint="#FFFFFF" />

    </LinearLayout>

</LinearLayout>`;

// =================================
// 2. UPDATED: Kotlin files array
// =================================
const files = [
    // NEW: AlarmActionBridge.kt
    {
        path: 'alarm/AlarmActionBridge.kt',
        content: `package app.rork.dominder_android_reminder_app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
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
                val title = intent.getStringExtra("title") ?: "Reminder"
                val priority = intent.getStringExtra("priority") ?: "medium"

                DebugLogger.log("AlarmActionBridge: ALARM_SNOOZE - reminderId: \${reminderId}, minutes: \${snoozeMinutes}")
                if (reminderId != null) {
                    // 1. Schedule Native Alarm IMMEDIATELY (Fallback)
                    scheduleNativeAlarm(context, reminderId, title, priority, snoozeMinutes)

                    // 2. Try emit to RN (UI Update)
                    DebugLogger.log("AlarmActionBridge: About to emit alarmSnooze event to React Native")
                    emitEventToReactNative(context, "alarmSnooze", reminderId, snoozeMinutes)
                    DebugLogger.log("AlarmActionBridge: emitEventToReactNative call completed")
                } else {
                    DebugLogger.log("AlarmActionBridge: ERROR - reminderId is NULL!")
                }
            }
            "com.dominder.MISSED_ALARM" -> {
                val reminderId = intent.getStringExtra("reminderId")
                val title = intent.getStringExtra("title")
                val time = intent.getStringExtra("time")
                
                DebugLogger.log("AlarmActionBridge: MISSED_ALARM - reminderId: \${reminderId}")
                
                if (reminderId != null) {
                    emitMissedAlarmToReactNative(context, reminderId, title, time)
                }
            }
            else -> {
                DebugLogger.log("AlarmActionBridge: Unknown action received: \${action}")
            }
        }
    }
    
    private fun scheduleNativeAlarm(context: Context, reminderId: String, title: String, priority: String, minutes: Int) {
        try {
            DebugLogger.log("AlarmActionBridge: Scheduling native fallback alarm")
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val triggerTime = System.currentTimeMillis() + (minutes * 60 * 1000L)
            
             val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = "app.rork.dominder.ALARM_FIRED"
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("priority", priority)
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                 if (!alarmManager.canScheduleExactAlarms()) {
                     DebugLogger.log("AlarmActionBridge: cannot schedule exact alarm, skipping native fallback")
                     return
                 }
            }

            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            )
            DebugLogger.log("AlarmActionBridge: Native fallback alarm scheduled for \${triggerTime}")

        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error scheduling native fallback: \${e.message}")
        }
    }
    
    private fun emitMissedAlarmToReactNative(context: Context, reminderId: String, title: String?, time: String?) {
        try {
            val app = context.applicationContext
            if (app is ReactApplication) {
                val reactInstanceManager = app.reactNativeHost.reactInstanceManager
                val reactContext = reactInstanceManager.currentReactContext
                
                if (reactContext != null) {
                    val params = Arguments.createMap().apply {
                        putString("reminderId", reminderId)
                        putString("title", title ?: "Reminder")
                        putString("time", time ?: "")
                    }
                    
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onMissedAlarm", params)
                        
                    DebugLogger.log("AlarmActionBridge: Emitted onMissedAlarm event")
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error emitting missed alarm: \${e.message}")
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
    // NEW: AlarmRingtoneService.kt
    {
        path: 'alarm/AlarmRingtoneService.kt',
        content: `package app.rork.dominder_android_reminder_app.alarm

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.*
import android.os.VibrationEffect
import androidx.core.app.NotificationCompat
import app.rork.dominder_android_reminder_app.DebugLogger
import app.rork.dominder_android_reminder_app.R

class AlarmRingtoneService : Service() {
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var isServiceRunning = false
    
    companion object {
        private const val NOTIFICATION_ID = 9999
        private const val CHANNEL_ID = "alarm_ringtone_service"
        private var serviceInstance: AlarmRingtoneService? = null
        
        fun startAlarmRingtone(context: Context, reminderId: String, title: String, priority: String) {
            DebugLogger.log("AlarmRingtoneService: startAlarmRingtone called - priority: \$priority")
            val intent = Intent(context, AlarmRingtoneService::class.java).apply {
                action = "app.rork.dominder.START_ALARM_RINGTONE"
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("priority", priority)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stopAlarmRingtone(context: Context) {
            DebugLogger.log("AlarmRingtoneService: stopAlarmRingtone called")
            context.startService(Intent(context, AlarmRingtoneService::class.java).apply {
                action = "app.rork.dominder.STOP_ALARM_RINGTONE"
            })
        }
        
        fun isServiceRunning(): Boolean {
            return serviceInstance?.isServiceRunning == true
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        DebugLogger.log("AlarmRingtoneService: onCreate")
        serviceInstance = this
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        DebugLogger.log("AlarmRingtoneService: onStartCommand - action: \${intent?.action}")
        
        when (intent?.action) {
            "app.rork.dominder.START_ALARM_RINGTONE" -> {
                val priority = intent.getStringExtra("priority") ?: "medium"
                val title = intent.getStringExtra("title") ?: "Reminder"
                val reminderId = intent.getStringExtra("reminderId") ?: ""
                
                DebugLogger.log("AlarmRingtoneService: Starting ringtone for priority: \$priority")
                
                // Only play for high priority alarms
                if (priority == "high") {
                    startForegroundService(title, reminderId)
                    startRingtoneAndVibration()
                } else {
                    DebugLogger.log("AlarmRingtoneService: Skipping ringtone (priority=\$priority, only high priority plays)")
                    stopSelf()
                }
            }
            "app.rork.dominder.STOP_ALARM_RINGTONE" -> {
                DebugLogger.log("AlarmRingtoneService: Stopping ringtone service")
                stopRingtoneAndVibration()
                stopSelf()
            }
        }
        
        return START_NOT_STICKY
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alarm Ringtone Service",
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = "Plays alarm ringtone in background"
                setSound(null, null)
                enableVibration(false)
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun startForegroundService(title: String, reminderId: String) {
        DebugLogger.log("AlarmRingtoneService: Starting foreground service")
        
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Reminder")
            .setContentText(title)
            .setSmallIcon(R.drawable.small_icon_noti)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setOngoing(true)
            .setSilent(true)
            .build()
        
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        isServiceRunning = true
    }
    
    private fun startRingtoneAndVibration() {
        try {
            DebugLogger.log("AlarmRingtoneService: Starting ringtone and vibration")
            
            // Check settings for sound and vibration
            val prefs = getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
            val soundEnabled = prefs.getBoolean("ringer_sound_enabled", true)
            val vibrationEnabled = prefs.getBoolean("ringer_vibration_enabled", true)
            
            DebugLogger.log("AlarmRingtoneService: Settings - sound: \$soundEnabled, vibration: \$vibrationEnabled")
            
            // Acquire wake lock for 10 minutes max
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "AlarmRingtoneService::WakeLock"
            ).apply {
                acquire(10 * 60 * 1000L) // 10 minutes
            }
            
            // Start ringtone only if sound is enabled
            if (soundEnabled) {
                startRingtone()
            } else {
                DebugLogger.log("AlarmRingtoneService: Ringer sound disabled, skipping ringtone")
            }
            
            // Start vibration only if vibration is enabled
            if (vibrationEnabled) {
                startVibration()
            } else {
                DebugLogger.log("AlarmRingtoneService: Ringer vibration disabled, skipping vibration")
            }
            
        } catch (e: Exception) {
            DebugLogger.log("AlarmRingtoneService: Error starting ringtone/vibration: \${e.message}")
        }
    }
    
    private var originalAlarmVolume: Int = -1
    private var audioManager: AudioManager? = null
    
    private fun startRingtone() {
        try {
            // Get saved ringtone URI and volume from SharedPreferences
            val prefs = getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
            val savedUriString = prefs.getString("alarm_ringtone_uri", null)
            val volumePercent = prefs.getInt("ringer_volume", 100)
            
            val ringtoneUri = if (savedUriString != null) {
                DebugLogger.log("AlarmRingtoneService: Using saved ringtone: \$savedUriString")
                Uri.parse(savedUriString)
            } else {
                DebugLogger.log("AlarmRingtoneService: Using default alarm ringtone")
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            }
            
            // Get AudioManager and set alarm volume to override silent/low volume
            audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxVolume = audioManager?.getStreamMaxVolume(AudioManager.STREAM_ALARM) ?: 7
            originalAlarmVolume = audioManager?.getStreamVolume(AudioManager.STREAM_ALARM) ?: -1
            
            // Calculate target volume from percentage
            val targetVolume = (maxVolume * volumePercent / 100).coerceAtLeast(1)
            
            // Set alarm stream volume (bypasses silent mode for STREAM_ALARM)
            audioManager?.setStreamVolume(AudioManager.STREAM_ALARM, targetVolume, 0)
            DebugLogger.log("AlarmRingtoneService: Set alarm volume to \$targetVolume/\$maxVolume (\$volumePercent%)")
            
            // Use MediaPlayer for full song playback with looping
            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, ringtoneUri)
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                            .build()
                    )
                } else {
                    @Suppress("DEPRECATION")
                    setAudioStreamType(AudioManager.STREAM_ALARM)
                }
                
                // Set looping to true for continuous playback
                isLooping = true
                
                setOnCompletionListener {
                    // Restart if somehow looping fails
                    try {
                        if (!it.isLooping) {
                            it.seekTo(0)
                            it.start()
                        }
                    } catch (e: Exception) {
                        DebugLogger.log("AlarmRingtoneService: Error in completion listener: \${e.message}")
                    }
                }
                
                setOnErrorListener { mp, what, extra ->
                    DebugLogger.log("AlarmRingtoneService: MediaPlayer error: what=\$what, extra=\$extra")
                    false // Return false to trigger OnCompletionListener
                }
                
                prepare()
                start()
                
                DebugLogger.log("AlarmRingtoneService: MediaPlayer started playing (looping=\${isLooping})")
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmRingtoneService: Error starting ringtone: \${e.message}")
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
                
                DebugLogger.log("AlarmRingtoneService: Vibration started")
            } else {
                DebugLogger.log("AlarmRingtoneService: Device has no vibrator")
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmRingtoneService: Error starting vibration: \${e.message}")
        }
    }
    
    private fun stopRingtoneAndVibration() {
        try {
            DebugLogger.log("AlarmRingtoneService: Stopping ringtone and vibration")
            
            // Explicitly remove foreground notification
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }

            // Stop ringtone
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
                DebugLogger.log("AlarmRingtoneService: MediaPlayer stopped and released")
            }
            mediaPlayer = null
            
            // Restore original alarm volume
            if (originalAlarmVolume >= 0 && audioManager != null) {
                audioManager?.setStreamVolume(AudioManager.STREAM_ALARM, originalAlarmVolume, 0)
                DebugLogger.log("AlarmRingtoneService: Restored original alarm volume to \$originalAlarmVolume")
            }
            originalAlarmVolume = -1
            audioManager = null
            
            // Stop vibration
            vibrator?.cancel()
            DebugLogger.log("AlarmRingtoneService: Vibration stopped")
            
            // Release wake lock
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    DebugLogger.log("AlarmRingtoneService: Wake lock released")
                }
            }
            wakeLock = null
            
            isServiceRunning = false
            
        } catch (e: Exception) {
            DebugLogger.log("AlarmRingtoneService: Error stopping ringtone/vibration: \${e.message}")
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        DebugLogger.log("AlarmRingtoneService: onDestroy")
        stopRingtoneAndVibration()
        serviceInstance = null
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}`
    },
    // UPDATED: AlarmActivity.kt
    {
        path: 'alarm/AlarmActivity.kt',
        content: `package app.rork.dominder_android_reminder_app.alarm

import android.app.KeyguardManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
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
        DebugLogger.log("AlarmActivity: Snoozing for \${minutes} minutes, reminderId: \${reminderId}")
        
        // Stop ringtone service
        AlarmRingtoneService.stopAlarmRingtone(this)
        
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
        DebugLogger.log("AlarmActivity: Done clicked for reminderId: \${reminderId}")
        
        // Stop ringtone service
        AlarmRingtoneService.stopAlarmRingtone(this)
        
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
            finishAlarmProperly()
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
            DebugLogger.log("AlarmActivity: Failed to post missed notification: \${e.message}")
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
                    DebugLogger.log("AlarmActivity: Error killing process: \${e.message}")
                }
            }, 500)
            
            DebugLogger.log("AlarmActivity: Finish sequence initiated")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActivity: Error in finishAlarmProperly: \${e.message}")
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

        // CRITICAL: Check if reminder is paused before firing
        val prefs = context.getSharedPreferences("DoMinderPausedReminders", Context.MODE_PRIVATE)
        val isPaused = prefs.getBoolean("paused_\$reminderId", false)
        if (isPaused) {
            DebugLogger.log("AlarmReceiver: Reminder \$reminderId is PAUSED - skipping alarm")
            return
        }

        // Start AlarmRingtoneService for high priority reminders
        if (priority == "high") {
            DebugLogger.log("AlarmReceiver: Starting AlarmRingtoneService for high priority")
            AlarmRingtoneService.startAlarmRingtone(context, reminderId, title, priority)
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
            .setSmallIcon(R.drawable.small_icon_noti)
            .setColor(0xFF6750A4.toInt())
            .setColorized(true)
            .setContentTitle(title)
            .setContentText("Reminder")
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
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
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
        
        // Make status bar seamless/transparent - Android 15+ compatible
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = true // Dark icons for light background
        
        // Get status bar height for proper padding
        val statusBarHeight = getStatusBarHeight()
        
        // Main container matching Reminder Defaults design
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0xFFFEF7FF.toInt()) // Material3Colors.light.surface
            setPadding(0, 0, 0, 0)
            fitsSystemWindows = false
        }

        // Header matching Reminder Defaults modal style - seamless with status bar
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            // Add status bar height to top padding for seamless look
            setPadding(64, statusBarHeight + 52, 52, 52)
            setBackgroundColor(0xFFFEF7FF.toInt()) // Material3Colors.light.surface - same as main
            elevation = 0f // No elevation for seamless look
        }

        val titleText = TextView(this).apply {
            text = "Ringer Mode Tone"
            textSize = 20f // fontSize 20
            setTextColor(0xFF1C1B1F.toInt()) // onSurface
            typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD) // fontWeight 600
            layoutParams = LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
            )
        }

        val doneButton = TextView(this).apply {
            text = "Done"
            textSize = 14f // fontSize 14
            setTextColor(0xFF6750A4.toInt()) // Material3Colors.light.primary
            typeface = android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL) // fontWeight 500
            setPadding(42, 20, 42, 20) // paddingHorizontal 16dp, paddingVertical 8dp
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(0xFFE8DEF8.toInt()) // Material3Colors.light.primaryContainer
                cornerRadius = 52f // borderRadius 20
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                stopCurrentRingtone()
                val result = Intent().apply {
                    putExtra("selectedUri", selectedUri.toString())
                }
                setResult(Activity.RESULT_OK, result)
                finish()
            }
        }

        header.addView(titleText)
        header.addView(doneButton)
        mainLayout.addView(header)

        // ScrollView container matching Reminder Defaults - scrollable, no visible scroll bars
        val scrollContainer = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
            setPadding(64, 64, 64, 64) // padding 24dp matching defaultsList style
            setBackgroundColor(0xFFFEF7FF.toInt())
            // Hide scroll bar indicator but keep scrolling enabled
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            // Ensure scrolling works properly
            isFillViewport = true
            isNestedScrollingEnabled = true
            // Smooth scrolling
            isSmoothScrollingEnabled = true
        }
        
        val contentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        
        // Section title matching defaultsSectionTitle style
        val sectionTitle = TextView(this).apply {
            text = "SELECT TONE"
            textSize = 14f // fontSize 14
            setTextColor(0xFF49454F.toInt()) // Material3Colors.light.onSurfaceVariant
            typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD) // fontWeight 600
            letterSpacing = 0.05f // letterSpacing 0.5
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = 42 // marginBottom 16dp
            }
        }
        contentLayout.addView(sectionTitle)

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

        // Browse button matching option chip style
        val browseButton = TextView(this).apply {
            text = "📁 Browse Custom Songs"
            textSize = 14f // fontSize 14
            setTextColor(0xFF6750A4.toInt()) // primary color
            typeface = android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL) // fontWeight 500
            setPadding(42, 26, 42, 26) // paddingHorizontal 16dp, paddingVertical 10dp
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(0xFFE8DEF8.toInt()) // Material3Colors.light.primaryContainer
                cornerRadius = 52f // borderRadius 20
                setStroke(3, 0xFF6750A4.toInt()) // primary border
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, 52) // margin bottom 20dp
            }
            setOnClickListener {
                stopCurrentRingtone()
                openFilePicker()
            }
        }
        contentLayout.addView(browseButton)
        
        // Show custom song if selected - Simple list item style
        val customSongCard = if (customSongUri != null && customSongName != null) {
            val isSelected = customSongUri == selectedUri
            
            TextView(this).apply {
                text = "🎵 \${customSongName}"
                textSize = 16f
                setTextColor(if (isSelected) 0xFF6750A4.toInt() else 0xFF1C1B1F.toInt())
                typeface = android.graphics.Typeface.create("sans-serif", if (isSelected) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
                setPadding(48, 36, 48, 36)
                setBackgroundColor(if (isSelected) 0xFFE8DEF8.toInt() else 0x00000000.toInt())
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 16) // Extra margin bottom before system ringtones
                }
                isClickable = true
                isFocusable = true
                setOnClickListener { view ->
                    stopCurrentRingtone()
                    selectedUri = customSongUri
                    try {
                        currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, customSongUri)
                        currentlyPlaying?.play()
                    } catch (e: Exception) {
                        DebugLogger.log("Error playing custom song preview: \${e.message}")
                    }
                    // Update selection visually - deselect all, select this one
                    (view.parent as? LinearLayout)?.let { parent ->
                        for (i in 0 until parent.childCount) {
                            val child = parent.getChildAt(i)
                            // Skip section title and browse button
                            if (child is TextView && child.text.toString() != "SELECT TONE" && !child.text.toString().contains("Browse")) {
                                val isThisItem = child == view
                                child.setBackgroundColor(if (isThisItem) 0xFFE8DEF8.toInt() else 0x00000000.toInt())
                                child.setTextColor(if (isThisItem) 0xFF6750A4.toInt() else 0xFF1C1B1F.toInt())
                                child.typeface = android.graphics.Typeface.create("sans-serif", if (isThisItem) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
                            }
                        }
                    }
                }
            }
        } else null
        
        if (customSongCard != null) {
            contentLayout.addView(customSongCard)
        }

        // Add each ringtone as a simple list item
        ringtones.forEach { (title, uri) ->
            val isSelected = uri == selectedUri
            
            val ringtoneItem = TextView(this).apply {
                text = title
                textSize = 16f // Slightly larger for better readability
                setTextColor(if (isSelected) 0xFF6750A4.toInt() else 0xFF1C1B1F.toInt()) // primary when selected, onSurface otherwise
                typeface = android.graphics.Typeface.create("sans-serif", if (isSelected) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
                setPadding(48, 36, 48, 36) // More padding for easier clicking
                
                // Simple background - just a subtle highlight when selected
                setBackgroundColor(if (isSelected) 0xFFE8DEF8.toInt() else 0x00000000.toInt()) // primaryContainer when selected, transparent otherwise
                
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, // Full width for easier clicking
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 2) // Small gap between items
                }
                
                // Make it clear it's clickable
                isClickable = true
                isFocusable = true
                
                setOnClickListener { view ->
                    stopCurrentRingtone()
                    selectedUri = uri
                    
                    // Play preview
                    try {
                        currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, uri)
                        currentlyPlaying?.play()
                    } catch (e: Exception) {
                        DebugLogger.log("Error playing ringtone preview: \${e.message}")
                    }
                    
                    // Update selection visually - deselect all, select this one
                    (view.parent as? LinearLayout)?.let { parent ->
                        for (i in 0 until parent.childCount) {
                            val child = parent.getChildAt(i)
                            // Skip section title and browse button
                            if (child is TextView && child.text.toString() != "SELECT TONE" && !child.text.toString().contains("Browse")) {
                                val isThisItem = child == view
                                child.setBackgroundColor(if (isThisItem) 0xFFE8DEF8.toInt() else 0x00000000.toInt())
                                child.setTextColor(if (isThisItem) 0xFF6750A4.toInt() else 0xFF1C1B1F.toInt())
                                child.typeface = android.graphics.Typeface.create("sans-serif", if (isThisItem) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
                            }
                        }
                    }
                }
            }
            
            contentLayout.addView(ringtoneItem)
        }

        scrollContainer.addView(contentLayout)
        mainLayout.addView(scrollContainer)

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
    
    private fun getStatusBarHeight(): Int {
        var result = 0
        val resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
        if (resourceId > 0) {
            result = resources.getDimensionPixelSize(resourceId)
        }
        return result
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
        path: 'alarm/MissedAlarmReceiver.kt',
        content: `package app.rork.dominder_android_reminder_app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import app.rork.dominder_android_reminder_app.DebugLogger

class MissedAlarmReceiver(private val reactContext: ReactApplicationContext) : BroadcastReceiver() {

    init {
        val filter = IntentFilter("com.dominder.MISSED_ALARM")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(this, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(this, filter)
        }
        DebugLogger.log("MissedAlarmReceiver: Registered broadcast receiver")
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == "com.dominder.MISSED_ALARM") {
            val reminderId = intent.getStringExtra("reminderId") ?: return
            val title = intent.getStringExtra("title") ?: ""
            val time = intent.getStringExtra("time") ?: ""

            DebugLogger.log("MissedAlarmReceiver: Received missed alarm for \$reminderId")

            val params: WritableMap = Arguments.createMap().apply {
                putString("reminderId", reminderId)
                putString("title", title)
                putString("time", time)
            }

            sendEvent(reactContext, "onMissedAlarm", params)
        }
    }

    private fun sendEvent(reactContext: ReactContext, eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    fun cleanup() {
        try {
            reactContext.unregisterReceiver(this)
            DebugLogger.log("MissedAlarmReceiver: Unregistered broadcast receiver")
        } catch (e: Exception) {
            DebugLogger.log("MissedAlarmReceiver: Error unregistering: \${e.message}")
        }
    }
}`
    },
    {
        path: 'alarm/MissedAlarmDeleteReceiver.kt',
        content: `package app.rork.dominder_android_reminder_app.alarm

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.DebugLogger
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class MissedAlarmDeleteReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "com.dominder.DELETE_MISSED_ALARM") return
        
        val reminderId = intent.getStringExtra("reminderId") ?: return
        val notificationId = intent.getIntExtra("notificationId", 0)
        
        DebugLogger.log("MissedAlarmDeleteReceiver: Delete action for reminder \$reminderId")
        
        // Cancel the notification
        if (notificationId != 0) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
            DebugLogger.log("MissedAlarmDeleteReceiver: Cancelled notification \$notificationId")
        }
        
        // Mark reminder as deleted in SharedPreferences for JS to pick up
        try {
            val prefs = context.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString("deleted_\${reminderId}", System.currentTimeMillis().toString())
                apply()
            }
            DebugLogger.log("MissedAlarmDeleteReceiver: Saved deletion to SharedPreferences")
        } catch (e: Exception) {
            DebugLogger.log("MissedAlarmDeleteReceiver: Error saving to SharedPreferences: \${e.message}")
        }
        
        // Try to emit event to React Native if app is running
        try {
            val app = context.applicationContext
            if (app is ReactApplication) {
                val reactInstanceManager = app.reactNativeHost.reactInstanceManager
                val reactContext = reactInstanceManager.currentReactContext
                
                if (reactContext != null) {
                    val params = Arguments.createMap().apply {
                        putString("reminderId", reminderId)
                    }
                    
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onMissedAlarmDeleted", params)
                        
                    DebugLogger.log("MissedAlarmDeleteReceiver: Emitted onMissedAlarmDeleted event")
                } else {
                    DebugLogger.log("MissedAlarmDeleteReceiver: ReactContext is null, deletion saved to SharedPreferences")
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("MissedAlarmDeleteReceiver: Error emitting event: \${e.message}")
        }
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
    private var missedAlarmReceiver: MissedAlarmReceiver? = null
    
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        // Initialize the missed alarm receiver
        missedAlarmReceiver = MissedAlarmReceiver(reactContext)
        
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

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.ReactApplication

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
                
                if (Build.VERSION.SDK_INT >= 34) {
                    try {
                        startForeground(1001, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
                    } catch (e: Exception) {
                        DebugLogger.error("RescheduleAlarmsService: Failed to start foreground service", e)
                        stopSelf()
                    }
                } else {
                    startForeground(1001, notification)
                }
            }
        }

        // Ensure React Context is initialized to avoid CatalystInstance not available errors
        try {
            val reactInstanceManager = (application as ReactApplication).reactNativeHost.reactInstanceManager
            if (!reactInstanceManager.hasStartedCreatingInitialContext()) {
                reactInstanceManager.createReactContextInBackground()
            }
        } catch (e: Exception) {
            DebugLogger.error("RescheduleAlarmsService: Failed to initialize React Context", e)
        }

        try {
            return super.onStartCommand(intent, flags, startId)
        } catch (e: Exception) {
            DebugLogger.error("RescheduleAlarmsService: Failed to start headless task", e)
            stopSelf()
            return START_NOT_STICKY
        }
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
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import expo.modules.ReactActivityDelegateWrapper
import app.rork.dominder_android_reminder_app.DebugLogger
import com.facebook.react.ReactRootView

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "main"

  override fun onCreate(savedInstanceState: Bundle?) {
    // Enable edge-to-edge
    WindowCompat.setDecorFitsSystemWindows(window, false)
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
    return ReactActivityDelegateWrapper(
      this,
      DefaultNewArchitectureEntryPoint.fabricEnabled,
      DefaultReactActivityDelegate(
        this,
        mainComponentName,
        DefaultNewArchitectureEntryPoint.fabricEnabled
      )
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

    fun error(message: String, e: Throwable? = null) {
        if (e != null) {
            Log.e(TAG, message, e)
        } else {
            Log.e(TAG, message)
        }
    }
}`
    },
    {
        path: 'RescheduleAlarmsWorker.kt',
        content: `package app.rork.dominder_android_reminder_app

import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.work.Worker
import androidx.work.WorkerParameters

class RescheduleAlarmsWorker(context: Context, workerParams: WorkerParameters) : Worker(context, workerParams) {
    override fun doWork(): Result {
        val context = applicationContext
        val serviceIntent = Intent(context, RescheduleAlarmsService::class.java)
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            DebugLogger.error("RescheduleAlarmsWorker: Failed to start service", e)
            return Result.failure()
        }
        
        return Result.success()
    }
}`
    },
    {
        path: 'BootReceiver.kt',
        content: `package app.rork.dominder_android_reminder_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.OneTimeWorkRequest
import androidx.work.WorkManager

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val workRequest = OneTimeWorkRequest.Builder(RescheduleAlarmsWorker::class.java).build()
            WorkManager.getInstance(context).enqueue(workRequest)
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
            promise?.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setReminderPaused(reminderId: String, isPaused: Boolean, promise: Promise? = null) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderPausedReminders", Context.MODE_PRIVATE)
            prefs.edit().apply {
                if (isPaused) {
                    putBoolean("paused_\$reminderId", true)
                } else {
                    remove("paused_\$reminderId")
                }
                apply()
            }
            DebugLogger.log("AlarmModule: Set reminder \$reminderId paused=\$isPaused")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error setting reminder paused: \${e.message}")
            promise?.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun saveNotificationSettings(soundEnabled: Boolean, vibrationEnabled: Boolean, ringerVolume: Int = 100, promise: Promise? = null) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putBoolean("ringer_sound_enabled", soundEnabled)
                putBoolean("ringer_vibration_enabled", vibrationEnabled)
                putInt("ringer_volume", ringerVolume)
                apply()
            }
            DebugLogger.log("AlarmModule: Saved notification settings - sound: \$soundEnabled, vibration: \$vibrationEnabled, volume: \$ringerVolume%")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error saving notification settings: \${e.message}")
            promise?.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun showToast(message: String, duration: Int = 0) {
        try {
            val toastDuration = if (duration == 1) android.widget.Toast.LENGTH_LONG else android.widget.Toast.LENGTH_SHORT
            android.os.Handler(android.os.Looper.getMainLooper()).post {
                android.widget.Toast.makeText(reactContext, message, toastDuration).show()
            }
            DebugLogger.log("AlarmModule: Toast shown: \$message")
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error showing toast: \${e.message}")
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
    fun getDeletedAlarms(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            val deleted = Arguments.createMap()
            
            prefs.all.forEach { (key, value) ->
                if (key.startsWith("deleted_")) {
                    val reminderId = key.removePrefix("deleted_")
                    deleted.putString(reminderId, value.toString())
                }
            }
            
            DebugLogger.log("AlarmModule: Retrieved \${deleted.toHashMap().size} deleted alarms")
            promise.resolve(deleted)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error getting deleted alarms: \${e.message}")
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearDeletedAlarm(reminderId: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().remove("deleted_\${reminderId}").apply()
            DebugLogger.log("AlarmModule: Cleared deleted alarm \${reminderId}")
            promise.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error clearing deleted alarm: \${e.message}")
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

    @ReactMethod
    fun finishAffinity() {
        try {
            val activity = reactContext.currentActivity
            activity?.finishAffinity()
            DebugLogger.log("AlarmModule: finishAffinity called")
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error in finishAffinity: \${e.message}")
        }
    }

    @ReactMethod
    fun minimize() {
        try {
            val activity = reactContext.currentActivity
            activity?.moveTaskToBack(true)
            DebugLogger.log("AlarmModule: App minimized")
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error minimizing app: \${e.message}")
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

            // Copy smaill_icon_nw.png into res/drawable (no compression)
            try {
                const drawableDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable');
                if (!fs.existsSync(drawableDir)) {
                    fs.mkdirSync(drawableDir, { recursive: true });
                }
                const sourceIcon = path.join(projectRoot, 'smalo_coon.png');
                const targetIcon = path.join(drawableDir, 'small_icon_noti.png');
                if (fs.existsSync(sourceIcon)) {
                    fs.copyFileSync(sourceIcon, targetIcon);
                    console.log('✅ Copied smalo_coon.png to res/drawable as small_icon_noti.png');
                } else {
                    console.warn('⚠️ smalo_coon.png not found at project root; skipping copy.');
                }
            } catch (e) {
                console.warn('⚠️ Could not copy smaill_icon_nw.png:', e);
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
            'android.permission.VIBRATE',
            // Required for foreground service
            'android.permission.FOREGROUND_SERVICE',
            // Required for dataSync foreground service type (Android 14+)
            'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
            // Required for mediaPlayback foreground service type (Android 14+)
            'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK'
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
                'android:theme': '@style/Theme.Material3.DayNight.NoActionBar'
            },
        });
        // Add RingtonePickerActivity with custom seamless theme
        activities.push({
            $: {
                'android:name': '.alarm.RingtonePickerActivity',
                'android:exported': 'false',
                'android:theme': '@style/Theme.RingtonePicker'
            },
        });
        application.activity = activities;

        if (!application.receiver) application.receiver = [];
        const receivers = application.receiver.filter(r =>
            r.$['android:name'] !== '.alarm.AlarmReceiver' &&
            r.$['android:name'] !== '.BootReceiver' &&
            r.$['android:name'] !== '.alarm.AlarmActionBridge' &&
            r.$['android:name'] !== '.alarm.MissedAlarmDeleteReceiver' // Filter out old one if present
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
                    { $: { 'android:name': 'app.rork.dominder.ALARM_SNOOZE' } },
                    { $: { 'android:name': 'com.dominder.MISSED_ALARM' } }
                ]
            }]
        });

        // NEW: Register MissedAlarmDeleteReceiver for handling delete action from missed notification
        receivers.push({
            $: { 'android:name': '.alarm.MissedAlarmDeleteReceiver', 'android:exported': 'false' },
            'intent-filter': [{
                action: [
                    { $: { 'android:name': 'com.dominder.DELETE_MISSED_ALARM' } }
                ]
            }]
        });
        application.receiver = receivers;

        if (!application.service) application.service = [];
        const services = application.service.filter(s =>
            s.$['android:name'] !== '.RescheduleAlarmsService' &&
            s.$['android:name'] !== '.alarm.AlarmRingtoneService'
        );
        services.push({
            $: {
                'android:name': '.RescheduleAlarmsService',
                'android:exported': 'false',
                'android:foregroundServiceType': 'dataSync'
            },
        });
        services.push({
            $: {
                'android:name': '.alarm.AlarmRingtoneService',
                'android:exported': 'false',
                'android:foregroundServiceType': 'mediaPlayback'
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
            // Ensure Material Components library for Material 3 widgets
            if (!buildGradle.includes('com.google.android.material:material')) {
                if (/dependencies\s*{/.test(buildGradle)) {
                    buildGradle = buildGradle.replace(
                        /dependencies\s*{/,
                        `dependencies {\n    implementation 'com.google.android.material:material:1.11.0'`
                    );
                } else {
                    buildGradle += `\n\ndependencies {\n    implementation 'com.google.android.material:material:1.11.0'\n}\n`;
                }
            }

            // Ensure WorkManager library
            if (!buildGradle.includes('androidx.work:work-runtime-ktx')) {
                if (/dependencies\s*{/.test(buildGradle)) {
                    buildGradle = buildGradle.replace(
                        /dependencies\s*{/,
                        `dependencies {\n    implementation 'androidx.work:work-runtime-ktx:2.9.0'`
                    );
                } else {
                    buildGradle += `\n\ndependencies {\n    implementation 'androidx.work:work-runtime-ktx:2.9.0'\n}\n`;
                }
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
