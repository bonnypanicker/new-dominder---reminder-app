package app.rork.dominder_android_reminder_app

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread
import android.content.SharedPreferences
import androidx.preference.PreferenceManager
import com.facebook.react.modules.core.DeviceEventManagerModule

object AsyncStorage {
    private lateinit var prefs: SharedPreferences
    
    fun getInstance(context: Context): AsyncStorage {
        prefs = PreferenceManager.getDefaultSharedPreferences(context)
        return this
    }
    
    fun getItem(key: String): String? {
        return prefs.getString(key, null)
    }
    
    fun setItem(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }
}

class RescheduleAlarmsService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.getStringExtra("action")
        val reminderId = intent?.getStringExtra("reminderId")
        
        if (action != null && reminderId != null) {
            Log.d("RescheduleAlarmsService", "Handling action: $action for reminderId: $reminderId")
            
            thread {
                try {
                    val storage = AsyncStorage.getInstance(applicationContext)
                    val stored = storage.getItem("dominder_reminders")
                    val reminders = if (stored != null) {
                        JSONArray(stored)
                    } else {
                        JSONArray()
                    }
                    
                    for (i in 0 until reminders.length()) {
                        val reminder = reminders.getJSONObject(i)
                        if (reminder.getString("id") == reminderId) {
                            when (action) {
                                "done" -> {
                                    handleDoneAction(reminder, reminders, i, storage)
                                }
                                "snooze" -> {
                                    val snoozeMinutes = intent.getIntExtra("snoozeMinutes", 10)
                                    handleSnoozeAction(reminder, snoozeMinutes, reminders, i, storage)
                                }
                            }
                            break
                        }
                    }
                    
                    storage.setItem("dominder_reminders", reminders.toString())
                    Log.d("RescheduleAlarmsService", "Action $action completed for reminderId: $reminderId")

// Notify React Native about the change
try {
    val app = application as? MainApplication
    if (app != null) {
        val reactInstanceManager = app.reactNativeHost.reactInstanceManager
        val reactContext = reactInstanceManager.currentReactContext
        
        if (reactContext != null) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("remindersChanged", null)
            
            Log.d("RescheduleAlarmsService", "Emitted remindersChanged event")
        } else {
            Log.w("RescheduleAlarmsService", "React context not available")
        }
    }
} catch (e: Exception) {
    Log.e("RescheduleAlarmsService", "Error emitting event", e)
}
                    
                } catch (e: Exception) {
                    Log.e("RescheduleAlarmsService", "Error handling action", e)
                } finally {
                    stopSelf(startId)
                }
            }
            
            return START_NOT_STICKY
        }
        
        // Original reschedule logic for boot/reboot
        Log.d("RescheduleAlarmsService", "Starting reschedule service")
        
        thread {
            try {
                val storage = AsyncStorage.getInstance(applicationContext)
                val stored = storage.getItem("dominder_reminders")
                val reminders = if (stored != null) {
                    JSONArray(stored)
                } else {
                    JSONArray()
                }
                
                Log.d("RescheduleAlarmsService", "Found ${reminders.length()} reminders to reschedule")
                
                for (i in 0 until reminders.length()) {
                    val reminder = reminders.getJSONObject(i)
                    val isActive = reminder.optBoolean("isActive", false)
                    val isCompleted = reminder.optBoolean("isCompleted", false)
                    val isPaused = reminder.optBoolean("isPaused", false)
                    
                    if (isActive && !isCompleted && !isPaused) {
                        val id = reminder.getString("id")
                        val title = reminder.getString("title")
                        val priority = reminder.optString("priority", "medium")
                        
                        if (priority == "high") {
                            val nextReminderDate = reminder.optString("nextReminderDate", null)
                            val snoozeUntil = reminder.optString("snoozeUntil", null)
                            
                            val triggerTime = when {
                                snoozeUntil != null -> parseISODate(snoozeUntil)
                                nextReminderDate != null -> parseISODate(nextReminderDate)
                                else -> {
                                    val date = reminder.getString("date")
                                    val time = reminder.getString("time")
                                    parseDateTime(date, time)
                                }
                            }
                            
                            if (triggerTime > System.currentTimeMillis()) {
                                val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
                                val alarmIntent = Intent(this, app.rork.dominder_android_reminder_app.alarm.AlarmReceiver::class.java).apply {
                                    putExtra("reminderId", id)
                                    putExtra("title", title)
                                }
                                val pendingIntent = PendingIntent.getBroadcast(
                                    this,
                                    id.hashCode(),
                                    alarmIntent,
                                    PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                                )
                                
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                                } else {
                                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                                }
                                
                                Log.d("RescheduleAlarmsService", "Rescheduled alarm for $title ($id) at $triggerTime")
                            }
                        }
                    }
                }
                
            } catch (e: Exception) {
                Log.e("RescheduleAlarmsService", "Error rescheduling alarms", e)
            } finally {
                stopSelf(startId)
            }
        }
        
        return START_NOT_STICKY
    }
    
    private fun handleDoneAction(reminder: JSONObject, reminders: JSONArray, index: Int, storage: AsyncStorage) {
        val repeatType = reminder.optString("repeatType", "none")
        
        if (repeatType == "none") {
            reminder.put("isCompleted", true)
            reminder.put("snoozeUntil", JSONObject.NULL)
            reminder.put("wasSnoozed", JSONObject.NULL)
            reminder.put("lastTriggeredAt", getCurrentISODate())
            reminders.put(index, reminder)
            Log.d("RescheduleAlarmsService", "Marked one-time reminder as completed")
        } else {
            val nextDate = calculateNextReminderDate(reminder)
            if (nextDate != null) {
                reminder.put("nextReminderDate", nextDate)
                reminder.put("lastTriggeredAt", getCurrentISODate())
                reminder.put("snoozeUntil", JSONObject.NULL)
                reminder.put("wasSnoozed", JSONObject.NULL)
                reminders.put(index, reminder)
                
                rescheduleReminder(reminder)
                Log.d("RescheduleAlarmsService", "Scheduled next occurrence for repeating reminder")
            } else {
                reminder.put("isCompleted", true)
                reminders.put(index, reminder)
                Log.d("RescheduleAlarmsService", "No next occurrence, marked as completed")
            }
        }
    }
    
    private fun handleSnoozeAction(reminder: JSONObject, snoozeMinutes: Int, reminders: JSONArray, index: Int, storage: AsyncStorage) {
        val snoozeUntil = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000)
        reminder.put("snoozeUntil", formatISODate(snoozeUntil))
        reminder.put("wasSnoozed", true)
        reminder.put("lastTriggeredAt", getCurrentISODate())
        reminders.put(index, reminder)
        
        rescheduleReminder(reminder)
        Log.d("RescheduleAlarmsService", "Snoozed reminder for $snoozeMinutes minutes")
    }
    
    private fun rescheduleReminder(reminder: JSONObject) {
        val id = reminder.getString("id")
        val title = reminder.getString("title")
        val priority = reminder.optString("priority", "medium")
        
        if (priority == "high") {
            val nextReminderDate = reminder.optString("nextReminderDate", null)
            val snoozeUntil = reminder.optString("snoozeUntil", null)
            
            val triggerTime = when {
                snoozeUntil != null -> parseISODate(snoozeUntil)
                nextReminderDate != null -> parseISODate(nextReminderDate)
                else -> {
                    val date = reminder.getString("date")
                    val time = reminder.getString("time")
                    parseDateTime(date, time)
                }
            }
            
            if (triggerTime > System.currentTimeMillis()) {
                val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val alarmIntent = Intent(this, app.rork.dominder_android_reminder_app.alarm.AlarmReceiver::class.java).apply {
                                    putExtra("reminderId", id)
                                    putExtra("title", title)
                                }
                val pendingIntent = PendingIntent.getBroadcast(
                    this,
                    id.hashCode(),
                    alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                )
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                } else {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                }
                
                Log.d("RescheduleAlarmsService", "Rescheduled alarm for $title ($id) at $triggerTime")
            }
        }
    }
    
    private fun calculateNextReminderDate(reminder: JSONObject): String? {
        val repeatType = reminder.optString("repeatType", "none")
        if (repeatType == "none") return null
        
        val date = reminder.getString("date")
        val time = reminder.getString("time")
        val parts = date.split("-")
        val timeParts = time.split(":")
        
        val calendar = java.util.Calendar.getInstance()
        calendar.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt(), timeParts[0].toInt(), timeParts[1].toInt(), 0)
        calendar.set(java.util.Calendar.MILLISECOND, 0)
        
        val now = java.util.Calendar.getInstance()
        
        when (repeatType) {
            "daily" -> {
                // Move to next day if time has passed today
                if (calendar.before(now)) {
                    calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
                }
                
                // Check if specific days are set
                val repeatDays = reminder.optJSONArray("repeatDays")
                if (repeatDays != null && repeatDays.length() > 0) {
                    val allowedDays = mutableListOf<Int>()
                    for (i in 0 until repeatDays.length()) {
                        allowedDays.add(repeatDays.getInt(i))
                    }
                    
                    // Find next allowed day (convert Calendar.DAY_OF_WEEK to 0=Sun format)
                    var attempts = 0
                    while (attempts < 7) {
                        val dayOfWeek = (calendar.get(java.util.Calendar.DAY_OF_WEEK) + 5) % 7
                        if (allowedDays.contains(dayOfWeek)) {
                            break
                        }
                        calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
                        attempts++
                    }
                }
            }
            "weekly" -> {
                // Check if specific days are set
                val repeatDays = reminder.optJSONArray("repeatDays")
                if (repeatDays != null && repeatDays.length() > 0) {
                    val allowedDays = mutableListOf<Int>()
                    for (i in 0 until repeatDays.length()) {
                        allowedDays.add(repeatDays.getInt(i))
                    }
                    
                    // Move to next day first
                    calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
                    
                    // Find next allowed day
                    var attempts = 0
                    while (attempts < 7) {
                        val dayOfWeek = (calendar.get(java.util.Calendar.DAY_OF_WEEK) + 5) % 7
                        if (allowedDays.contains(dayOfWeek)) {
                            break
                        }
                        calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
                        attempts++
                    }
                } else {
                    // No specific days, just add 7 days
                    calendar.add(java.util.Calendar.WEEK_OF_YEAR, 1)
                }
            }
            "monthly" -> {
                calendar.add(java.util.Calendar.MONTH, 1)
            }
            "yearly" -> {
                calendar.add(java.util.Calendar.YEAR, 1)
            }
            "every" -> {
                val everyInterval = reminder.optJSONObject("everyInterval")
                if (everyInterval != null) {
                    val value = everyInterval.optInt("value", 1)
                    val unit = everyInterval.optString("unit", "hours")
                    
                    when (unit) {
                        "minutes" -> calendar.add(java.util.Calendar.MINUTE, value)
                        "hours" -> calendar.add(java.util.Calendar.HOUR_OF_DAY, value)
                        "days" -> calendar.add(java.util.Calendar.DAY_OF_MONTH, value)
                        "weeks" -> calendar.add(java.util.Calendar.WEEK_OF_YEAR, value)
                        "months" -> calendar.add(java.util.Calendar.MONTH, value)
                    }
                } else {
                    return null
                }
            }
            else -> return null
        }
        
        return formatISODate(calendar.timeInMillis)
    }
    
    private fun parseISODate(isoString: String): Long {
        return try {
            val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
            format.timeZone = java.util.TimeZone.getTimeZone("UTC")
            format.parse(isoString)?.time ?: 0L
        } catch (e: Exception) {
            Log.e("RescheduleAlarmsService", "Error parsing ISO date: $isoString", e)
            0L
        }
    }
    
    private fun parseDateTime(date: String, time: String): Long {
        return try {
            val parts = date.split("-")
            val timeParts = time.split(":")
            val calendar = java.util.Calendar.getInstance()
            calendar.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt(), timeParts[0].toInt(), timeParts[1].toInt(), 0)
            calendar.timeInMillis
        } catch (e: Exception) {
            Log.e("RescheduleAlarmsService", "Error parsing date/time: $date $time", e)
            0L
        }
    }
    
    private fun getCurrentISODate(): String {
        val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
        format.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return format.format(java.util.Date())
    }
    
    private fun formatISODate(timestamp: Long): String {
        val format = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
        format.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return format.format(java.util.Date(timestamp))
    }
}
