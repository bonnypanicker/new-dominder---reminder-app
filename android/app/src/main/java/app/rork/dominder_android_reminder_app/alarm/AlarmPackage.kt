package app.rork.dominder_android_reminder_app.alarm

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager
import app.rork.dominder_android_reminder_app.alarm.AlarmModule

class AlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: com.facebook.react.bridge.ReactApplicationContext): List<NativeModule> {
        return listOf(AlarmModule(reactContext))
    }

    override fun createViewManagers(reactContext: com.facebook.react.bridge.ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}