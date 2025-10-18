const { withDangerousMod, withPlugins, withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// =================================
// 1. NEW: activity_alarm.xml content
// =================================
const activityAlarmXml = `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#000000"
    android:padding="16dp">

    <TextView
        android:id="@+id/alarm_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_centerHorizontal="true"
        android:layout_marginTop="64dp"
        android:textColor="#FFFFFF"
        android:textSize="28sp"
        android:textStyle="bold"
        tools:text="Reminder Title" />

    <LinearLayout
        android:id="@+id/snooze_buttons"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_below="@+id/alarm_title"
        android:layout_marginTop="48dp"
        android:orientation="horizontal"
        android:gravity="center">

        <Button
            android:id="@+id/snooze_5m"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:backgroundTint="#222222"
            android:textColor="#FFFFFF"
            android:text="5m" />

        <Button
            android:id="@+id/snooze_10m"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="8dp"
            android:backgroundTint="#222222"
            android:textColor="#FFFFFF"
            android:text="10m" />

        <Button
            android:id="@+id/snooze_15m"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="8dp"
            android:backgroundTint="#222222"
            android:textColor="#FFFFFF"
            android:text="15m" />
            
        <Button
            android:id="@+id/snooze_30m"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="8dp"
            android:backgroundTint="#222222"
            android:textColor="#FFFFFF"
            android:text="30m" />
    </LinearLayout>

    <Button
        android:id="@+id/done_button"
        android:layout_width="match_parent"
        android:layout_height="60dp"
        android:layout_alignParentBottom="true"
        android:layout_marginBottom="32dp"
        android:backgroundTint="#2e7d32"
        android:textColor="#FFFFFF"
        android:text="Done"
        android:textSize="18sp" />

</RelativeLayout>`;

// =================================
// 2. UPDATED: Kotlin files array
// =================================
const files = [
  // NEW: AlarmActionBridge.kt
  {
    path: 'alarm/AlarmActionBridge.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.DebugLogger

class AlarmActionBridge : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        DebugLogger.log("AlarmActionBridge: Received action: $action")
        when (action) {
            "app.rork.dominder.ALARM_DONE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                DebugLogger.log("AlarmActionBridge: Done for $reminderId")
            }
            "app.rork.dominder.ALARM_SNOOZE" -> {
                val reminderId = intent.getStringExtra("reminderId")
                val snoozeMinutes = intent.getIntExtra("snoozeMinutes", 0)
                DebugLogger.log("AlarmActionBridge: Snooze $reminderId for $snoozeMinutes min")
            }
        }
    }
}`
  },
  // UPDATED: AlarmActivity.kt
  {
    path: 'alarm/AlarmActivity.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import app.rork.dominder_android_reminder_app.DebugLogger
import app.rork.dominder_android_reminder_app.R

class AlarmActivity : AppCompatActivity() {
    private var wakeLock: PowerManager.WakeLock? = null
    private var reminderId: String? = null
    private var notificationId: Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DebugLogger.log("AlarmActivity: onCreate")

        // --- Wake Lock and Screen On Logic (preserved) ---
        acquireWakeLock()
        setShowWhenLockedAndTurnScreenOn()

        // --- New UI Logic ---
        setContentView(R.layout.activity_alarm)

        reminderId = intent.getStringExtra("reminderId")
        val title = intent.getStringExtra("title") ?: "Reminder"
        notificationId = reminderId?.hashCode() ?: 0

        if (reminderId == null) {
            DebugLogger.log("AlarmActivity: reminderId is null, finishing.")
            finish()
            return
        }

        val alarmTitle: TextView = findViewById(R.id.alarm_title)
        alarmTitle.text = title

        findViewById<Button>(R.id.snooze_5m).setOnClickListener { handleSnooze(5) }
        findViewById<Button>(R.id.snooze_10m).setOnClickListener { handleSnooze(10) }
        findViewById<Button>(R.id.snooze_15m).setOnClickListener { handleSnooze(15) }
        findViewById<Button>(R.id.snooze_30m).setOnClickListener { handleSnooze(30) }
        findViewById<Button>(R.id.done_button).setOnClickListener { handleDone() }
    }

    private fun handleSnooze(minutes: Int) {
        DebugLogger.log("AlarmActivity: Snoozing for $minutes minutes.")
        val intent = Intent("app.rork.dominder.ALARM_SNOOZE").apply {
            setPackage(packageName) // Important for explicit broadcast
            putExtra("reminderId", reminderId)
            putExtra("snoozeMinutes", minutes)
        }
        sendBroadcast(intent)
        cancelNotification()
        finishAndRemoveTask()
    }

    private fun handleDone() {
        DebugLogger.log("AlarmActivity: Done clicked.")
        val intent = Intent("app.rork.dominder.ALARM_DONE").apply {
            setPackage(packageName) // Important for explicit broadcast
            putExtra("reminderId", reminderId)
        }
        sendBroadcast(intent)
        cancelNotification()
        finishAndRemoveTask()
    }

    private fun cancelNotification() {
        if (notificationId != 0) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(notificationId)
            DebugLogger.log("AlarmActivity: Canceled notification with ID: $notificationId")
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
            acquire(30 * 1000L) // 30 seconds timeout
        }
    }

    private fun setShowWhenLockedAndTurnScreenOn() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
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
        
        if (reminderId == null) {
            DebugLogger.log("AlarmReceiver: reminderId is null")
            return
        }

        DebugLogger.log("AlarmReceiver: Creating full-screen notification for $reminderId")
        
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
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            reminderId.hashCode() + 1, // Use a different request code from fullScreenPendingIntent
            contentIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        val notification = NotificationCompat.Builder(context, "alarm_channel_v2")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText("Alarm is ringing")
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
    path: 'alarm/AlarmPackage.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
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

import android.app.Service
import android.content.Intent
import android.os.IBinder

class RescheduleAlarmsService : Service() {
    override fun onBind(intent: Intent?): IBinder? {
        return null
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
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import app.rork.dominder_android_reminder_app.DebugLogger

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "main"

  override fun onCreate(savedInstanceState: Bundle?) {
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
    return DefaultReactActivityDelegate(
      this,
      mainComponentName,
      DefaultNewArchitectureEntryPoint.fabricEnabled
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
}`
  },
  {
    path: 'BootReceiver.kt',
    content: `package app.rork.dominder_android_reminder_app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val serviceIntent = Intent(context, RescheduleAlarmsService::class.java)
            context.startService(serviceIntent)
        }
    }
}`
  },
  {
    path: 'alarm/AlarmModule.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import app.rork.dominder_android_reminder_app.DebugLogger

class AlarmModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AlarmModule"

    @ReactMethod
    fun scheduleAlarm(reminderId: String, title: String, triggerTime: Double, promise: Promise? = null) {
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
            DebugLogger.log("AlarmModule: Error scheduling alarm: \${e.message}")
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
      'android.permission.VIBRATE'
    ];
    requiredPermissions.forEach(permission => {
      if (!manifest["uses-permission"].some(p => p.$['android:name'] === permission)) {
        manifest["uses-permission"].push({ $: { 'android:name': permission } });
      }
    });

    const application = manifest.application[0];

    if (!application.activity) application.activity = [];
    const activities = application.activity.filter(a => a.$['android:name'] !== '.alarm.AlarmActivity');
    activities.push({
      $: {
        'android:name': '.alarm.AlarmActivity',
        'android:showWhenLocked': 'true',
        'android:turnScreenOn': 'true',
        'android:excludeFromRecents': 'true',
        'android:exported': 'true', // Must be true to be started by system
        'android:launchMode': 'singleTask',
        'android:theme': '@style/Theme.AppCompat.DayNight.NoActionBar'
      },
    });
    application.activity = activities;

    if (!application.receiver) application.receiver = [];
    const receivers = application.receiver.filter(r => 
        r.$['android:name'] !== '.alarm.AlarmReceiver' && 
        r.$['android:name'] !== '.BootReceiver' &&
        r.$['android:name'] !== '.alarm.AlarmActionBridge' // Filter out old one if present
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
                { $: { 'android:name': 'app.rork.dominder.ALARM_SNOOZE' } }
            ]
        }]
    });
    application.receiver = receivers;

    if (!application.service) application.service = [];
    const services = application.service.filter(s => s.$['android:name'] !== '.RescheduleAlarmsService');
    services.push({
      $: { 
        'android:name': '.RescheduleAlarmsService',
        'android:exported': 'false'
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
