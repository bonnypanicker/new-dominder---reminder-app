package app.rork.dominder_android_reminder_app.alarm

import app.rork.dominder_android_reminder_app.AlarmModule
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import android.util.Log

class AlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        Log.d("AlarmPackage", "Creating AlarmModule native module")
        val module = AlarmModule(reactContext)
        Log.d("AlarmPackage", "AlarmModule created successfully")
        return listOf(module)
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
