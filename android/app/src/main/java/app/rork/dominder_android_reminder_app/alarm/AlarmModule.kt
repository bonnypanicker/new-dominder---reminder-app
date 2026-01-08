package app.rork.dominder_android_reminder_app.alarm

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
            
            DebugLogger.log("AlarmModule: Scheduling alarm broadcast for $reminderId at $triggerTime")
            
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime.toLong(),
                pendingIntent
            )
            
            DebugLogger.log("AlarmModule: Successfully scheduled alarm broadcast")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error scheduling alarm: ${e.message}")
            promise?.reject("SCHEDULE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun storeReminderMetadata(
        reminderId: String,
        repeatType: String,
        everyIntervalValue: Int,
        everyIntervalUnit: String,
        untilType: String,
        untilCount: Int,
        untilDate: String,
        untilTime: String,
        occurrenceCount: Int,
        startDate: String,
        startTime: String,
        title: String,
        priority: String,
        promise: Promise? = null
    ) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putString("meta_${reminderId}_repeatType", repeatType)
                putInt("meta_${reminderId}_everyValue", everyIntervalValue)
                putString("meta_${reminderId}_everyUnit", everyIntervalUnit)
                putString("meta_${reminderId}_untilType", untilType)
                putInt("meta_${reminderId}_untilCount", untilCount)
                putString("meta_${reminderId}_untilDate", untilDate)
                putString("meta_${reminderId}_untilTime", untilTime)
                putInt("meta_${reminderId}_occurrenceCount", occurrenceCount)
                putString("meta_${reminderId}_startDate", startDate)
                putString("meta_${reminderId}_startTime", startTime)
                putString("meta_${reminderId}_title", title)
                putString("meta_${reminderId}_priority", priority)
                // Initialize native tracking fields (only if not already set to preserve existing state)
                if (!prefs.contains("meta_${reminderId}_actualTriggerCount")) {
                    putInt("meta_${reminderId}_actualTriggerCount", occurrenceCount)
                }
                if (!prefs.contains("meta_${reminderId}_isCompleted")) {
                    putBoolean("meta_${reminderId}_isCompleted", false)
                }
                if (!prefs.contains("meta_${reminderId}_triggerHistory")) {
                    putString("meta_${reminderId}_triggerHistory", "")
                }
                apply()
            }
            DebugLogger.log("AlarmModule: Stored metadata for $reminderId - repeatType=$repeatType, everyValue=$everyIntervalValue, everyUnit=$everyIntervalUnit, occurrenceCount=$occurrenceCount")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error storing metadata: ${e.message}")
            promise?.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearReminderMetadata(reminderId: String, promise: Promise? = null) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            prefs.edit().apply {
                remove("meta_${reminderId}_repeatType")
                remove("meta_${reminderId}_everyValue")
                remove("meta_${reminderId}_everyUnit")
                remove("meta_${reminderId}_untilType")
                remove("meta_${reminderId}_untilCount")
                remove("meta_${reminderId}_untilDate")
                remove("meta_${reminderId}_untilTime")
                remove("meta_${reminderId}_occurrenceCount")
                remove("meta_${reminderId}_startDate")
                remove("meta_${reminderId}_startTime")
                remove("meta_${reminderId}_title")
                remove("meta_${reminderId}_priority")
                // Also clear native tracking fields
                remove("meta_${reminderId}_actualTriggerCount")
                remove("meta_${reminderId}_isCompleted")
                remove("meta_${reminderId}_completedAt")
                remove("meta_${reminderId}_lastTriggerTime")
                remove("meta_${reminderId}_triggerHistory")
                apply()
            }
            DebugLogger.log("AlarmModule: Cleared metadata for $reminderId")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error clearing metadata: ${e.message}")
            promise?.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateOccurrenceCount(reminderId: String, newCount: Int, promise: Promise? = null) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            prefs.edit().putInt("meta_${reminderId}_occurrenceCount", newCount).apply()
            DebugLogger.log("AlarmModule: Updated occurrenceCount for $reminderId to $newCount")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error updating occurrenceCount: ${e.message}")
            promise?.reject("ERROR", e.message, e)
        }
    }

    /**
     * Get the native state for a reminder - this is the SINGLE SOURCE OF TRUTH
     * for occurrence count, completion status, and trigger history.
     */
    @ReactMethod
    fun getNativeReminderState(reminderId: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            
            val result = Arguments.createMap().apply {
                putInt("actualTriggerCount", prefs.getInt("meta_${reminderId}_actualTriggerCount", 0))
                putInt("occurrenceCount", prefs.getInt("meta_${reminderId}_occurrenceCount", 0))
                putBoolean("isCompleted", prefs.getBoolean("meta_${reminderId}_isCompleted", false))
                putDouble("completedAt", prefs.getLong("meta_${reminderId}_completedAt", 0L).toDouble())
                putDouble("lastTriggerTime", prefs.getLong("meta_${reminderId}_lastTriggerTime", 0L).toDouble())
                putString("triggerHistory", prefs.getString("meta_${reminderId}_triggerHistory", "") ?: "")
                putString("repeatType", prefs.getString("meta_${reminderId}_repeatType", "none") ?: "none")
                putString("untilType", prefs.getString("meta_${reminderId}_untilType", "forever") ?: "forever")
                putInt("untilCount", prefs.getInt("meta_${reminderId}_untilCount", 0))
            }
            
            DebugLogger.log("AlarmModule: getNativeReminderState for $reminderId: actualTriggerCount=${result.getInt("actualTriggerCount")}, isCompleted=${result.getBoolean("isCompleted")}")
            promise.resolve(result)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error getting native state: ${e.message}")
            promise.reject("ERROR", e.message, e)
        }
    }

    /**
     * Sync the native state to match JS state (used when JS has more accurate info)
     */
    @ReactMethod
    fun syncNativeState(
        reminderId: String,
        actualTriggerCount: Int,
        isCompleted: Boolean,
        completedAt: Double,
        promise: Promise? = null
    ) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putInt("meta_${reminderId}_actualTriggerCount", actualTriggerCount)
                putInt("meta_${reminderId}_occurrenceCount", actualTriggerCount) // Keep in sync
                putBoolean("meta_${reminderId}_isCompleted", isCompleted)
                if (completedAt > 0) {
                    putLong("meta_${reminderId}_completedAt", completedAt.toLong())
                }
                apply()
            }
            DebugLogger.log("AlarmModule: Synced native state for $reminderId: count=$actualTriggerCount, completed=$isCompleted")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error syncing native state: ${e.message}")
            promise?.reject("ERROR", e.message, e)
        }
    }

    /**
     * Mark a reminder as completed natively
     */
    @ReactMethod
    fun markReminderCompletedNatively(reminderId: String, completedAt: Double, promise: Promise? = null) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putBoolean("meta_${reminderId}_isCompleted", true)
                putLong("meta_${reminderId}_completedAt", completedAt.toLong())
                apply()
            }
            DebugLogger.log("AlarmModule: Marked $reminderId as completed natively at $completedAt")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error marking completed: ${e.message}")
            promise?.reject("ERROR", e.message, e)
        }
    }

    /**
     * Get all native reminder states (for bulk sync on app startup)
     */
    @ReactMethod
    fun getAllNativeReminderStates(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            val result = Arguments.createMap()
            
            // Find all unique reminder IDs by looking for _repeatType keys
            val allKeys = prefs.all.keys
            val reminderIds = mutableSetOf<String>()
            
            for (key in allKeys) {
                if (key.startsWith("meta_") && key.endsWith("_repeatType")) {
                    val reminderId = key.removePrefix("meta_").removeSuffix("_repeatType")
                    reminderIds.add(reminderId)
                }
            }
            
            for (reminderId in reminderIds) {
                val state = Arguments.createMap().apply {
                    putInt("actualTriggerCount", prefs.getInt("meta_${reminderId}_actualTriggerCount", 0))
                    putBoolean("isCompleted", prefs.getBoolean("meta_${reminderId}_isCompleted", false))
                    putDouble("completedAt", prefs.getLong("meta_${reminderId}_completedAt", 0L).toDouble())
                    putDouble("lastTriggerTime", prefs.getLong("meta_${reminderId}_lastTriggerTime", 0L).toDouble())
                    putString("triggerHistory", prefs.getString("meta_${reminderId}_triggerHistory", "") ?: "")
                }
                result.putMap(reminderId, state)
            }
            
            DebugLogger.log("AlarmModule: getAllNativeReminderStates found ${reminderIds.size} reminders")
            promise.resolve(result)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error getting all native states: ${e.message}")
            promise.reject("ERROR", e.message, e)
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
                    putBoolean("paused_$reminderId", true)
                } else {
                    remove("paused_$reminderId")
                }
                apply()
            }
            DebugLogger.log("AlarmModule: Set reminder $reminderId paused=$isPaused")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error setting reminder paused: ${e.message}")
            promise?.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun saveNotificationSettings(soundEnabled: Boolean, vibrationEnabled: Boolean, promise: Promise? = null) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
            prefs.edit().apply {
                putBoolean("ringer_sound_enabled", soundEnabled)
                putBoolean("ringer_vibration_enabled", vibrationEnabled)
                apply()
            }
            DebugLogger.log("AlarmModule: Saved notification settings - sound: $soundEnabled, vibration: $vibrationEnabled")
            promise?.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error saving notification settings: ${e.message}")
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
            DebugLogger.log("AlarmModule: Toast shown: $message")
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error showing toast: ${e.message}")
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
            
            DebugLogger.log("AlarmModule: Retrieved ${completed.toHashMap().size} completed alarms")
            promise.resolve(completed)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error getting completed alarms: ${e.message}")
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearCompletedAlarm(reminderId: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().remove("completed_${reminderId}").apply()
            DebugLogger.log("AlarmModule: Cleared completed alarm ${reminderId}")
            promise.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error clearing completed alarm: ${e.message}")
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
            
            DebugLogger.log("AlarmModule: Retrieved ${snoozed.toHashMap().size} snoozed alarms")
            promise.resolve(snoozed)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error getting snoozed alarms: ${e.message}")
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearSnoozedAlarm(reminderId: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().remove("snoozed_${reminderId}").apply()
            DebugLogger.log("AlarmModule: Cleared snoozed alarm ${reminderId}")
            promise.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error clearing snoozed alarm: ${e.message}")
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
            
            DebugLogger.log("AlarmModule: Retrieved ${deleted.toHashMap().size} deleted alarms")
            promise.resolve(deleted)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error getting deleted alarms: ${e.message}")
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearDeletedAlarm(reminderId: String, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("DoMinderAlarmActions", Context.MODE_PRIVATE)
            prefs.edit().remove("deleted_${reminderId}").apply()
            DebugLogger.log("AlarmModule: Cleared deleted alarm ${reminderId}")
            promise.resolve(true)
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error clearing deleted alarm: ${e.message}")
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
            DebugLogger.log("AlarmModule: Error opening ringtone picker: ${e.message}")
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
                    
                    DebugLogger.log("AlarmModule: Ringtone selected: $title")
                    ringtonePickerPromise?.resolve(result)
                } else {
                    ringtonePickerPromise?.reject("ERROR", "No URI returned")
                }
            } else {
                ringtonePickerPromise?.reject("CANCELLED", "User cancelled ringtone picker")
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error handling ringtone result: ${e.message}")
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
            DebugLogger.log("AlarmModule: Error getting ringtone: ${e.message}")
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
            DebugLogger.log("AlarmModule: Error in finishAffinity: ${e.message}")
        }
    }

    @ReactMethod
    fun minimize() {
        try {
            val activity = reactContext.currentActivity
            activity?.moveTaskToBack(true)
            DebugLogger.log("AlarmModule: App minimized")
        } catch (e: Exception) {
            DebugLogger.log("AlarmModule: Error minimizing app: ${e.message}")
        }
    }
}