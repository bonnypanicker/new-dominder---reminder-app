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
    fun scheduleAlarm(
        reminderId: String,
        title: String,
        triggerTime: Double,
        priority: String? = null,
        repeatType: String? = null,
        everyValue: Int? = null,
        everyUnit: String? = null,
        promise: Promise? = null
    ) {
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
                putExtra("triggerTimeMs", triggerTime.toLong())
                if (repeatType != null) {
                    putExtra("repeatType", repeatType)
                    if (repeatType == "every" && everyValue != null && everyUnit != null) {
                        putExtra("everyValue", everyValue)
                        putExtra("everyUnit", everyUnit)
                    }
                }
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
            DebugLogger.log("AlarmModule: Error scheduling alarm: $e.message")
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
}