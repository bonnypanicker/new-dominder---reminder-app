package app.rork.dominder_android_reminder_app.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.DebugLogger
import app.rork.dominder_android_reminder_app.MainActivity

class AlarmActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        val reminderId = intent.getStringExtra("reminderId")
        DebugLogger.log("AlarmActionReceiver: Received action: $action for reminderId: $reminderId")

        val mainActivityIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("reminderId", reminderId)
            putExtra("action", action)
        }
        context.startActivity(mainActivityIntent)
    }
}