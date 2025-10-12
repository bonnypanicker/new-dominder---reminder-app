# Comprehensive Kotlin Fix Prompt for Gemini CLI

## Context
This is a React Native reminder app with native Android alarm functionality. The app has three critical Kotlin files that need fixes to properly handle ringer mode alarms with full-screen intents and persistent notifications.

## Current Issues

### 1. **AlarmActivity.kt** - Buttons Don't Execute Actions
**File**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActivity.kt`

**Problem**: 
- Lines 52-54 and 58-59 only call `dismissAlarm()` 
- Snooze and Done buttons don't actually trigger the intended actions
- No communication bridge to React Native layer

**Required Fix**:
Add `handleSnooze()` and `handleDismiss()` methods that:
1. Create an intent to launch MainActivity
2. Pass action data (`action`, `reminderId`, `snoozeMinutes`) as extras
3. Start the MainActivity with these intents
4. Then call `dismissAlarm()` to close the alarm screen

### 2. **AlarmReceiver.kt** - Always Shows Full-Screen Alarm
**File**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt`

**Problem**:
- Always launches AlarmActivity regardless of screen state
- Should show persistent notification when screen is unlocked
- No screen state detection logic

**Required Fix**:
1. Add screen state detection using `KeyguardManager` and `PowerManager`
2. If screen is locked OR off → Launch full-screen AlarmActivity
3. If screen is unlocked → Show persistent notification
4. Add `showPersistentNotification()` method that:
   - Creates a notification channel for ringer notifications
   - Builds a persistent notification with tap intent to open AlarmActivity
   - Uses `NotificationManager` to display it

### 3. **MainActivity.kt** - No Bridge to React Native
**File**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/MainActivity.kt`

**Problem**:
- Doesn't handle intents from AlarmActivity
- No event emission to React Native
- Snooze/Done actions never reach the JavaScript layer

**Required Fix**:
1. Add `handleAlarmIntent()` method that:
   - Extracts `action`, `reminderId`, and `snoozeMinutes` from intent
   - Gets React Native context
   - Creates a params map with the extracted data
   - Emits `alarmAction` event to React Native using `DeviceEventManagerModule`
2. Call `handleAlarmIntent()` in both `onCreate()` and `onNewIntent()`

## Complete Fixed Code

### AlarmActivity.kt (COMPLETE REPLACEMENT)

```kotlin
package app.rork.dominder_android_reminder_app.alarm

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import app.rork.dominder_android_reminder_app.R

class AlarmActivity : AppCompatActivity() {

    private var mediaPlayer: MediaPlayer? = null
    private var reminderId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_alarm)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        val alarmUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        mediaPlayer = MediaPlayer.create(this, alarmUri)
        mediaPlayer?.isLooping = true
        mediaPlayer?.start()

        reminderId = intent.getStringExtra("reminderId")
        val title = intent.getStringExtra("title") ?: "Alarm"
        
        Log.d("AlarmActivity", "Created with reminderId: $reminderId, title: $title")

        val alarmTitleTextView: TextView = findViewById(R.id.alarmTitleTextView)
        alarmTitleTextView.text = title

        val snoozeButton: Button = findViewById(R.id.snoozeButton)
        snoozeButton.setOnClickListener {
            Log.d("AlarmActivity", "Snooze button clicked for reminderId: $reminderId")
            handleSnooze()
        }

        val dismissButton: Button = findViewById(R.id.dismissButton)
        dismissButton.setOnClickListener {
            Log.d("AlarmActivity", "Dismiss button clicked for reminderId: $reminderId")
            handleDismiss()
        }
    }
    
    private fun handleSnooze() {
        if (reminderId != null) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("action", "snooze")
                putExtra("reminderId", reminderId)
                putExtra("snoozeMinutes", 10)
            }
            startActivity(launchIntent)
        }
        dismissAlarm()
    }
    
    private fun handleDismiss() {
        if (reminderId != null) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("action", "done")
                putExtra("reminderId", reminderId)
            }
            startActivity(launchIntent)
        }
        dismissAlarm()
    }

    private fun dismissAlarm() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        finishAffinity()
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
    }
}
```

### AlarmReceiver.kt (COMPLETE REPLACEMENT)

```kotlin
package app.rork.dominder_android_reminder_app.alarm

import android.app.KeyguardManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import app.rork.dominder_android_reminder_app.R

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null) return
        
        Log.d("AlarmReceiver", "Alarm received!")

        val reminderId = intent?.getStringExtra("reminderId") ?: return
        val title = intent?.getStringExtra("title") ?: "Reminder"
        
        val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val isScreenOn = powerManager.isInteractive
        val isLocked = keyguardManager.isKeyguardLocked
        
        Log.d("AlarmReceiver", "Screen state - isScreenOn: $isScreenOn, isLocked: $isLocked")
        
        if (isLocked || !isScreenOn) {
            Log.d("AlarmReceiver", "Launching full-screen AlarmActivity")
            val alarmIntent = Intent(context, AlarmActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("reminderId", reminderId)
                putExtra("title", title)
            }
            context.startActivity(alarmIntent)
        } else {
            Log.d("AlarmReceiver", "Showing persistent notification")
            showPersistentNotification(context, reminderId, title)
        }
    }
    
    private fun showPersistentNotification(context: Context, reminderId: String, title: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "ringer-notifications"
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Ringer Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High priority reminder notifications"
                setSound(null, null)
                enableVibration(false)
            }
            notificationManager.createNotificationChannel(channel)
        }
        
        val tapIntent = Intent(context, AlarmActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("reminderId", reminderId)
            putExtra("title", title)
            putExtra("fromNotification", true)
        }
        val tapPendingIntent = PendingIntent.getActivity(
            context,
            reminderId.hashCode(),
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )
        
        val notification = NotificationCompat.Builder(context, channelId)
            .setContentTitle(title)
            .setContentText("Tap to open alarm")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(tapPendingIntent)
            .build()
        
        notificationManager.notify(reminderId.hashCode(), notification)
        Log.d("AlarmReceiver", "Persistent notification shown for reminderId: $reminderId")
    }
}
```

### MainActivity.kt (COMPLETE REPLACEMENT)

```kotlin
package app.rork.dominder_android_reminder_app
import expo.modules.splashscreen.SplashScreenManager

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "main"

  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
    
    handleAlarmIntent(intent)
  }
  
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    intent?.let { handleAlarmIntent(it) }
  }
  
  private fun handleAlarmIntent(intent: Intent) {
    val action = intent.getStringExtra("action")
    val reminderId = intent.getStringExtra("reminderId")
    
    if (action != null && reminderId != null) {
      Log.d("MainActivity", "Handling alarm action: $action for reminderId: $reminderId")
      
      val reactInstanceManager = reactNativeHost.reactInstanceManager
      val reactContext = reactInstanceManager.currentReactContext
      
      if (reactContext != null) {
        val params = com.facebook.react.bridge.Arguments.createMap().apply {
          putString("action", action)
          putString("reminderId", reminderId)
          if (action == "snooze") {
            putInt("snoozeMinutes", intent.getIntExtra("snoozeMinutes", 10))
          }
        }
        
        reactContext
          .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("alarmAction", params)
        
        Log.d("MainActivity", "Sent alarmAction event to React Native")
      } else {
        Log.w("MainActivity", "React context not available yet")
      }
    }
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(
        this,
        mainComponentName,
        fabricEnabled
      ){})
  }

  override fun invokeDefaultOnBackPressed() {
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
      if (!moveTaskToBack(false)) {
        super.invokeDefaultOnBackPressed()
      }
      return
    }

    super.invokeDefaultOnBackPressed()
  }
}
```

## Expected Flow After Fixes

1. **Ringer reminder triggers** → AlarmModule schedules native alarm
2. **AlarmReceiver fires** → Checks screen state
3. **If locked**: Full-screen AlarmActivity appears with alarm sound
4. **If unlocked**: Persistent notification appears (tap to open AlarmActivity)
5. **User taps Snooze/Done** → AlarmActivity launches MainActivity with intent extras
6. **MainActivity** → Emits `alarmAction` event to React Native
7. **React Native** → Listener in `app/_layout.tsx` calls `rescheduleReminderById()` or `markReminderDone()`
8. **Reminder updated** → System reschedules or completes reminder

## Testing Checklist

After applying these fixes, test:
- [ ] Lock phone, trigger ringer reminder → Full-screen alarm appears
- [ ] Unlock phone, trigger ringer reminder → Persistent notification appears
- [ ] Tap notification → Opens AlarmActivity
- [ ] Tap Snooze in AlarmActivity → Reminder snoozed for 10 minutes
- [ ] Tap Done in AlarmActivity → Reminder marked as done
- [ ] Check logcat for "alarmAction event" messages
- [ ] Verify app closes after Snooze/Done (doesn't stay visible)

## Key Changes Summary

### AlarmActivity.kt
- ✅ Added `handleSnooze()` method that launches MainActivity with snooze intent
- ✅ Added `handleDismiss()` method that launches MainActivity with done intent
- ✅ Both methods pass `action`, `reminderId`, and `snoozeMinutes` as extras
- ✅ Added logging for debugging

### AlarmReceiver.kt
- ✅ Added screen state detection (KeyguardManager + PowerManager)
- ✅ Conditional logic: locked/off → AlarmActivity, unlocked → notification
- ✅ Added `showPersistentNotification()` method
- ✅ Creates notification channel for ringer notifications
- ✅ Notification tap opens AlarmActivity

### MainActivity.kt
- ✅ Added `handleAlarmIntent()` method
- ✅ Extracts intent extras and emits to React Native
- ✅ Handles both `onCreate` and `onNewIntent` lifecycle methods
- ✅ Uses `DeviceEventManagerModule` to emit `alarmAction` events
- ✅ Added comprehensive logging

## Instructions for Gemini CLI

Please apply these fixes by replacing the entire content of each file with the provided code. The fixes are critical for:
1. Proper alarm button functionality (Snooze/Done)
2. Screen state-aware alarm presentation
3. Communication bridge between native Android and React Native layers

All three files must be updated together as they form an interconnected system.
