# Material 3 UI Modernization Guide for DoMinder Alarm Components

## Overview
This document provides detailed instructions for modernizing the alarm screen and ringtone picker with Material Design 3 principles while keeping all wiring intact.

## Current Architecture

### 1. Full-Screen Alarm Screen
- **Location**: `app/alarm.tsx` (React Native)
- **Status**: ✅ Already uses Material 3 design with dark theme
- **Functionality**: Handles alarm display, snooze, and done actions
- **No changes needed** - already modern and well-designed

### 2. Ringtone Picker Activity
- **Location**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/RingtonePickerActivity.kt`
- **Status**: ❌ Uses programmatic Android Views with outdated UI
- **Needs**: Material 3 upgrade with modern components

---

## Required Changes

### Part 1: Ringtone Picker Activity Modernization

Replace the `RingtonePickerActivity.kt` with the following modern Material 3 implementation:

```kotlin
package app.rork.dominder_android_reminder_app.alarm

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.Gravity
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import app.rork.dominder_android_reminder_app.DebugLogger
import com.google.android.material.card.MaterialCardView
import com.google.android.material.button.MaterialButton
import com.google.android.material.appbar.MaterialToolbar
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.content.ContextCompat
import android.graphics.drawable.GradientDrawable
import android.view.View

class RingtonePickerActivity : AppCompatActivity() {
    private var selectedUri: Uri? = null
    private var currentlyPlaying: Ringtone? = null
    private var customSongUri: Uri? = null
    private var customSongName: String? = null
    private val PICK_AUDIO_REQUEST = 2001
    private lateinit var adapter: RingtoneAdapter

    // Material 3 Color Palette
    private val colorSurface = 0xFFFEF7FF.toInt()
    private val colorOnSurface = 0xFF1C1B1F.toInt()
    private val colorPrimary = 0xFF6750A4.toInt()
    private val colorOnPrimary = 0xFFFFFFFF.toInt()
    private val colorPrimaryContainer = 0xFFEADDFF.toInt()
    private val colorOnPrimaryContainer = 0xFF21005D.toInt()
    private val colorSurfaceVariant = 0xFFE7E0EC.toInt()
    private val colorOutline = 0xFF79747E.toInt()
    private val colorSurfaceContainer = 0xFFF3EDF7.toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Main coordinator layout
        val mainLayout = CoordinatorLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(colorSurface)
        }

        // Create content wrapper
        val contentWrapper = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = CoordinatorLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // Material Toolbar
        val toolbar = MaterialToolbar(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setBackgroundColor(colorSurface)
            elevation = 0f
            title = "Select Alarm Sound"
            setTitleTextColor(colorOnSurface)
            
            // Set navigation icon
            navigationIcon = createBackIcon()
            setNavigationOnClickListener {
                stopCurrentRingtone()
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }

        contentWrapper.addView(toolbar)

        // ScrollView for ringtone list
        val scrollView = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        }

        val listContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(16.dp, 16.dp, 16.dp, 16.dp)
        }

        // Load ringtones
        val ringtoneManager = RingtoneManager(this)
        ringtoneManager.setType(RingtoneManager.TYPE_ALARM)
        val cursor = ringtoneManager.cursor

        val ringtones = mutableListOf<RingtoneItem>()
        
        // Add default option
        val defaultUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        ringtones.add(RingtoneItem("Default Alarm", defaultUri, true))

        // Add all alarm sounds
        while (cursor.moveToNext()) {
            val title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX)
            val uri = ringtoneManager.getRingtoneUri(cursor.position)
            ringtones.add(RingtoneItem(title, uri, false))
        }

        // Get currently selected URI
        val currentUriString = intent.getStringExtra("currentUri")
        selectedUri = if (currentUriString != null) Uri.parse(currentUriString) else defaultUri
        
        // Check if current selection is a custom song
        if (currentUriString != null && !currentUriString.contains("internal") && !currentUriString.contains("settings/system")) {
            customSongUri = Uri.parse(currentUriString)
            customSongName = getFileName(customSongUri!!)
        }

        // Browse Files Button
        val browseCard = createBrowseCard()
        listContainer.addView(browseCard)

        // Custom song card if selected
        if (customSongUri != null && customSongName != null) {
            val customCard = createCustomSongCard()
            listContainer.addView(customCard)
        }

        // Section header for system ringtones
        val sectionHeader = TextView(this).apply {
            text = "SYSTEM RINGTONES"
            textSize = 12f
            setTextColor(colorOnPrimaryContainer)
            setTypeface(null, android.graphics.Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(8.dp, 16.dp, 8.dp, 8.dp)
            }
            letterSpacing = 0.05f
        }
        listContainer.addView(sectionHeader)

        // Add ringtone cards
        ringtones.forEach { item ->
            val card = createRingtoneCard(item)
            listContainer.addView(card)
        }

        scrollView.addView(listContainer)
        contentWrapper.addView(scrollView)

        // Bottom action button
        val bottomBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(16.dp, 12.dp, 16.dp, 20.dp)
            setBackgroundColor(colorSurface)
            elevation = 8f
        }

        val okButton = MaterialButton(this).apply {
            text = "OK"
            setTextColor(colorOnPrimary)
            setBackgroundColor(colorPrimary)
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                64.dp
            )
            cornerRadius = 100.dp
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

        bottomBar.addView(okButton)
        contentWrapper.addView(bottomBar)

        mainLayout.addView(contentWrapper)
        setContentView(mainLayout)
    }

    private fun createBackIcon(): android.graphics.drawable.Drawable {
        val drawable = GradientDrawable()
        drawable.shape = GradientDrawable.OVAL
        drawable.setColor(colorPrimaryContainer)
        drawable.setSize(40.dp, 40.dp)
        return drawable
    }

    private fun createBrowseCard(): View {
        val card = MaterialCardView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, 12.dp)
            }
            radius = 16.dp.toFloat()
            cardElevation = 2.dp.toFloat()
            setCardBackgroundColor(colorPrimaryContainer)
            isClickable = true
            isFocusable = true
            setOnClickListener {
                stopCurrentRingtone()
                openFilePicker()
            }
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(20.dp, 20.dp, 20.dp, 20.dp)
            gravity = Gravity.CENTER_VERTICAL
        }

        val icon = TextView(this).apply {
            text = "📁"
            textSize = 24f
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 16.dp, 0)
            }
        }

        val textLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
            )
        }

        val title = TextView(this).apply {
            text = "Browse Custom Songs"
            textSize = 16f
            setTextColor(colorOnPrimaryContainer)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }

        val subtitle = TextView(this).apply {
            text = "Choose from your music library"
            textSize = 14f
            setTextColor(colorOnPrimaryContainer)
            alpha = 0.7f
        }

        textLayout.addView(title)
        textLayout.addView(subtitle)
        
        content.addView(icon)
        content.addView(textLayout)
        card.addView(content)

        return card
    }

    private fun createCustomSongCard(): View {
        val card = MaterialCardView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, 12.dp)
            }
            radius = 16.dp.toFloat()
            cardElevation = if (customSongUri == selectedUri) 4.dp.toFloat() else 1.dp.toFloat()
            setCardBackgroundColor(if (customSongUri == selectedUri) colorPrimaryContainer else colorSurfaceContainer)
            isClickable = true
            isFocusable = true
            setOnClickListener {
                stopCurrentRingtone()
                selectedUri = customSongUri
                
                try {
                    currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, customSongUri)
                    currentlyPlaying?.play()
                } catch (e: Exception) {
                    DebugLogger.log("Error playing custom song: ${e.message}")
                }
                recreate()
            }
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(20.dp, 20.dp, 20.dp, 20.dp)
            gravity = Gravity.CENTER_VERTICAL
        }

        val radioButton = RadioButton(this).apply {
            isChecked = customSongUri == selectedUri
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 12.dp, 0)
            }
            buttonTintList = android.content.res.ColorStateList.valueOf(colorPrimary)
        }

        val textView = TextView(this).apply {
            text = "🎵 ${customSongName}"
            textSize = 16f
            setTextColor(colorOnSurface)
            setTypeface(null, android.graphics.Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
            )
        }

        content.addView(radioButton)
        content.addView(textView)
        card.addView(content)

        return card
    }

    private fun createRingtoneCard(item: RingtoneItem): View {
        val card = MaterialCardView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, 8.dp)
            }
            radius = 12.dp.toFloat()
            cardElevation = if (item.uri == selectedUri) 3.dp.toFloat() else 1.dp.toFloat()
            setCardBackgroundColor(if (item.uri == selectedUri) colorPrimaryContainer else colorSurfaceContainer)
            strokeWidth = if (item.uri == selectedUri) 2.dp else 0
            strokeColor = colorPrimary
            isClickable = true
            isFocusable = true
            setOnClickListener {
                stopCurrentRingtone()
                selectedUri = item.uri
                
                try {
                    currentlyPlaying = RingtoneManager.getRingtone(this@RingtonePickerActivity, item.uri)
                    currentlyPlaying?.play()
                } catch (e: Exception) {
                    DebugLogger.log("Error playing ringtone preview: ${e.message}")
                }
                recreate()
            }
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setPadding(16.dp, 16.dp, 16.dp, 16.dp)
            gravity = Gravity.CENTER_VERTICAL
        }

        val radioButton = RadioButton(this).apply {
            isChecked = item.uri == selectedUri
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 12.dp, 0)
            }
            buttonTintList = android.content.res.ColorStateList.valueOf(colorPrimary)
        }

        val textView = TextView(this).apply {
            text = item.title
            textSize = 15f
            setTextColor(colorOnSurface)
            layoutParams = LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                1f
            )
        }

        content.addView(radioButton)
        content.addView(textView)
        card.addView(content)

        return card
    }

    private val Int.dp: Int
        get() = (this * resources.displayMetrics.density).toInt()

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
                    contentResolver.takePersistableUriPermission(
                        uri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                    
                    customSongUri = uri
                    customSongName = getFileName(uri)
                    selectedUri = uri
                    
                    DebugLogger.log("RingtonePickerActivity: Selected custom song: ${customSongName}")
                    
                    val prefs = getSharedPreferences("DoMinderSettings", Context.MODE_PRIVATE)
                    prefs.edit().putString("alarm_ringtone_uri", uri.toString()).apply()

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

    data class RingtoneItem(
        val title: String,
        val uri: Uri,
        val isDefault: Boolean
    )
}
```

### Part 2: Update Android Dependencies

Add Material Components to `android/app/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies ...
    
    // Material Design Components
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.cardview:cardview:1.0.0'
    implementation 'androidx.coordinatorlayout:coordinatorlayout:1.2.0'
}
```

### Part 3: Update Activity Theme

In `android/app/src/main/res/values/styles.xml`, ensure Material theme:

```xml
<resources>
    <style name="AppTheme" parent="Theme.MaterialComponents.Light.NoActionBar">
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="colorPrimary">#6750A4</item>
        <item name="colorPrimaryVariant">#21005D</item>
        <item name="colorOnPrimary">#FFFFFF</item>
        <item name="colorPrimaryContainer">#EADDFF</item>
        <item name="colorOnPrimaryContainer">#21005D</item>
        <item name="colorSurface">#FEF7FF</item>
        <item name="colorOnSurface">#1C1B1F</item>
    </style>
</resources>
```

---

## Design Specifications

### Color Palette (Material 3)
```kotlin
colorSurface = 0xFFFEF7FF          // Light purple-tinted surface
colorOnSurface = 0xFF1C1B1F        // Nearly black text
colorPrimary = 0xFF6750A4          // DoMinder purple
colorOnPrimary = 0xFFFFFFFF        // White text on primary
colorPrimaryContainer = 0xFFEADDFF // Light purple container
colorOnPrimaryContainer = 0xFF21005D // Dark purple text
colorSurfaceVariant = 0xFFE7E0EC  // Light gray-purple
colorOutline = 0xFF79747E          // Medium gray outline
colorSurfaceContainer = 0xFFF3EDF7 // Very light purple
```

### Typography
- **Headers**: 20sp, medium weight (500)
- **Section titles**: 12sp, bold, uppercase, 0.05 letter-spacing
- **Card titles**: 16sp, bold
- **Card subtitles**: 14sp, 70% opacity
- **Body text**: 15sp, regular

### Spacing
- **Card radius**: 12-16dp
- **Container padding**: 16-20dp
- **Card margins**: 8-12dp between cards
- **Button height**: 64dp
- **Button corner radius**: 100dp (fully rounded)

### Elevation
- **Selected card**: 3-4dp
- **Default card**: 1-2dp
- **Bottom bar**: 8dp
- **Toolbar**: 0dp (flat)

---

## Wiring Preservation Checklist

### ✅ Preserved Functionality:
1. **Ringtone selection** - Same intent extras and result handling
2. **Custom file picker** - Same ACTION_OPEN_DOCUMENT flow
3. **Persistable URI permissions** - Unchanged
4. **SharedPreferences** - Same keys and storage
5. **AlarmModule integration** - No changes to native module
6. **Activity lifecycle** - Same onActivityResult, onDestroy, onPause
7. **Ringtone playback** - Same RingtoneManager API usage

### ✅ No Breaking Changes:
- All method signatures remain the same
- All intent extras remain the same
- All SharedPreferences keys remain the same
- React Native bridge methods unchanged

---

## Testing Checklist

1. **Ringtone Selection**
   - [ ] Can select default alarm
   - [ ] Can select system ringtones
   - [ ] Can preview ringtones (plays on tap)
   - [ ] Selected ringtone is highlighted
   - [ ] OK button saves selection

2. **Custom Songs**
   - [ ] Browse button opens file picker
   - [ ] Can select custom audio file
   - [ ] Custom song appears in list
   - [ ] Custom song persists across reopens
   - [ ] Custom song plays as alarm

3. **UI/UX**
   - [ ] Material 3 design visible
   - [ ] Smooth animations
   - [ ] Proper elevation and shadows
   - [ ] Consistent with app theme
   - [ ] Back button works
   - [ ] Cancel button works

4. **Integration**
   - [ ] Settings page shows selected ringtone
   - [ ] High priority alarms use selected ringtone
   - [ ] No crashes on selection
   - [ ] No crashes on cancel

---

## Implementation Steps

1. **Backup current file**:
   ```bash
   cp android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/RingtonePickerActivity.kt RingtonePickerActivity.kt.backup
   ```

2. **Replace with new code**: Copy the modernized Kotlin code above

3. **Update dependencies**: Add Material Components to build.gradle

4. **Update styles**: Ensure Material theme in styles.xml

5. **Rebuild app**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx expo run:android
   ```

6. **Test thoroughly**: Follow testing checklist above

---

## Screenshots Reference

### Before (Current):
- Flat white background
- Basic buttons with no elevation
- Programmatic views with minimal styling
- No visual hierarchy

### After (Material 3):
- Light purple-tinted surface (#FEF7FF)
- MaterialCardView with elevation and rounded corners
- Clear visual hierarchy with containers
- Interactive states (pressed, selected)
- Consistent with DoMinder brand colors
- Modern MaterialToolbar with back navigation

---

## Notes

- The alarm screen (app/alarm.tsx) is already using Material 3 design and doesn't need changes
- All native code changes are localized to RingtonePickerActivity.kt
- No changes to React Native bridge or JavaScript code
- The activity_alarm.xml is not used (AlarmActivity.kt redirects to MainActivity)
- All wiring remains 100% intact - only UI components upgraded

---

## Support

If you encounter issues:
1. Check Android logs: `adb logcat | grep RingtonePickerActivity`
2. Verify Material Components dependency is added
3. Ensure Kotlin version is compatible (1.9.0+)
4. Clean and rebuild the project
5. Check SharedPreferences for saved ringtone URI
