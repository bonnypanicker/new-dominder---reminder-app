package app.rork.dominder_android_reminder_app.alarm

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
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
        
        // Set status bar color to match Material3 surface
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = 0xFFFEF7FF.toInt()
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                window.decorView.systemUiVisibility = android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            }
        }
        
        // Main container matching Reminder Defaults design
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0xFFFEF7FF.toInt()) // Material3Colors.light.surface
            setPadding(0, 0, 0, 0)
        }

        // Header matching Reminder Defaults modal style
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(64, 52, 52, 52) // paddingHorizontal 24dp, paddingVertical 20dp
            setBackgroundColor(0xFFFEF7FF.toInt()) // Material3Colors.light.surface
            elevation = 2f
            
            // Add bottom border
            val borderDrawable = android.graphics.drawable.GradientDrawable()
            borderDrawable.setColor(0xFFFEF7FF.toInt())
            borderDrawable.setStroke(3, 0xFFE7E0EC.toInt()) // surfaceVariant border, bottom only via layer
            background = borderDrawable
        }

        val titleText = TextView(this).apply {
            text = "Ringer Mode Tone"
            textSize = 20f // fontSize 20
            setTextColor(0xFF1C1B1F.toInt()) // onSurface
            typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD) // fontWeight 600
            layoutParams = LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
            )
        }

        val doneButton = TextView(this).apply {
            text = "Done"
            textSize = 14f // fontSize 14
            setTextColor(0xFF6750A4.toInt()) // Material3Colors.light.primary
            typeface = android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL) // fontWeight 500
            setPadding(42, 20, 42, 20) // paddingHorizontal 16dp, paddingVertical 8dp
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(0xFFE8DEF8.toInt()) // Material3Colors.light.primaryContainer
                cornerRadius = 52f // borderRadius 20
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                stopCurrentRingtone()
                val result = Intent().apply {
                    putExtra("selectedUri", selectedUri.toString())
                }
                setResult(Activity.RESULT_OK, result)
                finish()
            }
        }

        header.addView(titleText)
        header.addView(doneButton)
        mainLayout.addView(header)

        // ScrollView container matching Reminder Defaults
        val scrollContainer = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
            setPadding(64, 64, 64, 64) // padding 24dp matching defaultsList style
            setBackgroundColor(0xFFFEF7FF.toInt())
        }
        
        val contentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        
        // Section title matching defaultsSectionTitle style
        val sectionTitle = TextView(this).apply {
            text = "SELECT TONE"
            textSize = 14f // fontSize 14
            setTextColor(0xFF49454F.toInt()) // Material3Colors.light.onSurfaceVariant
            typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD) // fontWeight 600
            letterSpacing = 0.05f // letterSpacing 0.5
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = 42 // marginBottom 16dp
            }
        }
        contentLayout.addView(sectionTitle)

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

        // Browse button matching option chip style
        val browseButton = TextView(this).apply {
            text = "📁 Browse Custom Songs"
            textSize = 14f // fontSize 14
            setTextColor(0xFF6750A4.toInt()) // primary color
            typeface = android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL) // fontWeight 500
            setPadding(42, 26, 42, 26) // paddingHorizontal 16dp, paddingVertical 10dp
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(0xFFE8DEF8.toInt()) // Material3Colors.light.primaryContainer
                cornerRadius = 52f // borderRadius 20
                setStroke(3, 0xFF6750A4.toInt()) // primary border
            }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, 52) // margin bottom 20dp
            }
            setOnClickListener {
                stopCurrentRingtone()
                openFilePicker()
            }
        }
        contentLayout.addView(browseButton)
        
        // Show custom song if selected - Matching priority option card style
        if (customSongUri != null && customSongName != null) {
            val isSelected = customSongUri == selectedUri
            
            val customSongCard = TextView(this).apply {
                text = "🎵 ${customSongName}"
                textSize = 14f // fontSize 14
                setTextColor(if (isSelected) 0xFF6750A4.toInt() else 0xFF49454F.toInt()) // primary when selected, onSurfaceVariant otherwise
                typeface = android.graphics.Typeface.create("sans-serif-medium", if (isSelected) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL) // fontWeight 500 when selected
                setPadding(42, 26, 42, 26) // paddingHorizontal 16dp, paddingVertical 10dp
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(if (isSelected) 0xFFE8DEF8.toInt() else 0xFFF5EFF7.toInt()) // primaryContainer when selected, surfaceContainerLow otherwise
                    cornerRadius = 52f // borderRadius 20
                    setStroke(3, if (isSelected) 0xFF6750A4.toInt() else 0xFFE7E0EC.toInt()) // primary border when selected, surfaceVariant otherwise
                }
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(16, 0, 16, 16) // margin 6dp equivalent
                }
                setOnClickListener {
                    stopCurrentRingtone()
                    selectedUri = customSongUri
                    recreate() // Refresh to show selection
                }
            }
            
            contentLayout.addView(customSongCard)
        }

        // Add each ringtone as a chip matching optionChip style
        ringtones.forEach { (title, uri) ->
            val isSelected = uri == selectedUri
            
            val ringtoneChip = TextView(this).apply {
                text = title
                textSize = 14f // fontSize 14
                setTextColor(if (isSelected) 0xFF6750A4.toInt() else 0xFF49454F.toInt()) // primary when selected, onSurfaceVariant otherwise
                typeface = android.graphics.Typeface.create("sans-serif", if (isSelected) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL) // fontWeight 500 when selected
                setPadding(42, 26, 42, 26) // paddingHorizontal 16dp, paddingVertical 10dp
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(if (isSelected) 0xFFE8DEF8.toInt() else 0xFFF5EFF7.toInt()) // primaryContainer when selected, surfaceContainerLow otherwise
                    cornerRadius = 52f // borderRadius 20
                    setStroke(3, if (isSelected) 0xFF6750A4.toInt() else 0xFFE7E0EC.toInt()) // primary border when selected, surfaceVariant otherwise
                }
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(16, 0, 16, 16) // margin 6dp equivalent
                }
                setOnClickListener {
                    stopCurrentRingtone()
                    selectedUri = uri
                    
                    // Play preview
                    try {
                        currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, uri)
                        currentlyPlaying?.play()
                    } catch (e: Exception) {
                        DebugLogger.log("Error playing ringtone preview: ${e.message}")
                    }
                    
                    recreate() // Refresh to show selection
                }
            }
            
            contentLayout.addView(ringtoneChip)
        }

        scrollContainer.addView(contentLayout)
        mainLayout.addView(scrollContainer)

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