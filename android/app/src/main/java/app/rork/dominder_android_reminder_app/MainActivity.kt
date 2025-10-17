package app.rork.dominder_android_reminder_app
import expo.modules.splashscreen.SplashScreenManager

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
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
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
}