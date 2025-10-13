package app.rork.dominder_android_reminder_app.alarm

import android.app.Activity
import android.content.Context
import android.content.Intent
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
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("action", "snooze")
                putExtra("reminderId", reminderId)
                putExtra("snoozeMinutes", 10)
            }
            startActivity(launchIntent)
        }
        dismissAlarm()
    }
    
    private fun handleDismiss() {
        if (reminderId != null) {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("action", "done")
                putExtra("reminderId", reminderId)
            }
            startActivity(launchIntent)
        }
        dismissAlarm()
    }

    private fun dismissAlarm() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        finishAffinity()
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
    }
}