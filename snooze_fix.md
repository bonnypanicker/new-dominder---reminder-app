Now I have enough information to create a comprehensive fix document. Let me create the markdown file:
Action: file_editor create /app/SNOOZE_RINGER_MODE_FIX.md --file-text "# Snooze Function Fix for Ringer Mode (App Closed State)

## Problem Statement

**Issue:** Snooze function for \"Ringer mode\" reminders only works when the app is in an open state.

**Current Behavior:**
1. User sets a ringer reminder (high priority)
2. App is closed/killed
3. Reminder triggers at correct time ✅
4. User taps \"Snooze 5 min\" button
5. After 5 minutes, reminder does NOT ring ❌
6. When user opens the app later:
   - Gets notification about \"missed ringer reminder\"
   - Snoozed reminder is scheduled 5 min from app open time (not from original snooze time) ❌

**Expected Behavior:**
- Snooze should work regardless of app state
- When user snoozes for 5 minutes while app is closed, alarm should ring after exactly 5 minutes
- No \"missed alarm\" notifications should appear for properly snoozed reminders

---

## Root Cause Analysis

### 1. **Incomplete Native Alarm Scheduling After Snooze**

**File:** `/app/plugins/with-alarm-module.js` → `AlarmActionBridge.kt`

**Current Implementation Issues:**

The `AlarmActionBridge.onReceive()` method handles the `ALARM_SNOOZE` action when user snoozes from AlarmActivity:

```kotlin
\"app.rork.dominder.ALARM_SNOOZE\" -> {
    val reminderId = intent.getStringExtra(\"reminderId\")
    val snoozeMinutes = intent.getIntExtra(\"snoozeMinutes\", 0)
    val title = intent.getStringExtra(\"title\") ?: \"Reminder\"
    val priority = intent.getStringExtra(\"priority\") ?: \"medium\"

    if (reminderId != null) {
        // Check if repeating
        val metaPrefs = context.getSharedPreferences(\"DoMinderReminderMeta\", Context.MODE_PRIVATE)
        val repeatType = metaPrefs.getString(\"meta_${reminderId}_repeatType\", \"none\") ?: \"none\"
        
        if (repeatType != \"none\") {
             // Handles repeating reminders with shadow snooze
             val shadowId = reminderId + \"_snooze\"
             
             // Store minimal metadata for shadowId
             metaPrefs.edit().apply {
                 putString(\"meta_${shadowId}_title\", \"Snoozed: ${title}\")
                 putString(\"meta_${shadowId}_priority\", priority)
                 putString(\"meta_${shadowId}_repeatType\", \"none\")
                 apply()
             }
             
             scheduleNativeAlarm(context, shadowId, \"Snoozed: ${title}\", priority, snoozeMinutes)
             scheduleNextOccurrenceIfNeeded(context, reminderId)
        } else {
             // One-off: Standard overwrite behavior
             scheduleNativeAlarm(context, reminderId, title, priority, snoozeMinutes)
        }

        // Emit event to React Native (if running)
        emitEventToReactNative(context, \"alarmSnooze\", reminderId, snoozeMinutes)
    }
}
```

**Problems:**
1. ✅ **For Non-Repeating Reminders:** Code correctly calls `scheduleNativeAlarm()` which schedules via AlarmManager
2. ✅ **For Repeating Reminders:** Code creates shadow snooze and schedules it
3. ❌ **Critical Issue:** The `scheduleNativeAlarm()` function is called, BUT...
   - It only schedules the AlarmManager broadcast
   - It does NOT ensure that AlarmReceiver.kt exists or is properly configured
   - Missing AlarmReceiver means broadcast is sent but never received
   - Result: Alarm time passes, but nothing fires

### 2. **Missing AlarmReceiver.kt Implementation**

**Expected Location:** Should be in the same package as `AlarmActionBridge.kt`
**Package:** `app.rork.dominder_android_reminder_app.alarm`

**Current Status:** 
- The `with-alarm-module.js` plugin defines `AlarmActionBridge.kt` and `AlarmActivity.kt`
- BUT it's missing `AlarmReceiver.kt` which is crucial for receiving alarm broadcasts
- The code references `Intent(context, AlarmReceiver::class.java)` but this class doesn't exist in the plugin

**What AlarmReceiver Should Do:**
```kotlin
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            \"app.rork.dominder.ALARM_FIRED\" -> {
                // Extract alarm details
                val reminderId = intent.getStringExtra(\"reminderId\")
                val title = intent.getStringExtra(\"title\")
                val priority = intent.getStringExtra(\"priority\")
                
                // Start ringtone service (if high priority)
                if (priority == \"high\") {
                    AlarmRingtoneService.startAlarmRingtone(context, reminderId, title, priority)
                }
                
                // Launch AlarmActivity (fullscreen UI)
                // Show notification
                // Etc.
            }
        }
    }
}
```

### 3. **Incomplete Metadata Storage for Snoozed Alarms**

**File:** `/app/plugins/with-alarm-module.js` → `AlarmActionBridge.kt`

When creating shadow snooze for repeating reminders:

```kotlin
metaPrefs.edit().apply {
    putString(\"meta_${shadowId}_title\", \"Snoozed: ${title}\")
    putString(\"meta_${shadowId}_priority\", priority)
    putString(\"meta_${shadowId}_repeatType\", \"none\")
    apply()
}
```

**Missing Critical Metadata:**
- ❌ `meta_${shadowId}_startDate` - Required for alarm to fire
- ❌ `meta_${shadowId}_startTime` - Required for alarm to fire
- ❌ `meta_${shadowId}_everyValue` - Used by alarm logic
- ❌ `meta_${shadowId}_everyUnit` - Used by alarm logic
- ❌ Other metadata that AlarmReceiver might need

Without complete metadata, even if AlarmReceiver fires, it might not have enough info to trigger properly.

### 4. **AlarmActivity Persistence Issue**

**File:** `/app/plugins/with-alarm-module.js` → `AlarmActivity.kt`

The `handleSnooze()` method:

```kotlin
private fun handleSnooze(minutes: Int) {
    // ... code ...
    
    // NEW: Persist to SharedPreferences immediately
    try {
        val prefs = getSharedPreferences(\"DoMinderAlarmActions\", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString(\"snoozed_${reminderId}\", \"${System.currentTimeMillis()}:${minutes}\")
            apply()
        }
    } catch (e: Exception) {
        DebugLogger.log(\"AlarmActivity: Error saving snooze to SharedPreferences: ${e.message}\")
    }
    
    // Send broadcast
    val intent = Intent(\"app.rork.dominder.ALARM_SNOOZE\").apply {
        setPackage(packageName)
        putExtra(\"reminderId\", reminderId)
        putExtra(\"snoozeMinutes\", minutes)
        putExtra(\"title\", intent.getStringExtra(\"title\") ?: \"Reminder\")
        putExtra(\"priority\", priority)
    }
    sendBroadcast(intent)
    
    // Finish activity
    finishAlarmProperly()
}
```

**Issue:**
- ✅ Saves snooze action to SharedPreferences (good for recovery)
- ✅ Sends broadcast to `AlarmActionBridge`
- ❌ But if AlarmActionBridge → scheduleNativeAlarm() → AlarmReceiver chain is broken, nothing fires

---

## Complete Fix Implementation

### Fix 1: Add AlarmReceiver.kt to Plugin

**File:** `/app/plugins/with-alarm-module.js`

**Action:** Add new file definition to the `files` array:

```javascript
{
    path: 'alarm/AlarmReceiver.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import android.app.*
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import app.rork.dominder_android_reminder_app.DebugLogger
import app.rork.dominder_android_reminder_app.R
import java.text.SimpleDateFormat
import java.util.*

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        DebugLogger.log(\"AlarmReceiver: ===== onReceive called! =====\")
        DebugLogger.log(\"AlarmReceiver: Action: \${intent.action}\")
        
        when (intent.action) {
            \"app.rork.dominder.ALARM_FIRED\",
            \"android.intent.action.BOOT_COMPLETED\" -> {
                handleAlarmFired(context, intent)
            }
            else -> {
                DebugLogger.log(\"AlarmReceiver: Unknown action: \${intent.action}\")
            }
        }
    }
    
    private fun handleAlarmFired(context: Context, intent: Intent) {
        val reminderId = intent.getStringExtra(\"reminderId\") ?: run {
            DebugLogger.log(\"AlarmReceiver: reminderId is null, aborting\")
            return
        }
        
        val title = intent.getStringExtra(\"title\") ?: \"Reminder\"
        val priority = intent.getStringExtra(\"priority\") ?: \"medium\"
        val triggerTime = System.currentTimeMillis()
        
        DebugLogger.log(\"AlarmReceiver: Alarm fired for reminderId: \$reminderId, priority: \$priority\")
        
        // Update actualTriggerCount in metadata (for repeating reminders)
        updateTriggerCount(context, reminderId)
        
        // Start ringtone service for high priority reminders
        if (priority == \"high\") {
            DebugLogger.log(\"AlarmReceiver: Starting ringtone service for high priority alarm\")
            AlarmRingtoneService.startAlarmRingtone(context, reminderId, title, priority)
        }
        
        // Create fullscreen alarm notification
        createFullscreenNotification(context, reminderId, title, priority, triggerTime)
        
        // Launch AlarmActivity
        launchAlarmActivity(context, reminderId, title, priority, triggerTime)
    }
    
    private fun updateTriggerCount(context: Context, reminderId: String) {
        try {
            val metaPrefs = context.getSharedPreferences(\"DoMinderReminderMeta\", Context.MODE_PRIVATE)
            val currentCount = metaPrefs.getInt(\"meta_\${reminderId}_actualTriggerCount\", 0)
            val newCount = currentCount + 1
            
            metaPrefs.edit().apply {
                putInt(\"meta_\${reminderId}_actualTriggerCount\", newCount)
                apply()
            }
            
            DebugLogger.log(\"AlarmReceiver: Updated actualTriggerCount for \$reminderId: \$currentCount -> \$newCount\")
        } catch (e: Exception) {
            DebugLogger.log(\"AlarmReceiver: Error updating trigger count: \${e.message}\")
        }
    }
    
    private fun createFullscreenNotification(
        context: Context,
        reminderId: String,
        title: String,
        priority: String,
        triggerTime: Long
    ) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            // Create notification channel for alarms
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    \"alarm_channel\",
                    \"Alarm Notifications\",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = \"Full screen alarm notifications\"
                    enableVibration(true)
                    setShowBadge(true)
                }
                notificationManager.createNotificationChannel(channel)
            }
            
            // Create fullscreen intent
            val fullscreenIntent = Intent(context, AlarmActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(\"reminderId\", reminderId)
                putExtra(\"title\", title)
                putExtra(\"priority\", priority)
                putExtra(\"triggerTime\", triggerTime)
            }
            
            val fullscreenPendingIntent = PendingIntent.getActivity(
                context,
                reminderId.hashCode(),
                fullscreenIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            // Build notification
            val notification = NotificationCompat.Builder(context, \"alarm_channel\")
                .setContentTitle(title)
                .setContentText(\"Reminder\")
                .setSmallIcon(R.drawable.small_icon_noti)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullscreenPendingIntent, true)
                .setAutoCancel(true)
                .setOngoing(true)
                .build()
            
            notificationManager.notify(reminderId.hashCode(), notification)
            DebugLogger.log(\"AlarmReceiver: Fullscreen notification created\")
            
        } catch (e: Exception) {
            DebugLogger.log(\"AlarmReceiver: Error creating notification: \${e.message}\")
        }
    }
    
    private fun launchAlarmActivity(
        context: Context,
        reminderId: String,
        title: String,
        priority: String,
        triggerTime: Long
    ) {
        try {
            val intent = Intent(context, AlarmActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(\"reminderId\", reminderId)
                putExtra(\"title\", title)
                putExtra(\"priority\", priority)
                putExtra(\"triggerTime\", triggerTime)
            }
            
            // Acquire wake lock to ensure activity launches
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            val wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                \"DoMinder:AlarmReceiverWakeLock\"
            )
            wakeLock.acquire(30 * 1000L) // 30 seconds
            
            context.startActivity(intent)
            
            wakeLock.release()
            DebugLogger.log(\"AlarmReceiver: AlarmActivity launched\")
            
        } catch (e: Exception) {
            DebugLogger.log(\"AlarmReceiver: Error launching activity: \${e.message}\")
        }
    }
}
`
}
```

### Fix 2: Register AlarmReceiver in AndroidManifest

**File:** `/app/plugins/with-alarm-module.js`

**Action:** Update the `withAndroidManifest` function to register the receiver:

Add after the existing activity registration code:

```javascript
// Register AlarmReceiver for ALARM_FIRED action
if (!manifest.application[0].receiver) {
    manifest.application[0].receiver = [];
}

// Check if AlarmReceiver already exists
const existingReceiver = manifest.application[0].receiver.find(
    r => r.$['android:name']?.includes('AlarmReceiver')
);

if (!existingReceiver) {
    manifest.application[0].receiver.push({
        $: {
            'android:name': '.alarm.AlarmReceiver',
            'android:enabled': 'true',
            'android:exported': 'false'
        },
        'intent-filter': [
            {
                action: [
                    { $: { 'android:name': 'app.rork.dominder.ALARM_FIRED' } },
                    { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }
                ]
            }
        ]
    });
    console.log('[Expo Plugin] AlarmReceiver registered in AndroidManifest');
}

// Also register AlarmActionBridge if not already registered
const existingActionBridge = manifest.application[0].receiver.find(
    r => r.$['android:name']?.includes('AlarmActionBridge')
);

if (!existingActionBridge) {
    manifest.application[0].receiver.push({
        $: {
            'android:name': '.alarm.AlarmActionBridge',
            'android:enabled': 'true',
            'android:exported': 'false'
        },
        'intent-filter': [
            {
                action: [
                    { $: { 'android:name': 'app.rork.dominder.ALARM_DONE' } },
                    { $: { 'android:name': 'app.rork.dominder.ALARM_SNOOZE' } },
                    { $: { 'android:name': 'com.dominder.MISSED_ALARM' } }
                ]
            }
        ]
    });
    console.log('[Expo Plugin] AlarmActionBridge registered in AndroidManifest');
}
```

### Fix 3: Update AlarmActionBridge - Complete Metadata for Shadow Snooze

**File:** `/app/plugins/with-alarm-module.js` → `AlarmActionBridge.kt`

**Action:** Update the `ALARM_SNOOZE` handler in `AlarmActionBridge`:

```kotlin
\"app.rork.dominder.ALARM_SNOOZE\" -> {
    val reminderId = intent.getStringExtra(\"reminderId\")
    val snoozeMinutes = intent.getIntExtra(\"snoozeMinutes\", 0)
    val title = intent.getStringExtra(\"title\") ?: \"Reminder\"
    val priority = intent.getStringExtra(\"priority\") ?: \"medium\"

    DebugLogger.log(\"AlarmActionBridge: ALARM_SNOOZE - reminderId: \${reminderId}, minutes: \${snoozeMinutes}\")
    if (reminderId != null) {
        // Check if repeating
        val metaPrefs = context.getSharedPreferences(\"DoMinderReminderMeta\", Context.MODE_PRIVATE)
        val repeatType = metaPrefs.getString(\"meta_\${reminderId}_repeatType\", \"none\") ?: \"none\"
        
        if (repeatType != \"none\") {
             DebugLogger.log(\"AlarmActionBridge: Snoozing REPEATING reminder \${reminderId}. Splitting Snooze vs Series.\")
             
             // 1. Schedule Shadow Snooze with COMPLETE metadata
             val shadowId = reminderId + \"_snooze\"
             
             // Calculate snooze time
             val snoozeTimeMs = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000L)
             val snoozeCal = Calendar.getInstance().apply {
                 timeInMillis = snoozeTimeMs
             }
             
             // Format date and time
             val snoozeDate = String.format(
                 \"%04d-%02d-%02d\",
                 snoozeCal.get(Calendar.YEAR),
                 snoozeCal.get(Calendar.MONTH) + 1,
                 snoozeCal.get(Calendar.DAY_OF_MONTH)
             )
             val snoozeTime = String.format(
                 \"%02d:%02d\",
                 snoozeCal.get(Calendar.HOUR_OF_DAY),
                 snoozeCal.get(Calendar.MINUTE)
             )
             
             // Store COMPLETE metadata for shadowId
             metaPrefs.edit().apply {
                 putString(\"meta_\${shadowId}_title\", \"Snoozed: \${title}\")
                 putString(\"meta_\${shadowId}_priority\", priority)
                 putString(\"meta_\${shadowId}_repeatType\", \"none\") // Force none for snooze
                 
                 // CRITICAL: Add date/time metadata
                 putString(\"meta_\${shadowId}_startDate\", snoozeDate)
                 putString(\"meta_\${shadowId}_startTime\", snoozeTime)
                 
                 // Add default values for other required fields
                 putInt(\"meta_\${shadowId}_everyValue\", 1)
                 putString(\"meta_\${shadowId}_everyUnit\", \"minutes\")
                 putString(\"meta_\${shadowId}_untilType\", \"forever\")
                 putInt(\"meta_\${shadowId}_untilCount\", 0)
                 putString(\"meta_\${shadowId}_untilDate\", \"\")
                 putString(\"meta_\${shadowId}_untilTime\", \"\")
                 putInt(\"meta_\${shadowId}_actualTriggerCount\", 0)
                 putInt(\"meta_\${shadowId}_occurrenceCount\", 0)
                 
                 // Multi-select defaults
                 putBoolean(\"meta_\${shadowId}_multiSelectEnabled\", false)
                 putString(\"meta_\${shadowId}_multiSelectDates\", \"[]\")
                 putString(\"meta_\${shadowId}_multiSelectDays\", \"[]\")
                 putString(\"meta_\${shadowId}_windowEndTime\", \"\")
                 putBoolean(\"meta_\${shadowId}_windowEndIsAM\", false)
                 
                 apply()
             }
             
             DebugLogger.log(\"AlarmActionBridge: Stored complete metadata for shadow snooze \${shadowId}\")
             
             // Schedule the native alarm
             scheduleNativeAlarm(context, shadowId, \"Snoozed: \${title}\", priority, snoozeMinutes)
             
             // 2. Advance Series (Schedule Next Regular Occurrence)
             scheduleNextOccurrenceIfNeeded(context, reminderId)
        } else {
             // One-off: Standard overwrite behavior
             DebugLogger.log(\"AlarmActionBridge: Snoozing ONE-OFF reminder \${reminderId}\")
             
             // For one-off reminders, update the metadata with new time
             val snoozeTimeMs = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000L)
             val snoozeCal = Calendar.getInstance().apply {
                 timeInMillis = snoozeTimeMs
             }
             
             val snoozeDate = String.format(
                 \"%04d-%02d-%02d\",
                 snoozeCal.get(Calendar.YEAR),
                 snoozeCal.get(Calendar.MONTH) + 1,
                 snoozeCal.get(Calendar.DAY_OF_MONTH)
             )
             val snoozeTime = String.format(
                 \"%02d:%02d\",
                 snoozeCal.get(Calendar.HOUR_OF_DAY),
                 snoozeCal.get(Calendar.MINUTE)
             )
             
             // Update metadata with new snooze time
             metaPrefs.edit().apply {
                 putString(\"meta_\${reminderId}_startDate\", snoozeDate)
                 putString(\"meta_\${reminderId}_startTime\", snoozeTime)
                 apply()
             }
             
             DebugLogger.log(\"AlarmActionBridge: Updated metadata for one-off snooze\")
             scheduleNativeAlarm(context, reminderId, title, priority, snoozeMinutes)
        }

        // Try emit to RN (UI Update) - will fail if app is killed, but that's OK
        DebugLogger.log(\"AlarmActionBridge: About to emit alarmSnooze event to React Native\")
        emitEventToReactNative(context, \"alarmSnooze\", reminderId, snoozeMinutes)
        DebugLogger.log(\"AlarmActionBridge: emitEventToReactNative call completed\")
    } else {
        DebugLogger.log(\"AlarmActionBridge: ERROR - reminderId is NULL!\")
    }
}
```

### Fix 4: Ensure AlarmReceiver is Discovered at Build Time

**File:** `/app/plugins/with-alarm-module.js`

**Action:** Ensure proper Gradle build configuration recognizes Kotlin files:

Update the `withAppBuildGradle` section:

```javascript
return withAppBuildGradle(config, async cfg => {
    // Ensure Kotlin is properly configured
    if (!cfg.modResults.contents.includes('org.jetbrains.kotlin:kotlin-stdlib')) {
        cfg.modResults.contents = cfg.modResults.contents.replace(
            /dependencies\s*{/,
            `dependencies {
    implementation \"org.jetbrains.kotlin:kotlin-stdlib:1.8.0\"
`
        );
    }
    
    // Ensure proper Java/Kotlin source compatibility
    if (!cfg.modResults.contents.includes('sourceCompatibility')) {
        cfg.modResults.contents = cfg.modResults.contents.replace(
            /android\s*{/,
            `android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_11
        targetCompatibility JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = '11'
    }
`
        );
    }
    
    return cfg;
});
```

### Fix 5: Add Missing Imports to AlarmActionBridge

**File:** `/app/plugins/with-alarm-module.js` → `AlarmActionBridge.kt`

**Action:** Ensure all necessary imports are present at the top of AlarmActionBridge.kt:

```kotlin
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
```

---

## Testing Checklist

After implementing these fixes:

### Test Case 1: One-Off Reminder Snooze (App Closed)
1. ✅ Create a high-priority one-time reminder for 1 minute from now
2. ✅ Close/kill the app completely
3. ✅ Wait for alarm to fire
4. ✅ Verify AlarmActivity appears with fullscreen UI
5. ✅ Verify ringtone plays (high priority)
6. ✅ Tap \"Snooze 5m\" button
7. ✅ Close alarm screen
8. ✅ Wait exactly 5 minutes
9. ✅ **Expected:** Alarm rings again at exactly 5 minutes
10. ✅ **Verify:** No \"missed alarm\" notification

### Test Case 2: Repeating Reminder Snooze (App Closed)
1. ✅ Create a high-priority repeating reminder (every 10 minutes) for 1 minute from now
2. ✅ Close/kill the app completely
3. ✅ Wait for alarm to fire (first occurrence)
4. ✅ Tap \"Snooze 5m\"
5. ✅ Wait 5 minutes
6. ✅ **Expected:** Snoozed alarm rings (shadow snooze)
7. ✅ Tap \"Done\" on snoozed alarm
8. ✅ Wait additional 5 minutes (original series continues)
9. ✅ **Expected:** Original series alarm rings (second occurrence, 10 min after first)
10. ✅ **Verify:** Both snooze AND series work correctly

### Test Case 3: Medium/Low Priority (No Ringtone)
1. ✅ Create a medium-priority reminder
2. ✅ Close app
3. ✅ Wait for alarm
4. ✅ Verify AlarmActivity appears but NO ringtone plays
5. ✅ Snooze for 5 minutes
6. ✅ **Expected:** Silent notification after 5 minutes (follows priority rules)

### Test Case 4: App Open State (Regression Test)
1. ✅ Create reminder with app OPEN
2. ✅ Keep app in foreground
3. ✅ Wait for alarm
4. ✅ Snooze
5. ✅ **Expected:** Still works as before (no regression)

---

## Implementation Steps

1. **Backup Current Code:**
   ```bash
   cd /app
   git add .
   git commit -m \"Backup before snooze fix implementation\"
   ```

2. **Edit `/app/plugins/with-alarm-module.js`:**
   - Add `AlarmReceiver.kt` to the `files` array (Fix 1)
   - Update `withAndroidManifest` to register receivers (Fix 2)
   - Update `AlarmActionBridge.kt` ALARM_SNOOZE handler (Fix 3)
   - Update `withAppBuildGradle` for Kotlin support (Fix 4)

3. **Clean and Rebuild:**
   ```bash
   cd /app
   rm -rf android/.gradle android/app/build
   npx expo prebuild --clean
   ```

4. **Build and Test:**
   ```bash
   npx expo run:android
   ```

5. **Verify Logs:**
   ```bash
   adb logcat | grep -i \"AlarmReceiver\|AlarmActionBridge\|DoMinderDebug\"
   ```

---

## Verification Logs to Look For

After fixes, you should see these log patterns when snooz working:

### When Alarm Fires:
```
AlarmReceiver: ===== onReceive called! =====
AlarmReceiver: Action: app.rork.dominder.ALARM_FIRED
AlarmReceiver: Alarm fired for reminderId: 1234567890, priority: high
AlarmReceiver: Starting ringtone service for high priority alarm
AlarmReceiver: Updated actualTriggerCount for 1234567890: 0 -> 1
AlarmReceiver: Fullscreen notification created
AlarmReceiver: AlarmActivity launched
```

### When User Snoozes:
```
AlarmActivity: Snoozing for 5 minutes, reminderId: 1234567890
AlarmActivity: Saved snooze to SharedPreferences for 1234567890
AlarmActivity: Sending ALARM_SNOOZE broadcast
AlarmActionBridge: ===== onReceive called! =====
AlarmActionBridge: Received action: app.rork.dominder.ALARM_SNOOZE
AlarmActionBridge: ALARM_SNOOZE - reminderId: 1234567890, minutes: 5
AlarmActionBridge: Stored complete metadata for shadow snooze 1234567890_snooze
AlarmActionBridge: Scheduling native fallback alarm
AlarmActionBridge: Native fallback alarm scheduled for [timestamp]
```

### When Snoozed Alarm Fires (5 min later):
```
AlarmReceiver: ===== onReceive called! =====
AlarmReceiver: Action: app.rork.dominder.ALARM_FIRED
AlarmReceiver: Alarm fired for reminderId: 1234567890_snooze, priority: high
AlarmReceiver: Starting ringtone service for high priority alarm
[... rest of alarm flow ...]
```

---

## Additional Notes

### Why Shadow Snooze for Repeating Reminders?
- Repeating reminders need to continue their series schedule
- Snooze is a \"one-off\" deviation from the series
- Creating a shadow reminder (with `_snooze` suffix) allows:
  - Snoozed alarm to fire independently
  - Original series to continue on schedule
  - No conflict between snooze time and next occurrence time

### Why Complete Metadata is Critical
- AlarmReceiver needs to know: title, priority, date, time
- Without `startDate` and `startTime`, the alarm has no trigger point
- Missing metadata causes silent failures (alarm scheduled but never fires)

### React Native Bridge Behavior
- When app is killed, `emitEventToReactNative()` fails silently (expected)
- Native code must handle everything independently
- When app reopens, it syncs state from SharedPreferences
- This architecture ensures alarms work regardless of app state

---

## Success Criteria

✅ **Fix is successful when:**
1. Snooze works with app completely closed/killed
2. Snoozed alarms ring at exactly the scheduled time
3. No \"missed alarm\" notifications for properly snoozed reminders
4. Both one-off and repeating reminders handle snooze correctly
5. Snooze continues to work when app is open (no regression)
6. High-priority snoozed alarms play ringtone
7. Medium/low-priority snoozed alarms show silent notifications

---

## Troubleshooting

### If snoozed alarm still doesn't ring:
1. Check logcat for `AlarmReceiver` logs - if missing, receiver isn't registered
2. Verify `AlarmActionBridge` shows \"scheduled native alarm\" log
3. Check battery optimization settings - disable for DoMinder
4. Verify \"Alarms & reminders\" permission is granted
5. Test on device without aggressive battery saving (Xiaomi/Huawei may kill alarms)

### If app crashes on snooze:
1. Check for missing imports in AlarmReceiver.kt
2. Verify AlarmRingtoneService exists and is registered
3. Check for null pointer exceptions in metadata access

### If ringtone doesn't play:
1. Verify priority is \"high\" (only high priority plays ringtone)
2. Check \"Ringer sound enabled\" setting in app
3. Verify AlarmRingtoneService logs show \"Starting ringtone\"
4. Check device is not in Do Not Disturb mode

---

## File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `/app/plugins/with-alarm-module.js` | MODIFY | Add AlarmReceiver.kt, update manifest registration, enhance metadata storage |
| AlarmReceiver.kt (new) | CREATE | New broadcast receiver to handle ALARM_FIRED events |
| AlarmActionBridge.kt | MODIFY | Complete metadata storage for shadow snooze |
| AndroidManifest.xml | AUTO-MODIFY | Receivers registered via plugin |

---

**Status:** ✅ Ready for Implementation
**Priority:** 🔴 HIGH (Core functionality broken)
**Complexity:** ⚠️ MEDIUM (Plugin modifications, rebuild required)
**Risk:** 🟡 LOW (Changes isolated to alarm system, backward compatible)
"
Observation: Create successful: /app/SNOOZE_RINGER_MODE_FIX.md