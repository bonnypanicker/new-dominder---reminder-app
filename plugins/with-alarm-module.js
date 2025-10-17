

const { withDangerousMod, withPlugins, withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const files = [
  // Unchanged from original
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

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        DebugLogger.log("AlarmReceiver: Received broadcast")
        val reminderId = intent.getStringExtra("reminderId")
        val title = intent.getStringExtra("title") ?: "Reminder"
        
        if (reminderId == null) {
            DebugLogger.log("AlarmReceiver: reminderId is null")
            return
        }

        DebugLogger.log("AlarmReceiver: Creating full-screen notification for \$reminderId")
        
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        // Step 1: Create HIGH importance notification channel (Android 8+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "alarm_channel_v2",
                "Alarms",
                NotificationManager.IMPORTANCE_HIGH  // CRITICAL: Must be HIGH
            ).apply {
                description = "Full screen alarm notifications"
                setSound(null, null)
                enableLights(true)
                enableVibration(true)
                setBypassDnd(true)  // Bypass Do Not Disturb
            }
            notificationManager.createNotificationChannel(channel)
        }
        
        // Step 2: Create fullScreenIntent pointing to AlarmActivity
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
        
        // Step 3: Create content intent for notification tap
        val contentIntent = Intent(context, AlarmActivity::class.java).apply {
            putExtra("reminderId", reminderId)
            putExtra("title", title)
        }
        val contentPendingIntent = PendingIntent.getActivity(
            context,
            reminderId.hashCode() + 1,
            contentIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        // Step 4: Build notification with fullScreenIntent
        val notification = NotificationCompat.Builder(context, "alarm_channel_v2")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText("Tap to view alarm")
            .setPriority(NotificationCompat.PRIORITY_MAX)  // CRITICAL
            .setCategory(NotificationCompat.CATEGORY_ALARM)  // CRITICAL
            .setFullScreenIntent(fullScreenPendingIntent, true)  // CRITICAL: Shows full screen
            .setContentIntent(contentPendingIntent)
            .setAutoCancel(true)
            .setOngoing(true)
            .setVibrate(longArrayOf(0, 1000, 500, 1000))
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()
        
        // Step 5: Show notification (triggers fullScreenIntent on locked devices)
        notificationManager.notify(reminderId.hashCode(), notification)
        DebugLogger.log("AlarmReceiver: Full-screen notification created and shown")
    }
}`
  },
  // FIXED
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
  // FIXED
  {
    path: 'alarm/AlarmActivity.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import app.rork.dominder_android_reminder_app.DebugLogger
import app.rork.dominder_android_reminder_app.MainActivity

class AlarmActivity : AppCompatActivity() {
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        DebugLogger.log("AlarmActivity: onCreate")

        // Acquire wake lock
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or 
            PowerManager.ACQUIRE_CAUSES_WAKEUP or 
            PowerManager.ON_AFTER_RELEASE,
            "DoMinder:AlarmWakeLock"
        ).apply {
            acquire(30000) // 30 seconds max
        }

        val reminderId = intent.getStringExtra("reminderId")
        if (reminderId == null) {
            DebugLogger.log("AlarmActivity: reminderId is null")
            finish()
            return
        }

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

        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("reminderId", reminderId)
            putExtra("action", "show_alarm")
        }
        startActivity(intent)
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
    }
}`
  },
  // Unchanged from original
  {
    path: 'alarm/AlarmActionReceiver.kt',
    content: `package app.rork.dominder_android_reminder_app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.DebugLogger
import app.rork.dominder_android_reminder_app.MainActivity

class AlarmActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        val reminderId = intent.getStringExtra("reminderId")
        DebugLogger.log("AlarmActionReceiver: Received action: \$action for reminderId: \$reminderId")

        val mainActivityIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("reminderId", reminderId)
            putExtra("action", action)
        }
        context.startActivity(mainActivityIntent)
    }
}`
  },
  // Unchanged from original
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
  // Unchanged from original
  {
    path: 'MainApplication.kt',
    content: `package app.rork.dominder_android_reminder_app

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
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
            // Packages that cannot be autolinked yet can be added manually here, for example:
            packages.add(app.rork.dominder_android_reminder_app.alarm.AlarmPackage())
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
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}`
  },
  // FIXED
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
        DebugLogger.log("MainActivity: Alarm intent received for reminderId=\$it")
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
  // Unchanged from original
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
  // Unchanged from original
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
  // FIXED
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
            
            // Check exact alarm permission (Android 12+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    DebugLogger.log("AlarmModule: SCHEDULE_EXACT_ALARM permission not granted")
                    promise?.reject("PERMISSION_DENIED", "SCHEDULE_EXACT_ALARM permission not granted")
                    return
                }
            }
            
            // CRITICAL FIX: Create broadcast intent to AlarmReceiver
            val intent = Intent(reactContext, AlarmReceiver::class.java).apply {
                action = "app.rork.dominder.ALARM_FIRED"  // Custom action
                putExtra("reminderId", reminderId)
                putExtra("title", title)
            }
            
            // CRITICAL FIX: Use getBroadcast instead of getActivity
            val pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                reminderId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            
            DebugLogger.log("AlarmModule: Scheduling alarm broadcast for \$reminderId at \$triggerTime")
            
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
            
            // Must match the intent used in scheduleAlarm
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

const withAlarmManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // Add permissions (idempotent)
    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    const requiredPermissions = [
      'android.permission.WAKE_LOCK',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.POST_NOTIFICATIONS'
    ];
    requiredPermissions.forEach(permission => {
      if (!manifest["uses-permission"].some(p => p.$['android:name'] === permission)) {
        manifest["uses-permission"].push({ $: { 'android:name': permission } });
      }
    });

    const application = manifest.application[0];

    // Update or add AlarmActivity (FIXED)
    if (!application.activity) application.activity = [];
    const activities = application.activity.filter(a => a.$['android:name'] !== '.alarm.AlarmActivity');
    activities.push({
      $: {
        'android:name': '.alarm.AlarmActivity',
        'android:showWhenLocked': 'true',
        'android:turnScreenOn': 'true',
        'android:excludeFromRecents': 'true',
        'android:exported': 'false',  // FIXED: Changed from 'true' (security)
        'android:launchMode': 'singleTask',  // FIXED: Changed from 'singleTop'
        'android:theme': '@style/Theme.AppCompat.DayNight.NoActionBar'
      },
    });
    application.activity = activities;

    // Unchanged receiver/service logic from original
    if (!application.receiver) application.receiver = [];
    const receivers = application.receiver.filter(r => 
        r.$['android:name'] !== '.alarm.AlarmReceiver' && 
        r.$['android:name'] !== '.alarm.AlarmActionReceiver' && 
        r.$['android:name'] !== '.BootReceiver'
    );
    receivers.push({
      $: { 'android:name': '.alarm.AlarmReceiver', 'android:exported': 'true' },
      'intent-filter': [{
        action: [{ $: { 'android:name': 'app.rork.dominder.ALARM_FIRED' } }]
      }]
    });
    receivers.push({
      $: { 'android:name': '.alarm.AlarmActionReceiver', 'android:exported': 'false' },
      'intent-filter': [ { action: [ { $: { 'android:name': 'app.rork.dominder.ALARM_ACTION' } } ] } ],
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
    application.receiver = receivers;

    if (!application.service) application.service = [];
    const services = application.service.filter(s => s.$['android:name'] !== '.RescheduleAlarmsService');
    services.push({
      $: { 
        'android:name': '.RescheduleAlarmsService',
        'android:exported': 'false',
        'android:foregroundServiceType': 'shortService',  // ADDED for Android 14+
        'android:stopWithTask': 'false'
      },
    });
    application.service = services;

    return config;
  });
};

// NEW function to add kotlinOptions
const withAppGradle = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      let buildGradle = config.modResults.contents;
      if (!buildGradle.includes('kotlinOptions')) {
        buildGradle = buildGradle.replace(
          /(\n\s*android\s*{\s*)/,
          `$1    kotlinOptions {\n        jvmTarget = "17"\n    }\n`
        );
      }
      if (!buildGradle.includes('compileOptions')) {
        buildGradle = buildGradle.replace(
          /(\n\s*android\s*{\s*)/,
          `$1    compileOptions {\n        sourceCompatibility JavaVersion.VERSION_17\n        targetCompatibility JavaVersion.VERSION_17\n    }\n`
        );
      }
      config.modResults.contents = buildGradle;
    }
    return config;
  });
};

module.exports = (config) => withPlugins(config, [
    withKotlinFiles, 
    withAlarmManifest,
    withAppGradle
]);
