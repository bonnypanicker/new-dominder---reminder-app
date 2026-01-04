package app.rork.dominder_android_reminder_app.alarm

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
            DebugLogger.log("AlarmRingtoneService: startAlarmRingtone called - priority: $priority")
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
        DebugLogger.log("AlarmRingtoneService: onStartCommand - action: ${intent?.action}")
        
        when (intent?.action) {
            "app.rork.dominder.START_ALARM_RINGTONE" -> {
                val priority = intent.getStringExtra("priority") ?: "medium"
                val title = intent.getStringExtra("title") ?: "Reminder"
                val reminderId = intent.getStringExtra("reminderId") ?: ""
                
                DebugLogger.log("AlarmRingtoneService: Starting ringtone for priority: $priority")
                
                // Only play for high priority alarms
                if (priority == "high") {
                    startForegroundService(title, reminderId)
                    startRingtoneAndVibration()
                } else {
                    DebugLogger.log("AlarmRingtoneService: Skipping ringtone (priority=$priority, only high priority plays)")
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
            
            DebugLogger.log("AlarmRingtoneService: Settings - sound: $soundEnabled, vibration: $vibrationEnabled")
            
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
            DebugLogger.log("AlarmRingtoneService: Error starting ringtone/vibration: ${e.message}")
        }
    }
    
    private var originalAlarmVolume: Int = -1
    private var audioManager: AudioManager? = null
    
    private fun startRingtone() {
        try {
            // Get saved ringtone URI and volume from SharedPreferences
            val prefs = getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
            val savedUriString = prefs.getString("alarm_ringtone_uri", null)
            val volumePercent = prefs.getInt("ringer_volume", 40)
            
            val ringtoneUri = if (savedUriString != null) {
                DebugLogger.log("AlarmRingtoneService: Using saved ringtone: $savedUriString")
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
            DebugLogger.log("AlarmRingtoneService: Set alarm volume to $targetVolume/$maxVolume ($volumePercent%)")
            
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
                        DebugLogger.log("AlarmRingtoneService: Error in completion listener: ${e.message}")
                    }
                }
                
                setOnErrorListener { mp, what, extra ->
                    DebugLogger.log("AlarmRingtoneService: MediaPlayer error: what=$what, extra=$extra")
                    false // Return false to trigger OnCompletionListener
                }
                
                prepare()
                start()
                
                DebugLogger.log("AlarmRingtoneService: MediaPlayer started playing (looping=${isLooping})")
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmRingtoneService: Error starting ringtone: ${e.message}")
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
            DebugLogger.log("AlarmRingtoneService: Error starting vibration: ${e.message}")
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
                DebugLogger.log("AlarmRingtoneService: Restored original alarm volume to $originalAlarmVolume")
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
            DebugLogger.log("AlarmRingtoneService: Error stopping ringtone/vibration: ${e.message}")
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
}