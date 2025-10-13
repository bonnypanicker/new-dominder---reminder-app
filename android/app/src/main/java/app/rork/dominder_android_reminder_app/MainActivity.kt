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