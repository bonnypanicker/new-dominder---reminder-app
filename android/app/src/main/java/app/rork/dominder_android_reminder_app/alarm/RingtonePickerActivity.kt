package app.rork.dominder_android_reminder_app.alarm

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import app.rork.dominder_android_reminder_app.DebugLogger
import app.rork.dominder_android_reminder_app.R

class RingtonePickerActivity : AppCompatActivity() {
    private var selectedUri: Uri? = null
    private var currentlyPlaying: Ringtone? = null
    private var customSongUri: Uri? = null
    private var customSongName: String? = null
    private val PICK_AUDIO_REQUEST = 2001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Create layout programmatically to match app theme
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0xFFFEF7FF.toInt()) // Material3 surface
            setPadding(0, 0, 0, 0)
        }

        // Header - Modern design
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(24, 48, 20, 20)
            setBackgroundColor(0xFFFAFAFA.toInt())
            elevation = 2f
        }

        val titleText = TextView(this).apply {
            text = "Select Alarm Sound"
            textSize = 22f
            setTextColor(0xFF1C1B1F.toInt())
            typeface = android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL)
            layoutParams = LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
            )
        }

        val cancelButton = com.google.android.material.button.MaterialButton(this).apply {
            text = "Cancel"
            textSize = 14f
            setTextColor(0xFF6750A4.toInt())
            backgroundTintList = null
            cornerRadius = 50
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                stopCurrentRingtone()
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }

        header.addView(titleText)
        header.addView(cancelButton)
        mainLayout.addView(header)

        // ListView for ringtones
        val listView = ListView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
            dividerHeight = 1
            setBackgroundColor(0xFFFAFAFA.toInt())
        }

        // Load ringtones
        val ringtoneManager = RingtoneManager(this)
        ringtoneManager.setType(RingtoneManager.TYPE_ALARM)
        val cursor = ringtoneManager.cursor

        val ringtones = mutableListOf<Pair<String, Uri>>()
        
        // Add default option
        val defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ringtones.add(Pair("Default Alarm", defaultUri))

        // Add all alarm sounds
        while (cursor.moveToNext()) {
            val title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX)
            val uri = ringtoneManager.getRingtoneUri(cursor.position)
            ringtones.add(Pair(title, uri))
        }

        // Get currently selected URI
        val currentUriString = intent.getStringExtra("currentUri")
        selectedUri = if (currentUriString != null) Uri.parse(currentUriString) else defaultUri
        
        // Check if current selection is a custom song (not in system ringtones)
        if (currentUriString != null && !currentUriString.contains("internal") && !currentUriString.contains("settings/system")) {
            customSongUri = Uri.parse(currentUriString)
            customSongName = getFileName(customSongUri!!)
        }

        // Add "Browse Files" button before the list (pill-shaped)
        val browseButton = com.google.android.material.button.MaterialButton(this).apply {
            text = "📁 Browse Custom Songs"
            textSize = 15f
            setTextColor(0xFFFFFFFF.toInt())
            cornerRadius = 100 // Full pill shape
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(40, 20, 40, 20)
                height = 140 // 56dp equivalent
            }
            setBackgroundColor(0xFF6750A4.toInt())
            elevation = 2f
            setOnClickListener {
                stopCurrentRingtone()
                openFilePicker()
            }
        }
        mainLayout.addView(browseButton)
        
        // Show custom song if one is selected - Modern pill design
        if (customSongUri != null && customSongName != null) {
            // Container with padding
            val customSongContainer = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
                setPadding(40, 0, 40, 20)
            }

            val customSongView = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
                setPadding(32, 28, 32, 28)
                setBackgroundColor(0xFFE8DEF8.toInt()) // Light primary container
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(0xFFE8DEF8.toInt())
                    cornerRadius = 50f
                }
                elevation = 2f
                
                setOnClickListener {
                    stopCurrentRingtone()
                    selectedUri = customSongUri
                    
                    // Play preview
                    try {
                        currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, customSongUri)
                        currentlyPlaying?.play()
                    } catch (e: Exception) {
                        DebugLogger.log("Error playing custom song: ${e.message}")
                    }
                }
            }

            val radioButton = RadioButton(this).apply {
                isChecked = customSongUri == selectedUri
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                )
            }

            val textView = TextView(this).apply {
                text = "🎵 ${customSongName}"
                textSize = 16f
                setTextColor(0xFF1C1B1F.toInt())
                typeface = android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL)
                setPadding(24, 0, 0, 0)
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }

            customSongView.addView(radioButton)
            customSongView.addView(textView)
            customSongContainer.addView(customSongView)
            mainLayout.addView(customSongContainer)
        }

        // Create adapter
        val adapter = object : BaseAdapter() {
            override fun getCount() = ringtones.size
            override fun getItem(position: Int) = ringtones[position]
            override fun getItemId(position: Int) = position.toLong()

            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val (title, uri) = ringtones[position]
                
                val itemLayout = LinearLayout(this@RingtonePickerActivity).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                    )
                    setPadding(48, 32, 48, 32)
                    setBackgroundColor(0xFFFFFFFF.toInt())
                    
                    setOnClickListener {
                        stopCurrentRingtone()
                        selectedUri = uri
                        notifyDataSetChanged()
                        
                        // Play preview
                        try {
                            currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, uri)
                            currentlyPlaying?.play()
                        } catch (e: Exception) {
                            DebugLogger.log("Error playing ringtone preview: ${e.message}")
                        }
                    }
                }

                val radioButton = RadioButton(this@RingtonePickerActivity).apply {
                    isChecked = uri == selectedUri
                    layoutParams = LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                    )
                    setOnClickListener { itemLayout.performClick() }
                }

                val textView = TextView(this@RingtonePickerActivity).apply {
                    text = title
                    textSize = 16f
                    setTextColor(0xFF1C1B1F.toInt())
                    setPadding(32, 0, 0, 0)
                    layoutParams = LinearLayout.LayoutParams(
                        0,
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        1f
                    )
                }

                itemLayout.addView(radioButton)
                itemLayout.addView(textView)
                return itemLayout
            }
        }

        listView.adapter = adapter

        mainLayout.addView(listView)

        // Footer with OK button (pill-shaped)
        val footer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(24, 20, 24, 24)
            setBackgroundColor(0xFFFAFAFA.toInt())
            elevation = 8f
        }

        val okButton = com.google.android.material.button.MaterialButton(this).apply {
            text = "Confirm Selection"
            textSize = 16f
            setTextColor(0xFFFFFFFF.toInt())
            cornerRadius = 100 // Full pill shape
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                height = 140 // 56dp equivalent
            }
            setBackgroundColor(0xFF6750A4.toInt())
            elevation = 2f
            setOnClickListener {
                stopCurrentRingtone()
                val result = Intent().apply {
                    putExtra("selectedUri", selectedUri.toString())
                }
                setResult(Activity.RESULT_OK, result)
                finish()
            }
        }

        footer.addView(okButton)
        mainLayout.addView(footer)

        setContentView(mainLayout)
    }

    private fun stopCurrentRingtone() {
        try {
            currentlyPlaying?.let {
                if (it.isPlaying) {
                    it.stop()
                }
            }
            currentlyPlaying = null
        } catch (e: Exception) {
            DebugLogger.log("Error stopping ringtone: ${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCurrentRingtone()
    }

    override fun onPause() {
        super.onPause()
        stopCurrentRingtone()
    }
    
    private fun openFilePicker() {
        try {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "audio/*"
                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("audio/*"))
            }
            startActivityForResult(intent, PICK_AUDIO_REQUEST)
            DebugLogger.log("RingtonePickerActivity: Opened file picker")
        } catch (e: Exception) {
            DebugLogger.log("RingtonePickerActivity: Error opening file picker: ${e.message}")
            Toast.makeText(this, "Error opening file picker", Toast.LENGTH_SHORT).show()
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == PICK_AUDIO_REQUEST && resultCode == Activity.RESULT_OK) {
            data?.data?.let { uri ->
                try {
                    // Take persistable URI permission
                    contentResolver.takePersistableUriPermission(
                        uri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                    
                    customSongUri = uri
                    customSongName = getFileName(uri)
                    selectedUri = uri
                    
                    DebugLogger.log("RingtonePickerActivity: Selected custom song: ${customSongName}")
                    
                    // Persist immediately so next open shows latest selection without recreate
                    try {
                        val prefs = getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
                        prefs.edit().putString("alarm_ringtone_uri", uri.toString()).apply()
                    } catch (e: Exception) {
                        DebugLogger.log("RingtonePickerActivity: Error saving selected uri: ${e.message}")
                    }

                    // Return result immediately and finish (no recreate)
                    val result = Intent().apply {
                        putExtra("selectedUri", selectedUri.toString())
                    }
                    setResult(Activity.RESULT_OK, result)
                    finish()
                } catch (e: Exception) {
                    DebugLogger.log("RingtonePickerActivity: Error handling selected file: ${e.message}")
                    Toast.makeText(this, "Error loading audio file", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun getFileName(uri: Uri): String {
        var fileName = "Custom Song"
        try {
            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex >= 0) {
                        fileName = cursor.getString(nameIndex)
                    }
                }
            }
        } catch (e: Exception) {
            DebugLogger.log("RingtonePickerActivity: Error getting file name: ${e.message}")
        }
        return fileName
    }
}