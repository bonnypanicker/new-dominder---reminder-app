package app.rork.dominder_android_reminder_app

import android.util.Log

object DebugLogger {
    const val DEBUG_MODE = true // Set to false to disable debug logging

    fun log(message: String) {
        if (DEBUG_MODE) {
            Log.d("Dominder-Debug", message)
        }
    }
}
