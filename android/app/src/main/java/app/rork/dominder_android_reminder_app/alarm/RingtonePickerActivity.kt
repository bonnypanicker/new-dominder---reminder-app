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
        
        // Make status bar seamless/transparent - no separation line
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.statusBarColor = android.graphics.Color.TRANSPARENT
            window.addFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                window.decorView.systemUiVisibility = (
                    android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                )
            }
        }
        
        // Get status bar height for proper padding
        val statusBarHeight = getStatusBarHeight()
        
        // Main container matching Reminder Defaults design
        val mainLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0xFFFEF7FF.toInt()) // Material3Colors.light.surface
            setPadding(0, 0, 0, 0)
            fitsSystemWindows = false
        }

        // Header matching Reminder Defaults modal style - seamless with status bar
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            // Add status bar height to top padding for seamless look
            setPadding(64, statusBarHeight + 52, 52, 52)
            setBackgroundColor(0xFFFEF7FF.toInt()) // Material3Colors.light.surface - same as main
            elevation = 0f // No elevation for seamless look
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

        // ScrollView container matching Reminder Defaults - scrollable, no visible scroll bars
        val scrollContainer = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
            setPadding(64, 64, 64, 64) // padding 24dp matching defaultsList style
            setBackgroundColor(0xFFFEF7FF.toInt())
            // Hide scroll bar indicator but keep scrolling enabled
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            // Ensure scrolling works properly
            isFillViewport = true
            isNestedScrollingEnabled = true
            // Smooth scrolling
            isSmoothScrollingEnabled = true
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
        
        // Show custom song if selected - Simple list item style
        val customSongCard = if (customSongUri != null && customSongName != null) {
            val isSelected = customSongUri == selectedUri
            
            TextView(this).apply {
                text = "🎵 ${customSongName}"
                textSize = 16f
                setTextColor(if (isSelected) 0xFF6750A4.toInt() else 0xFF1C1B1F.toInt())
                typeface = android.graphics.Typeface.create("sans-serif", if (isSelected) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
                setPadding(48, 36, 48, 36)
                setBackgroundColor(if (isSelected) 0xFFE8DEF8.toInt() else 0x00000000.toInt())
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 16) // Extra margin bottom before system ringtones
                }
                isClickable = true
                isFocusable = true
                setOnClickListener { view ->
                    stopCurrentRingtone()
                    selectedUri = customSongUri
                    try {
                        currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, customSongUri)
                        currentlyPlaying?.play()
                    } catch (e: Exception) {
                        DebugLogger.log("Error playing custom song preview: ${e.message}")
                    }
                    // Update selection visually - deselect all, select this one
                    (view.parent as? LinearLayout)?.let { parent ->
                        for (i in 0 until parent.childCount) {
                            val child = parent.getChildAt(i)
                            // Skip section title and browse button
                            if (child is TextView && child.text.toString() != "SELECT TONE" && !child.text.toString().contains("Browse")) {
                                val isThisItem = child == view
                                child.setBackgroundColor(if (isThisItem) 0xFFE8DEF8.toInt() else 0x00000000.toInt())
                                child.setTextColor(if (isThisItem) 0xFF6750A4.toInt() else 0xFF1C1B1F.toInt())
                                child.typeface = android.graphics.Typeface.create("sans-serif", if (isThisItem) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
                            }
                        }
                    }
                }
            }
        } else null
        
        if (customSongCard != null) {
            contentLayout.addView(customSongCard)
        }

        // Add each ringtone as a simple list item
        ringtones.forEach { (title, uri) ->
            val isSelected = uri == selectedUri
            
            val ringtoneItem = TextView(this).apply {
                text = title
                textSize = 16f // Slightly larger for better readability
                setTextColor(if (isSelected) 0xFF6750A4.toInt() else 0xFF1C1B1F.toInt()) // primary when selected, onSurface otherwise
                typeface = android.graphics.Typeface.create("sans-serif", if (isSelected) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
                setPadding(48, 36, 48, 36) // More padding for easier clicking
                
                // Simple background - just a subtle highlight when selected
                setBackgroundColor(if (isSelected) 0xFFE8DEF8.toInt() else 0x00000000.toInt()) // primaryContainer when selected, transparent otherwise
                
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, // Full width for easier clicking
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    setMargins(0, 0, 0, 2) // Small gap between items
                }
                
                // Make it clear it's clickable
                isClickable = true
                isFocusable = true
                
                setOnClickListener { view ->
                    stopCurrentRingtone()
                    selectedUri = uri
                    
                    // Play preview
                    try {
                        currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, uri)
                        currentlyPlaying?.play()
                    } catch (e: Exception) {
                        DebugLogger.log("Error playing ringtone preview: ${e.message}")
                    }
                    
                    // Update selection visually - deselect all, select this one
                    (view.parent as? LinearLayout)?.let { parent ->
                        for (i in 0 until parent.childCount) {
                            val child = parent.getChildAt(i)
                            // Skip section title and browse button
                            if (child is TextView && child.text.toString() != "SELECT TONE" && !child.text.toString().contains("Browse")) {
                                val isThisItem = child == view
                                child.setBackgroundColor(if (isThisItem) 0xFFE8DEF8.toInt() else 0x00000000.toInt())
                                child.setTextColor(if (isThisItem) 0xFF6750A4.toInt() else 0xFF1C1B1F.toInt())
                                child.typeface = android.graphics.Typeface.create("sans-serif", if (isThisItem) android.graphics.Typeface.BOLD else android.graphics.Typeface.NORMAL)
                            }
                        }
                    }
                }
            }
            
            contentLayout.addView(ringtoneItem)
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
    
    private fun getStatusBarHeight(): Int {
        var result = 0
        val resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
        if (resourceId > 0) {
            result = resources.getDimensionPixelSize(resourceId)
        }
        return result
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