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

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        DebugLogger.log("AlarmReceiver: Received broadcast")
        val reminderId = intent.getStringExtra("reminderId")
        val title = intent.getStringExtra("title") ?: "Reminder"
        val priority = intent.getStringExtra("priority") ?: "medium"
        val triggerTime = System.currentTimeMillis() // Capture the actual trigger time
        
        if (reminderId == null) {
            DebugLogger.log("AlarmReceiver: reminderId is null")
            return
        }

        // CRITICAL: Check if reminder is paused before firing
        val prefs = context.getSharedPreferences("DoMinderPausedReminders", Context.MODE_PRIVATE)
        val isPaused = prefs.getBoolean("paused_$reminderId", false)
        if (isPaused) {
            DebugLogger.log("AlarmReceiver: Reminder $reminderId is PAUSED - skipping alarm")
            return
        }
        
        // CRITICAL: Check if reminder is already completed (native state)
        val metaPrefs = context.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
        val isNativeCompleted = metaPrefs.getBoolean("meta_${reminderId}_isCompleted", false)
        if (isNativeCompleted) {
            DebugLogger.log("AlarmReceiver: Reminder $reminderId is already COMPLETED natively - skipping alarm")
            return
        }
        
        // CRITICAL: Record this trigger in native state BEFORE showing alarm
        // This ensures accurate tracking even if app is killed
        recordNativeTrigger(context, reminderId, triggerTime)
        
        // Check if this trigger completes the reminder (count or time based)
        val shouldComplete = checkAndMarkCompletionNatively(context, reminderId, triggerTime)
        if (shouldComplete) {
            DebugLogger.log("AlarmReceiver: This is the FINAL occurrence for $reminderId")
        }

        // Start AlarmRingtoneService for high priority reminders
        if (priority == "high") {
            DebugLogger.log("AlarmReceiver: Starting AlarmRingtoneService for high priority")
            AlarmRingtoneService.startAlarmRingtone(context, reminderId, title, priority)
        }

        DebugLogger.log("AlarmReceiver: Creating full-screen notification for $reminderId, triggerTime: $triggerTime")
        
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
            putExtra("triggerTime", triggerTime)
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
            putExtra("triggerTime", triggerTime)
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
    
    /**
     * Record this trigger in native SharedPreferences.
     * This is the SINGLE SOURCE OF TRUTH for occurrence tracking.
     */
    private fun recordNativeTrigger(context: Context, reminderId: String, triggerTime: Long) {
        try {
            val metaPrefs = context.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            
            // Increment the actual trigger count (this is the authoritative count)
            val currentCount = metaPrefs.getInt("meta_${reminderId}_actualTriggerCount", 0)
            val newCount = currentCount + 1
            
            // Get existing trigger history and append this trigger
            val existingHistory = metaPrefs.getString("meta_${reminderId}_triggerHistory", "") ?: ""
            val newHistory = if (existingHistory.isEmpty()) {
                triggerTime.toString()
            } else {
                "$existingHistory,$triggerTime"
            }
            
            metaPrefs.edit().apply {
                putInt("meta_${reminderId}_actualTriggerCount", newCount)
                putString("meta_${reminderId}_triggerHistory", newHistory)
                putLong("meta_${reminderId}_lastTriggerTime", triggerTime)
                apply()
            }
            
            DebugLogger.log("AlarmReceiver: Recorded trigger #$newCount at $triggerTime for $reminderId")
        } catch (e: Exception) {
            DebugLogger.log("AlarmReceiver: Error recording trigger: ${e.message}")
        }
    }
    
    /**
     * Check if this trigger completes the reminder and mark it complete natively if so.
     * Returns true if this is the final occurrence.
     */
    private fun checkAndMarkCompletionNatively(context: Context, reminderId: String, triggerTime: Long): Boolean {
        try {
            val metaPrefs = context.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            
            val repeatType = metaPrefs.getString("meta_${reminderId}_repeatType", "none") ?: "none"
            if (repeatType == "none") {
                // One-time reminder - mark complete after this trigger
                metaPrefs.edit().apply {
                    putBoolean("meta_${reminderId}_isCompleted", true)
                    putLong("meta_${reminderId}_completedAt", triggerTime)
                    apply()
                }
                DebugLogger.log("AlarmReceiver: One-time reminder $reminderId marked complete")
                return true
            }
            
            val untilType = metaPrefs.getString("meta_${reminderId}_untilType", "forever") ?: "forever"
            
            // Check count-based completion
            if (untilType == "count") {
                val untilCount = metaPrefs.getInt("meta_${reminderId}_untilCount", 0)
                val actualTriggerCount = metaPrefs.getInt("meta_${reminderId}_actualTriggerCount", 0)
                
                DebugLogger.log("AlarmReceiver: Count check - actualTriggerCount=$actualTriggerCount, untilCount=$untilCount")
                
                if (actualTriggerCount >= untilCount) {
                    metaPrefs.edit().apply {
                        putBoolean("meta_${reminderId}_isCompleted", true)
                        putLong("meta_${reminderId}_completedAt", triggerTime)
                        apply()
                    }
                    DebugLogger.log("AlarmReceiver: Reminder $reminderId completed by count ($actualTriggerCount >= $untilCount)")
                    return true
                }
            }
            
            // Check time-based completion
            if (untilType == "endsAt") {
                val untilDate = metaPrefs.getString("meta_${reminderId}_untilDate", "") ?: ""
                val untilTime = metaPrefs.getString("meta_${reminderId}_untilTime", "") ?: ""
                val everyUnit = metaPrefs.getString("meta_${reminderId}_everyUnit", "minutes") ?: "minutes"
                
                if (untilDate.isNotEmpty()) {
                    val endBoundary = parseEndBoundaryStatic(untilDate, untilTime, everyUnit)
                    
                    DebugLogger.log("AlarmReceiver: Time check - triggerTime=$triggerTime, endBoundary=$endBoundary")
                    
                    // If this trigger is at or past the end boundary, mark complete
                    if (triggerTime >= endBoundary) {
                        metaPrefs.edit().apply {
                            putBoolean("meta_${reminderId}_isCompleted", true)
                            putLong("meta_${reminderId}_completedAt", triggerTime)
                            apply()
                        }
                        DebugLogger.log("AlarmReceiver: Reminder $reminderId completed by time (trigger >= endBoundary)")
                        return true
                    }
                }
            }
            
            return false
        } catch (e: Exception) {
            DebugLogger.log("AlarmReceiver: Error checking completion: ${e.message}")
            return false
        }
    }
    
    private fun parseEndBoundaryStatic(untilDate: String, untilTime: String, everyUnit: String): Long {
        val calendar = java.util.Calendar.getInstance()
        try {
            val dateParts = untilDate.split("-")
            if (dateParts.size == 3) {
                calendar.set(java.util.Calendar.YEAR, dateParts[0].toInt())
                calendar.set(java.util.Calendar.MONTH, dateParts[1].toInt() - 1)
                calendar.set(java.util.Calendar.DAY_OF_MONTH, dateParts[2].toInt())
                
                val isTimeBound = everyUnit == "minutes" || everyUnit == "hours"
                if (isTimeBound && untilTime.isNotEmpty()) {
                    val timeParts = untilTime.split(":")
                    if (timeParts.size == 2) {
                        calendar.set(java.util.Calendar.HOUR_OF_DAY, timeParts[0].toInt())
                        calendar.set(java.util.Calendar.MINUTE, timeParts[1].toInt())
                        calendar.set(java.util.Calendar.SECOND, 0)
                    }
                } else {
                    calendar.set(java.util.Calendar.HOUR_OF_DAY, 23)
                    calendar.set(java.util.Calendar.MINUTE, 59)
                    calendar.set(java.util.Calendar.SECOND, 59)
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmReceiver: Error parsing end boundary: ${e.message}")
        }
        return calendar.timeInMillis
    }
}