# Kotlin Files to Fix Manually

## Critical Issues Found:

### 1. AlarmActivity.kt - Buttons Don't Work
**Location**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActivity.kt`

**Current Problem**: Lines 52-54 and 58-59 just call `dismissAlarm()` - they don't actually snooze or mark reminders as done.

**Replace the entire file with**:

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

        // Set fullscreen and wake-screen flags
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

        // Play alarm sound
        val alarmUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        mediaPlayer = MediaPlayer.create(this, alarmUri)
        mediaPlayer?.isLooping = true
        mediaPlayer?.start()

        // Get data from intent
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
            // Launch React Native app to handle snooze
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
            // Launch React Native app to handle done
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

---

### 2. AlarmReceiver.kt - Always Shows Full-Screen
**Location**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt`

**Current Problem**: Always launches AlarmActivity regardless of screen state. Should show persistent notification when screen is unlocked.

**Replace the entire file with**:

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
            // Screen is locked or off - launch full-screen alarm activity
            Log.d("AlarmReceiver", "Launching full-screen AlarmActivity")
            val alarmIntent = Intent(context, AlarmActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                putExtra("reminderId", reminderId)
                putExtra("title", title)
            }
            context.startActivity(alarmIntent)
        } else {
            // Screen is unlocked - show persistent notification
            Log.d("AlarmReceiver", "Showing persistent notification")
            showPersistentNotification(context, reminderId, title)
        }
    }
    
    private fun showPersistentNotification(context: Context, reminderId: String, title: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "ringer-notifications"
        
        // Create notification channel for Android O+
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
        
        // Create intent to open alarm screen when notification is tapped
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
        
        // Build notification
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

---

### 3. MainActivity.kt - No Bridge to React Native
**Location**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/MainActivity.kt`

**Current Problem**: Doesn't handle intents from AlarmActivity, so snooze/done actions never reach React Native.

**Replace the entire file with**:

```kotlin
package app.rork.dominder_android_reminder_app

import android.content.Intent
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
    // Set the theme to AppTheme BEFORE onCreate to support 
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    
    // Handle intent from AlarmActivity
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
      
      // Send event to React Native
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
      ){}
    )
  }

  override fun invokeDefaultOnBackPressed() {
      if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
          super.invokeDefaultOnBackPressed()
      } else {
          moveTaskToBack(true)
      }
  }
}
```

---

## Summary of Changes:

### AlarmActivity.kt:
- ✅ Added `handleSnooze()` and `handleDismiss()` methods
- ✅ These methods launch MainActivity with action intents
- ✅ Intents carry `action`, `reminderId`, and `snoozeMinutes`

### AlarmReceiver.kt:
- ✅ Added screen state detection (locked vs unlocked)
- ✅ Locked screen → Full-screen AlarmActivity
- ✅ Unlocked screen → Persistent notification
- ✅ Notification tap opens AlarmActivity

### MainActivity.kt:
- ✅ Added `handleAlarmIntent()` method
- ✅ Handles both `onCreate` and `onNewIntent`
- ✅ Emits `alarmAction` events to React Native
- ✅ React Native listener calls reminder functions

## After Applying These Fixes:

The flow will be:
1. **Ringer reminder triggers** → AlarmModule schedules native alarm
2. **AlarmReceiver fires** → Checks screen state
3. **If locked**: Full-screen AlarmActivity appears
4. **If unlocked**: Persistent notification appears
5. **User taps Snooze/Done** → AlarmActivity launches MainActivity with intent
6. **MainActivity** → Emits `alarmAction` event to React Native
7. **React Native** → Calls `rescheduleReminderById()` or `markReminderDone()`
8. **Reminder updated** → System reschedules or completes reminder

## Testing After Fixes:
- [ ] Lock phone, trigger ringer reminder → Full-screen alarm appears
- [ ] Unlock phone, trigger ringer reminder → Persistent notification appears
- [ ] Tap notification → Opens AlarmActivity
- [ ] Tap Snooze → Reminder snoozed for 10 minutes
- [ ] Tap Done → Reminder marked as done
- [ ] Check logs for "alarmAction event" in React Native
