package app.rork.dominder_android_reminder_app.alarm

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AlarmPackage : ReactPackage {
    private var missedAlarmReceiver: MissedAlarmReceiver? = null
    
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        // Initialize the missed alarm receiver
        missedAlarmReceiver = MissedAlarmReceiver(reactContext)
        
        return listOf(AlarmModule(reactContext))
    }
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}