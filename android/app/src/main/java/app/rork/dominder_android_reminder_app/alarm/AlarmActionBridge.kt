package app.rork.dominder_android_reminder_app.alarm

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
import java.util.Calendar
import org.json.JSONArray

class AlarmActionBridge : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        DebugLogger.log("AlarmActionBridge: ===== onReceive called! =====")
        val action = intent.action
        DebugLogger.log("AlarmActionBridge: Received action: ${action}")
        DebugLogger.log("AlarmActionBridge: Intent extras: ${intent.extras}")
        
        when (action) {
            "app.rork.dominder.ALARM_DONE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                val triggerTime = intent.getLongExtra("triggerTime", System.currentTimeMillis())
                DebugLogger.log("AlarmActionBridge: ALARM_DONE - reminderId: ${reminderId}, triggerTime: ${triggerTime}")
                if (reminderId != null) {
                    val metaPrefs = context.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
                    
                    // Check if this is a shadow snooze completing
                    val isShadowSnooze = metaPrefs.getBoolean("meta_${reminderId}_isShadowSnooze", false)
                    val parentReminderId = metaPrefs.getString("meta_${reminderId}_parentReminderId", null)
                    
                    if (isShadowSnooze && parentReminderId != null) {
                        DebugLogger.log("AlarmActionBridge: Shadow snooze ${reminderId} completed, advancing parent series ${parentReminderId}")
                        
                        // Record trigger for shadow snooze (for history)
                        recordNativeTrigger(context, reminderId, triggerTime)
                        
                        // CRITICAL: Increment parent's count NOW (shadow snooze completion = occurrence completion)
                        val parentActualCount = metaPrefs.getInt("meta_${parentReminderId}_actualTriggerCount", 0)
                        val newParentCount = parentActualCount + 1
                        
                        metaPrefs.edit().apply {
                            putInt("meta_${parentReminderId}_actualTriggerCount", newParentCount)
                            putInt("meta_${parentReminderId}_occurrenceCount", newParentCount)
                            apply()
                        }
                        DebugLogger.log("AlarmActionBridge: Incremented parent count: ${parentActualCount} -> ${newParentCount}")
                        
                        // Check if parent should be marked complete now
                        val parentUntilType = metaPrefs.getString("meta_${parentReminderId}_untilType", "forever") ?: "forever"
                        val parentUntilCount = metaPrefs.getInt("meta_${parentReminderId}_untilCount", 0)
                        
                        val isSeriesComplete = (parentUntilType == "count" && newParentCount >= parentUntilCount)
                        
                        if (isSeriesComplete) {
                            // Mark parent as complete now that shadow snooze is done
                            metaPrefs.edit().apply {
                                putBoolean("meta_${parentReminderId}_isCompleted", true)
                                putLong("meta_${parentReminderId}_completedAt", triggerTime)
                                apply()
                            }
                            DebugLogger.log("AlarmActionBridge: Marked parent ${parentReminderId} as COMPLETE after shadow snooze (count ${newParentCount} >= limit ${parentUntilCount})")
                            
                            // Emit completion event for parent
                            emitEventToReactNative(context, "alarmDone", parentReminderId, 0, triggerTime)
                        } else {
                            DebugLogger.log("AlarmActionBridge: Series NOT complete (count ${newParentCount} < limit ${parentUntilCount}), scheduling next occurrence")
                            
                            // Check if React Native is running
                            val isReactRunning = isReactContextAvailable(context)
                            
                            if (!isReactRunning) {
                                // App is killed - native handles scheduling next occurrence
                                DebugLogger.log("AlarmActionBridge: App killed, native scheduling next occurrence after shadow snooze")
                                scheduleNextOccurrenceIfNeeded(context, parentReminderId)
                            } else {
                                DebugLogger.log("AlarmActionBridge: App running, JS will handle scheduling after shadow snooze")
                            }
                            
                            // Emit event to notify JS that shadow snooze completed
                            emitEventToReactNative(context, "alarmDone", reminderId, 0, triggerTime)
                        }
                        
                        // Clean up shadow snooze metadata
                        metaPrefs.edit().apply {
                            remove("meta_${reminderId}_title")
                            remove("meta_${reminderId}_priority")
                            remove("meta_${reminderId}_repeatType")
                            remove("meta_${reminderId}_startDate")
                            remove("meta_${reminderId}_startTime")
                            remove("meta_${reminderId}_everyValue")
                            remove("meta_${reminderId}_everyUnit")
                            remove("meta_${reminderId}_untilType")
                            remove("meta_${reminderId}_untilCount")
                            remove("meta_${reminderId}_untilDate")
                            remove("meta_${reminderId}_untilTime")
                            remove("meta_${reminderId}_actualTriggerCount")
                            remove("meta_${reminderId}_occurrenceCount")
                            remove("meta_${reminderId}_multiSelectEnabled")
                            remove("meta_${reminderId}_multiSelectDates")
                            remove("meta_${reminderId}_multiSelectDays")
                            remove("meta_${reminderId}_windowEndTime")
                            remove("meta_${reminderId}_windowEndIsAM")
                            remove("meta_${reminderId}_parentReminderId")
                            remove("meta_${reminderId}_isShadowSnooze")
                            apply()
                        }
                        DebugLogger.log("AlarmActionBridge: Cleaned up shadow snooze metadata for ${reminderId}")
                        
                        // Emit event for shadow snooze completion (for UI update)
                        emitEventToReactNative(context, "alarmDone", reminderId, 0, triggerTime)
                        return
                    }
                    
                    // Regular reminder (not shadow snooze)
                    // CRITICAL: Record trigger AFTER user clicks Done (fixes off-by-one error)
                    // This ensures user sees the alarm before it counts as "triggered"
                    recordNativeTrigger(context, reminderId, triggerTime)
                    
                    // Check if this trigger completes the reminder
                    val shouldComplete = checkAndMarkCompletionNatively(context, reminderId, triggerTime)
                    if (shouldComplete) {
                        DebugLogger.log("AlarmActionBridge: Reminder ${reminderId} completed after this trigger")
                        
                        // Check if there's a pending shadow snooze
                        val shadowId = reminderId + "_snooze"
                        val hasShadowSnooze = metaPrefs.contains("meta_${shadowId}_isShadowSnooze")
                        
                        if (hasShadowSnooze) {
                            DebugLogger.log("AlarmActionBridge: Reminder has pending shadow snooze - will complete after shadow fires")
                            // Don't mark as complete yet - wait for shadow snooze
                            metaPrefs.edit().apply {
                                putBoolean("meta_${reminderId}_isCompleted", false)
                                putBoolean("meta_${reminderId}_pendingShadowSnooze", true)
                                apply()
                            }
                        }
                    }
                    
                    // Check if React Native is running
                    val isReactRunning = isReactContextAvailable(context)
                    DebugLogger.log("AlarmActionBridge: React Native running: $isReactRunning")
                    
                    if (!isReactRunning && !shouldComplete) {
                        // App is killed and reminder not complete - native handles scheduling next occurrence
                        DebugLogger.log("AlarmActionBridge: App killed, native scheduling next occurrence")
                        scheduleNextOccurrenceIfNeeded(context, reminderId)
                    } else if (isReactRunning) {
                        // App is running - JS will handle everything via event
                        DebugLogger.log("AlarmActionBridge: App running, JS will handle scheduling")
                    }
                    
                    DebugLogger.log("AlarmActionBridge: About to emit alarmDone event to React Native")
                    emitEventToReactNative(context, "alarmDone", reminderId, 0, triggerTime)
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

                DebugLogger.log("AlarmActionBridge: ALARM_SNOOZE - reminderId: ${reminderId}, minutes: ${snoozeMinutes}")
                if (reminderId != null) {
                    // CRITICAL: Check if reminder is paused before scheduling snooze
                    val pausePrefs = context.getSharedPreferences("DoMinderPausedReminders", Context.MODE_PRIVATE)
                    val isPaused = pausePrefs.getBoolean("paused_${reminderId}", false)
                    if (isPaused) {
                        DebugLogger.log("AlarmActionBridge: Reminder ${reminderId} is PAUSED - ignoring snooze request")
                        return
                    }
                    
                    // Check if repeating
                    val metaPrefs = context.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
                    val repeatType = metaPrefs.getString("meta_${reminderId}_repeatType", "none") ?: "none"
                    
                    if (repeatType != "none") {
                         DebugLogger.log("AlarmActionBridge: Snoozing REPEATING reminder ${reminderId}. Creating shadow snooze, PAUSING series.")
                         
                         // CRITICAL FIX: DON'T increment count on snooze - only on completion
                         // The shadow snooze completion will increment the count
                         val currentCount = metaPrefs.getInt("meta_${reminderId}_actualTriggerCount", 0)
                         DebugLogger.log("AlarmActionBridge: Current count: $currentCount (NOT incrementing on snooze)")
                         
                         // 1. Schedule Shadow Snooze with COMPLETE metadata
                         val shadowId = reminderId + "_snooze"
                         
                         // Calculate snooze time
                         val snoozeTimeMs = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000L)
                         val snoozeCal = Calendar.getInstance().apply {
                             timeInMillis = snoozeTimeMs
                         }
                         
                         // Format date and time
                         val snoozeDate = String.format(
                             "%04d-%02d-%02d",
                             snoozeCal.get(Calendar.YEAR),
                             snoozeCal.get(Calendar.MONTH) + 1,
                             snoozeCal.get(Calendar.DAY_OF_MONTH)
                         )
                         val snoozeTime = String.format(
                             "%02d:%02d",
                             snoozeCal.get(Calendar.HOUR_OF_DAY),
                             snoozeCal.get(Calendar.MINUTE)
                         )
                         
                         // Store COMPLETE metadata for shadowId
                         metaPrefs.edit().apply {
                             putString("meta_${shadowId}_title", "Snoozed: ${title}")
                             putString("meta_${shadowId}_priority", priority)
                             putString("meta_${shadowId}_repeatType", "none") // Force none for snooze
                             
                             // CRITICAL: Add date/time metadata
                             putString("meta_${shadowId}_startDate", snoozeDate)
                             putString("meta_${shadowId}_startTime", snoozeTime)
                             
                             // Add default values for other required fields
                             putInt("meta_${shadowId}_everyValue", 1)
                             putString("meta_${shadowId}_everyUnit", "minutes")
                             putString("meta_${shadowId}_untilType", "forever")
                             putInt("meta_${shadowId}_untilCount", 0)
                             putString("meta_${shadowId}_untilDate", "")
                             putString("meta_${shadowId}_untilTime", "")
                             putInt("meta_${shadowId}_actualTriggerCount", 0)
                             putInt("meta_${shadowId}_occurrenceCount", 0)
                             
                             // Multi-select defaults
                             putBoolean("meta_${shadowId}_multiSelectEnabled", false)
                             putString("meta_${shadowId}_multiSelectDates", "[]")
                             putString("meta_${shadowId}_multiSelectDays", "[]")
                             putString("meta_${shadowId}_windowEndTime", "")
                             putBoolean("meta_${shadowId}_windowEndIsAM", false)
                             
                             // CRITICAL: Link shadow to parent for completion tracking
                             putString("meta_${shadowId}_parentReminderId", reminderId)
                             putBoolean("meta_${shadowId}_isShadowSnooze", true)
                             
                             apply()
                         }
                         
                         DebugLogger.log("AlarmActionBridge: Stored complete metadata for shadow snooze ${shadowId}, linked to parent ${reminderId}")
                         
                         // Schedule the native alarm for shadow snooze
                         scheduleNativeAlarm(context, shadowId, "Snoozed: ${title}", priority, snoozeMinutes)
                         
                         // 2. CRITICAL FIX: DON'T schedule next occurrence until shadow snooze completes
                         // The series is now PAUSED - shadow snooze completion will advance it
                         DebugLogger.log("AlarmActionBridge: Series PAUSED - next occurrence will be scheduled after shadow snooze completes")
                    } else {
                         // One-off: Standard overwrite behavior
                         DebugLogger.log("AlarmActionBridge: Snoozing ONE-OFF reminder ${reminderId}")
                         
                         // For one-off reminders, update the metadata with new time
                         val snoozeTimeMs = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000L)
                         val snoozeCal = Calendar.getInstance().apply {
                             timeInMillis = snoozeTimeMs
                         }
                         
                         val snoozeDate = String.format(
                             "%04d-%02d-%02d",
                             snoozeCal.get(Calendar.YEAR),
                             snoozeCal.get(Calendar.MONTH) + 1,
                             snoozeCal.get(Calendar.DAY_OF_MONTH)
                         )
                         val snoozeTime = String.format(
                             "%02d:%02d",
                             snoozeCal.get(Calendar.HOUR_OF_DAY),
                             snoozeCal.get(Calendar.MINUTE)
                         )
                         
                         // Update metadata with new snooze time
                         metaPrefs.edit().apply {
                             putString("meta_${reminderId}_startDate", snoozeDate)
                             putString("meta_${reminderId}_startTime", snoozeTime)
                             apply()
                         }
                         
                         DebugLogger.log("AlarmActionBridge: Updated metadata for one-off snooze")
                         scheduleNativeAlarm(context, reminderId, title, priority, snoozeMinutes)
                    }

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
                
                DebugLogger.log("AlarmActionBridge: MISSED_ALARM - reminderId: ${reminderId}")
                
                if (reminderId != null) {
                    emitMissedAlarmToReactNative(context, reminderId, title, time)
                }
            }
            else -> {
                DebugLogger.log("AlarmActionBridge: Unknown action received: ${action}")
            }
        }
    }
    
    /**
     * Schedule the next occurrence for repeating reminders when Done is pressed
     * while the app is killed. This ensures alarms continue even without JS.
     * 
     * IMPORTANT: This uses actualTriggerCount (set by AlarmReceiver) as the source of truth.
     */
    private fun scheduleNextOccurrenceIfNeeded(context: Context, reminderId: String) {
        try {
            // Check if this was a shadow snooze ID
            val originalReminderId = if (reminderId.endsWith("_snooze")) {
                reminderId.removeSuffix("_snooze")
            } else {
                reminderId
            }
            
            DebugLogger.log("AlarmActionBridge: scheduleNextOccurrenceIfNeeded for ID: ${reminderId} (Original: ${originalReminderId})")

            val metaPrefs = context.getSharedPreferences("DoMinderReminderMeta", Context.MODE_PRIVATE)
            val repeatType = metaPrefs.getString("meta_${originalReminderId}_repeatType", "none") ?: "none"
            
            if (repeatType == "none") {
                DebugLogger.log("AlarmActionBridge: Non-repeating reminder, no next occurrence needed")
                return
            }
            
            // Check if already completed natively
            val isNativeCompleted = metaPrefs.getBoolean("meta_${originalReminderId}_isCompleted", false)
            if (isNativeCompleted) {
                DebugLogger.log("AlarmActionBridge: Reminder ${originalReminderId} is already completed natively, not scheduling next")
                return
            }
            
            val everyValue = metaPrefs.getInt("meta_${originalReminderId}_everyValue", 1)
            val everyUnit = metaPrefs.getString("meta_${originalReminderId}_everyUnit", "minutes") ?: "minutes"
            val untilType = metaPrefs.getString("meta_${originalReminderId}_untilType", "forever") ?: "forever"
            val untilCount = metaPrefs.getInt("meta_${originalReminderId}_untilCount", 0)
            val untilDate = metaPrefs.getString("meta_${originalReminderId}_untilDate", "") ?: ""
            val untilTime = metaPrefs.getString("meta_${originalReminderId}_untilTime", "") ?: ""
            // Use actualTriggerCount as the authoritative count (set by AlarmReceiver when alarm fires)
            val actualTriggerCount = metaPrefs.getInt("meta_${originalReminderId}_actualTriggerCount", 0)
            val startDate = metaPrefs.getString("meta_${originalReminderId}_startDate", "") ?: ""
            val startTime = metaPrefs.getString("meta_${originalReminderId}_startTime", "") ?: ""
            val title = metaPrefs.getString("meta_${originalReminderId}_title", "Reminder") ?: "Reminder"
            val priority = metaPrefs.getString("meta_${originalReminderId}_priority", "high") ?: "high"
            
            // Multi-select fields
            val multiSelectEnabled = metaPrefs.getBoolean("meta_${originalReminderId}_multiSelectEnabled", false)
            val multiSelectDates = metaPrefs.getString("meta_${originalReminderId}_multiSelectDates", "[]") ?: "[]"
            val multiSelectDays = metaPrefs.getString("meta_${originalReminderId}_multiSelectDays", "[]") ?: "[]"
            val windowEndTime = metaPrefs.getString("meta_${originalReminderId}_windowEndTime", "") ?: ""
            val windowEndIsAM = metaPrefs.getBoolean("meta_${originalReminderId}_windowEndIsAM", false)
            
            DebugLogger.log("AlarmActionBridge: Metadata - repeatType=${repeatType}, everyValue=${everyValue}, multiSelect=${multiSelectEnabled}, actualTriggerCount=${actualTriggerCount}")
            
            // Check if we've reached the count limit (actualTriggerCount is already incremented by AlarmReceiver)
            if (untilType == "count" && actualTriggerCount >= untilCount) {
                DebugLogger.log("AlarmActionBridge: Reached occurrence limit (${actualTriggerCount} >= ${untilCount}), no more occurrences")
                // Mark as completed if not already
                if (!isNativeCompleted) {
                    metaPrefs.edit().apply {
                        putBoolean("meta_${originalReminderId}_isCompleted", true)
                        putLong("meta_${originalReminderId}_completedAt", System.currentTimeMillis())
                        apply()
                    }
                }
                return
            }
            
            // Calculate next trigger time
            val nextTriggerTime = calculateNextTriggerTime(
                repeatType, everyValue, everyUnit, untilType, untilDate, untilTime, startDate, startTime,
                multiSelectEnabled, multiSelectDates, multiSelectDays, windowEndTime, windowEndIsAM
            )
            
            if (nextTriggerTime == null) {
                DebugLogger.log("AlarmActionBridge: No valid next trigger time, reminder has ended")
                // Mark as completed
                metaPrefs.edit().apply {
                    putBoolean("meta_${originalReminderId}_isCompleted", true)
                    putLong("meta_${originalReminderId}_completedAt", System.currentTimeMillis())
                    apply()
                }
                return
            }
            
            if (nextTriggerTime <= System.currentTimeMillis()) {
                DebugLogger.log("AlarmActionBridge: Next trigger time is in the past, reminder may have ended")
                return
            }
            
            // Also sync the occurrenceCount for JS compatibility (legacy field)
            metaPrefs.edit().putInt("meta_${originalReminderId}_occurrenceCount", actualTriggerCount).apply()
            
            // Schedule the next alarm
            scheduleNativeAlarmAtTime(context, originalReminderId, title, priority, nextTriggerTime)
            DebugLogger.log("AlarmActionBridge: Scheduled next occurrence at ${java.util.Date(nextTriggerTime)}")
            
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error scheduling next occurrence: ${e.message}")
        }
    }
    
    private fun calculateNextTriggerTime(
        repeatType: String,
        everyValue: Int,
        everyUnit: String,
        untilType: String,
        untilDate: String,
        untilTime: String,
        startDate: String,
        startTime: String,
        multiSelectEnabled: Boolean = false,
        multiSelectDates: String = "[]",
        multiSelectDays: String = "[]",
        windowEndTime: String = "",
        windowEndIsAM: Boolean = false
    ): Long? {
        val now = System.currentTimeMillis()
        val calendar = Calendar.getInstance()
        
        // Parse start date/time
        var startCal: Calendar? = null
        if (startDate.isNotEmpty() && startTime.isNotEmpty()) {
            try {
                val dateParts = startDate.split("-")
                val timeParts = startTime.split(":")
                if (dateParts.size == 3 && timeParts.size == 2) {
                    val c = Calendar.getInstance()
                    c.set(Calendar.YEAR, dateParts[0].toInt())
                    c.set(Calendar.MONTH, dateParts[1].toInt() - 1)
                    c.set(Calendar.DAY_OF_MONTH, dateParts[2].toInt())
                    c.set(Calendar.HOUR_OF_DAY, timeParts[0].toInt())
                    c.set(Calendar.MINUTE, timeParts[1].toInt())
                    c.set(Calendar.SECOND, 0)
                    c.set(Calendar.MILLISECOND, 0)
                    startCal = c
                }
            } catch (e: Exception) {
                DebugLogger.log("AlarmActionBridge: Error parsing start date/time: ${e.message}")
            }
        }

        when (repeatType) {
            "every" -> {
                // For 'every' type, calculate next aligned occurrence
                val intervalMs = when (everyUnit) {
                    "minutes" -> everyValue * 60 * 1000L
                    "hours" -> everyValue * 60 * 60 * 1000L
                    else -> everyValue * 60 * 1000L
                }
                
                if (multiSelectEnabled && startCal != null) {
                    try {
                         var endH = 23
                         var endM = 59
                         if (windowEndTime.isNotEmpty()) {
                             val parts = windowEndTime.split(":")
                             if (parts.size == 2) {
                                 endH = parts[0].toInt()
                                 endM = parts[1].toInt()
                             }
                         }
                         
                         val datesArray = JSONArray(multiSelectDates)
                         val daysArray = JSONArray(multiSelectDays)
                         val selectedDays = mutableSetOf<Int>()
                         for(i in 0 until daysArray.length()) selectedDays.add(daysArray.getInt(i))
                         
                         val selectedDates = mutableSetOf<String>()
                         for(i in 0 until datesArray.length()) selectedDates.add(datesArray.getString(i))

                         val startH = startCal.get(Calendar.HOUR_OF_DAY)
                         val startM = startCal.get(Calendar.MINUTE)
                         
                         val cursor = Calendar.getInstance()
                         cursor.timeInMillis = now
                         // Start from beginning of today (to cover current day windows)
                         cursor.set(Calendar.HOUR_OF_DAY, 0)
                         cursor.set(Calendar.MINUTE, 0)
                         cursor.set(Calendar.SECOND, 0)
                         cursor.set(Calendar.MILLISECOND, 0)
                         
                         for (i in 0 until 366) { // Look ahead 1 year
                             val cy = cursor.get(Calendar.YEAR)
                             val cm = cursor.get(Calendar.MONTH) + 1
                             val cd = cursor.get(Calendar.DAY_OF_MONTH)
                             val dateStr = String.format("%04d-%02d-%02d", cy, cm, cd)
                             val dayOfWeek = cursor.get(Calendar.DAY_OF_WEEK) - 1 
                             
                             if (selectedDates.contains(dateStr) || selectedDays.contains(dayOfWeek)) {
                                 // Explicitly construct window start on this cursor date
                                 val wStart = Calendar.getInstance()
                                 wStart.timeInMillis = cursor.timeInMillis
                                 wStart.set(Calendar.HOUR_OF_DAY, startH)
                                 wStart.set(Calendar.MINUTE, startM)
                                 wStart.set(Calendar.SECOND, 0)
                                 wStart.set(Calendar.MILLISECOND, 0)
                                 
                                 // Explicitly construct window end on this cursor date
                                 val wEnd = Calendar.getInstance()
                                 wEnd.timeInMillis = cursor.timeInMillis
                                 wEnd.set(Calendar.HOUR_OF_DAY, endH)
                                 wEnd.set(Calendar.MINUTE, endM)
                                 wEnd.set(Calendar.SECOND, 0)
                                 wEnd.set(Calendar.MILLISECOND, 0)
                                 
                                 if (wEnd.before(wStart)) {
                                     wEnd.add(Calendar.DAY_OF_MONTH, 1)
                                 }
                                 
                                 var occ = wStart.timeInMillis
                                 while (occ <= wEnd.timeInMillis) {
                                     if (occ > now) {
                                         return occ
                                     }
                                     occ += intervalMs
                                 }
                             }
                             cursor.add(Calendar.DAY_OF_MONTH, 1)
                         }
                         return null
                    } catch (e: Exception) {
                        DebugLogger.log("AlarmActionBridge: Error in multi-select calculation: ${e.message}")
                    }
                }
                
                if (startCal != null) {
                    val startMs = startCal.timeInMillis
                    val elapsed = now - startMs
                    val intervalsPassed = if (elapsed < 0) 0 else (elapsed / intervalMs) + 1
                    val nextTrigger = startMs + (intervalsPassed * intervalMs)
                    
                    if (untilType == "endsAt" && untilDate.isNotEmpty()) {
                        val endBoundary = parseEndBoundary(untilDate, untilTime, everyUnit)
                        if (nextTrigger > endBoundary) {
                            return null
                        }
                    }
                    return nextTrigger
                }
                
                return now + intervalMs
            }
            "daily", "weekly", "monthly", "yearly" -> {
                calendar.timeInMillis = now
                when (repeatType) {
                    "daily" -> calendar.add(Calendar.DAY_OF_MONTH, 1)
                    "weekly" -> calendar.add(Calendar.WEEK_OF_YEAR, 1)
                    "monthly" -> calendar.add(Calendar.MONTH, 1)
                    "yearly" -> calendar.add(Calendar.YEAR, 1)
                }
                if (startCal != null) {
                    calendar.set(Calendar.HOUR_OF_DAY, startCal.get(Calendar.HOUR_OF_DAY))
                    calendar.set(Calendar.MINUTE, startCal.get(Calendar.MINUTE))
                    calendar.set(Calendar.SECOND, 0)
                    calendar.set(Calendar.MILLISECOND, 0)
                }
                return calendar.timeInMillis
            }
            else -> return null
        }
    }
    
    private fun parseEndBoundary(untilDate: String, untilTime: String, everyUnit: String): Long {
        val calendar = Calendar.getInstance()
        try {
            val dateParts = untilDate.split("-")
            if (dateParts.size == 3) {
                calendar.set(Calendar.YEAR, dateParts[0].toInt())
                calendar.set(Calendar.MONTH, dateParts[1].toInt() - 1)
                calendar.set(Calendar.DAY_OF_MONTH, dateParts[2].toInt())
                
                val isTimeBound = everyUnit == "minutes" || everyUnit == "hours"
                if (isTimeBound && untilTime.isNotEmpty()) {
                    val timeParts = untilTime.split(":")
                    if (timeParts.size == 2) {
                        calendar.set(Calendar.HOUR_OF_DAY, timeParts[0].toInt())
                        calendar.set(Calendar.MINUTE, timeParts[1].toInt())
                        calendar.set(Calendar.SECOND, 0)
                    }
                } else {
                    calendar.set(Calendar.HOUR_OF_DAY, 23)
                    calendar.set(Calendar.MINUTE, 59)
                    calendar.set(Calendar.SECOND, 59)
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error parsing end boundary: ${e.message}")
        }
        return calendar.timeInMillis
    }
    
    private fun scheduleNativeAlarmAtTime(context: Context, reminderId: String, title: String, priority: String, triggerTime: Long) {
        try {
            DebugLogger.log("AlarmActionBridge: Scheduling native alarm at specific time")
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intent = Intent(context, AlarmReceiver::class.java).apply {
                action = "app.rork.dominder.ALARM_FIRED"
                putExtra("reminderId", reminderId)
                putExtra("title", title)
                putExtra("priority", priority)
                addFlags(Intent.FLAG_RECEIVER_FOREGROUND) // CRITICAL: For OnePlus/Chinese ROMs to treat as foreground
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    DebugLogger.log("AlarmActionBridge: cannot schedule exact alarm, skipping")
                    return
                }
            }

            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            )
            DebugLogger.log("AlarmActionBridge: Native alarm scheduled for ${java.util.Date(triggerTime)}")

        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error scheduling native alarm: ${e.message}")
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
                addFlags(Intent.FLAG_RECEIVER_FOREGROUND) // CRITICAL: For OnePlus/Chinese ROMs to treat as foreground
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                 if (!alarmManager.canScheduleExactAlarms()) {
                     DebugLogger.log("AlarmActionBridge: Exact alarm permission denied, using inexact alarm as fallback")
                     // Fall back to inexact alarm instead of failing silently
                     alarmManager.setAndAllowWhileIdle(
                         AlarmManager.RTC_WAKEUP,
                         triggerTime,
                         pendingIntent
                     )
                     DebugLogger.log("AlarmActionBridge: Inexact alarm scheduled for ${triggerTime}")
                     return
                 }
            }

            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            )
            DebugLogger.log("AlarmActionBridge: Native fallback alarm scheduled for ${triggerTime}")

        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error scheduling native fallback: ${e.message}")
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
            DebugLogger.log("AlarmActionBridge: Error emitting missed alarm: ${e.message}")
        }
    }
    
    /**
     * Check if React Native context is available (app is running).
     * Used to decide whether native or JS should handle scheduling.
     */
    private fun isReactContextAvailable(context: Context): Boolean {
        return try {
            val app = context.applicationContext
            if (app is ReactApplication) {
                val reactInstanceManager = app.reactNativeHost.reactInstanceManager
                val reactContext = reactInstanceManager.currentReactContext
                reactContext != null
            } else {
                false
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error checking React context: ${e.message}")
            false
        }
    }

    private fun emitEventToReactNative(context: Context, eventName: String, reminderId: String, snoozeMinutes: Int, triggerTime: Long = 0L) {
        try {
            DebugLogger.log("AlarmActionBridge: ===== emitEventToReactNative START =====")
            DebugLogger.log("AlarmActionBridge: Event name: ${eventName}, reminderId: ${reminderId}, triggerTime: ${triggerTime}")
            
            val app = context.applicationContext
            DebugLogger.log("AlarmActionBridge: Got application context: ${app.javaClass.name}")
            
            if (app is ReactApplication) {
                DebugLogger.log("AlarmActionBridge: App is ReactApplication ✓")
                
                val reactInstanceManager = app.reactNativeHost.reactInstanceManager
                DebugLogger.log("AlarmActionBridge: Got ReactInstanceManager: ${reactInstanceManager}")
                
                val reactContext = reactInstanceManager.currentReactContext
                DebugLogger.log("AlarmActionBridge: ReactContext: ${reactContext}")
                
                if (reactContext != null) {
                    DebugLogger.log("AlarmActionBridge: ReactContext is VALID ✓")
                    DebugLogger.log("AlarmActionBridge: Creating params map...")
                    
                    val params = Arguments.createMap().apply {
                        putString("reminderId", reminderId)
                        if (eventName == "alarmSnooze") {
                            putInt("snoozeMinutes", snoozeMinutes)
                        }
                        if (eventName == "alarmDone" && triggerTime > 0) {
                            putDouble("triggerTime", triggerTime.toDouble())
                        }
                    }
                    
                    DebugLogger.log("AlarmActionBridge: Params created, emitting event '${eventName}'...")
                    
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit(eventName, params)
                    
                    DebugLogger.log("AlarmActionBridge: ✓✓✓ Event '${eventName}' emitted successfully! ✓✓✓")
                } else {
                    DebugLogger.log("AlarmActionBridge: ✗✗✗ ERROR - ReactContext is NULL! ✗✗✗")
                    DebugLogger.log("AlarmActionBridge: This means React Native is not running or was killed")
                }
            } else {
                DebugLogger.log("AlarmActionBridge: ✗✗✗ ERROR - App is NOT ReactApplication! ✗✗✗")
                DebugLogger.log("AlarmActionBridge: App type: ${app.javaClass.name}")
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: ✗✗✗ EXCEPTION in emitEventToReactNative ✗✗✗")
            DebugLogger.log("AlarmActionBridge: Exception: ${e.message}")
            DebugLogger.log("AlarmActionBridge: Stack trace: ${e.stackTraceToString()}")
        }
    }
    
    /**
     * Record this trigger in native SharedPreferences.
     * This is the SINGLE SOURCE OF TRUTH for occurrence tracking.
     * CRITICAL: Called AFTER user clicks Done (fixes off-by-one error).
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
            
            DebugLogger.log("AlarmActionBridge: Recorded trigger #$newCount at $triggerTime for $reminderId")
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error recording trigger: ${e.message}")
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
                DebugLogger.log("AlarmActionBridge: One-time reminder $reminderId marked complete")
                return true
            }
            
            val untilType = metaPrefs.getString("meta_${reminderId}_untilType", "forever") ?: "forever"
            
            // Check count-based completion
            if (untilType == "count") {
                val untilCount = metaPrefs.getInt("meta_${reminderId}_untilCount", 0)
                val actualTriggerCount = metaPrefs.getInt("meta_${reminderId}_actualTriggerCount", 0)
                
                DebugLogger.log("AlarmActionBridge: Count check - actualTriggerCount=$actualTriggerCount, untilCount=$untilCount")
                
                if (actualTriggerCount >= untilCount) {
                    metaPrefs.edit().apply {
                        putBoolean("meta_${reminderId}_isCompleted", true)
                        putLong("meta_${reminderId}_completedAt", triggerTime)
                        apply()
                    }
                    DebugLogger.log("AlarmActionBridge: Reminder $reminderId completed by count ($actualTriggerCount >= $untilCount)")
                    return true
                }
            }
            
            // Check time-based completion
            if (untilType == "endsAt") {
                val untilDate = metaPrefs.getString("meta_${reminderId}_untilDate", "") ?: ""
                val untilTime = metaPrefs.getString("meta_${reminderId}_untilTime", "") ?: ""
                val everyUnit = metaPrefs.getString("meta_${reminderId}_everyUnit", "minutes") ?: "minutes"
                
                if (untilDate.isNotEmpty()) {
                    val endBoundary = parseEndBoundaryForCompletion(untilDate, untilTime, everyUnit)
                    
                    DebugLogger.log("AlarmActionBridge: Time check - triggerTime=$triggerTime, endBoundary=$endBoundary")
                    
                    // If this trigger is at or past the end boundary, mark complete
                    if (triggerTime >= endBoundary) {
                        metaPrefs.edit().apply {
                            putBoolean("meta_${reminderId}_isCompleted", true)
                            putLong("meta_${reminderId}_completedAt", triggerTime)
                            apply()
                        }
                        DebugLogger.log("AlarmActionBridge: Reminder $reminderId completed by time (trigger >= endBoundary)")
                        return true
                    }
                }
            }
            
            return false
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error checking completion: ${e.message}")
            return false
        }
    }
    
    /**
     * Helper function for checkAndMarkCompletionNatively to parse end boundary.
     * Separate from parseEndBoundary() to avoid confusion.
     */
    private fun parseEndBoundaryForCompletion(untilDate: String, untilTime: String, everyUnit: String): Long {
        val calendar = Calendar.getInstance()
        try {
            val dateParts = untilDate.split("-")
            if (dateParts.size == 3) {
                calendar.set(Calendar.YEAR, dateParts[0].toInt())
                calendar.set(Calendar.MONTH, dateParts[1].toInt() - 1)
                calendar.set(Calendar.DAY_OF_MONTH, dateParts[2].toInt())
                
                val isTimeBound = everyUnit == "minutes" || everyUnit == "hours"
                if (isTimeBound && untilTime.isNotEmpty()) {
                    val timeParts = untilTime.split(":")
                    if (timeParts.size == 2) {
                        calendar.set(Calendar.HOUR_OF_DAY, timeParts[0].toInt())
                        calendar.set(Calendar.MINUTE, timeParts[1].toInt())
                        calendar.set(Calendar.SECOND, 0)
                    }
                } else {
                    calendar.set(Calendar.HOUR_OF_DAY, 23)
                    calendar.set(Calendar.MINUTE, 59)
                    calendar.set(Calendar.SECOND, 59)
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("AlarmActionBridge: Error parsing end boundary for completion: ${e.message}")
        }
        return calendar.timeInMillis
    }
}