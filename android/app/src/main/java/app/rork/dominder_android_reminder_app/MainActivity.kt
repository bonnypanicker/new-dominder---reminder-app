package app.rork.dominder_android_reminder_app
import expo.modules.splashscreen.SplashScreenManager

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return DefaultReactActivityDelegate(
        this,
        mainComponentName,
        DefaultNewArchitectureEntryPoint.fabricEnabled,
        DefaultNewArchitectureEntryPoint.concurrentReactEnabled
    )
  }

  override fun onNewIntent(intent: Intent?) {
      super.onNewIntent(intent)
      handleAlarmIntent(intent)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
      super.onCreate(null)
      handleAlarmIntent(intent)
  }

  private fun handleAlarmIntent(intent: Intent?) {
      intent?.let {
          val reminderId = it.getStringExtra("reminderId")
          val action = it.getStringExtra("action")
          if (reminderId != null && action != null) {
              val event = Bundle().apply {
                  putString("reminderId", reminderId)
                  putString("action", action)
              }
              reactApplication.reactNativeHost.reactInstanceManager.currentReactContext
                  ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  ?.emit("onAlarmAction", event)
          }
      }
  }
}