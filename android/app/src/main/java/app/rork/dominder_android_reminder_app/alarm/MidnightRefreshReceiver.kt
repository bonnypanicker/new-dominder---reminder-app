package app.rork.dominder_android_reminder_app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import app.rork.dominder_android_reminder_app.DebugLogger
import java.util.Calendar

class MidnightRefreshReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        DebugLogger.log("MidnightRefreshReceiver: Midnight reached, triggering notification refresh")
        
        // Send broadcast to trigger React Native notification refresh
        val refreshIntent = Intent("app.rork.dominder.MIDNIGHT_NOTIFICATION_REFRESH")
        context.sendBroadcast(refreshIntent)
        DebugLogger.log("MidnightRefreshReceiver: Sent MIDNIGHT_NOTIFICATION_REFRESH broadcast")
        
        // Schedule next midnight refresh
        scheduleNextMidnightRefresh(context)
    }
    
    companion object {
        fun scheduleNextMidnightRefresh(context: Context) {
            try {
                val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                
                // Calculate next midnight
                val midnight = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, 1)
                    set(Calendar.HOUR_OF_DAY, 0)
                    set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                
                val intent = Intent(context, MidnightRefreshReceiver::class.java).apply {
                    action = "app.rork.dominder.MIDNIGHT_REFRESH_ALARM"
                }
                
                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    999999, // Unique ID for midnight refresh
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                
                // Use setExactAndAllowWhileIdle for reliable midnight trigger even in Doze mode
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    midnight.timeInMillis,
                    pendingIntent
                )
                
                DebugLogger.log("MidnightRefreshReceiver: Scheduled next midnight refresh at ${midnight.time}")
            } catch (e: Exception) {
                DebugLogger.log("MidnightRefreshReceiver: Error scheduling midnight refresh: ${e.message}")
            }
        }
    }
}