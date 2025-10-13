package app.rork.dominder_android_reminder_app.alarm

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.app.NotificationManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import app.rork.dominder_android_reminder_app.R

class AlarmActivity : AppCompatActivity() {

    private var mediaPlayer: MediaPlayer? = null
    private var reminderId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_alarm)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        val alarmUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        mediaPlayer = MediaPlayer.create(this, alarmUri)
        mediaPlayer?.isLooping = true
        mediaPlayer?.start()

        reminderId = intent.getStringExtra("reminderId")
        val title = intent.getStringExtra("title") ?: "Alarm"
        
        Log.d("AlarmActivity", "Created with reminderId: $reminderId, title: $title")

        val alarmTitleTextView: TextView = findViewById(R.id.alarmTitleTextView)
        alarmTitleTextView.text = title

        val snoozeButton: Button = findViewById(R.id.snoozeButton)
        snoozeButton.setOnClickListener {
            Log.d("AlarmActivity", "Snooze button clicked for reminderId: $reminderId")
            handleSnooze()
        }

        val dismissButton: Button = findViewById(R.id.dismissButton)
        dismissButton.setOnClickListener {
            Log.d("AlarmActivity", "Dismiss button clicked for reminderId: $reminderId")
            handleDismiss()
        }
    }
    
    private fun handleSnooze() {
        if (reminderId != null) {
            val intent = Intent("app.rork.dominder.ALARM_ACTION").apply {
                putExtra("action", "snooze")
                putExtra("reminderId", reminderId)
                putExtra("snoozeMinutes", 10)
            }
            sendBroadcast(intent)
            Log.d("AlarmActivity", "Sent snooze broadcast for reminderId: $reminderId")
        }
        dismissAlarm()
    }
    
    private fun handleDismiss() {
        if (reminderId != null) {
            val intent = Intent("app.rork.dominder.ALARM_ACTION").apply {
                putExtra("action", "done")
                putExtra("reminderId", reminderId)
            }
            sendBroadcast(intent)
            Log.d("AlarmActivity", "Sent done broadcast for reminderId: $reminderId")
        }
        dismissAlarm()
    }

    private fun dismissAlarm() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        reminderId?.let { 
            notificationManager.cancel(it.hashCode())
            Log.d("AlarmActivity", "Cancelled notification for reminderId: $it")
        }
        
        finish()
        Log.d("AlarmActivity", "AlarmActivity finished")
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
    }
}