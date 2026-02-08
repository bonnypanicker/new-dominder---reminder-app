const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const { resolve } = require('path');
const fs = require('fs');

/**
 * Plugin to style RingtonePickerActivity with seamless status bar
 * and remove scroll bars
 */

// Add custom theme to styles.xml
function withCustomRingtonePickerTheme(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const stylesPath = resolve(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/res/values/styles.xml'
      );

      try {
        let stylesXml = '';
        
        if (fs.existsSync(stylesPath)) {
          stylesXml = fs.readFileSync(stylesPath, 'utf-8');
        } else {
          // Create basic styles.xml if it doesn't exist
          stylesXml = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>';
        }

        // Check if our custom theme already exists
        if (!stylesXml.includes('Theme.RingtonePicker')) {
          // Add custom theme with seamless status bar and no scroll bars
          const customTheme = `
    <!-- Custom theme for RingtonePickerActivity with seamless status bar -->
    <style name="Theme.RingtonePicker" parent="Theme.Material3.DayNight.NoActionBar">
        <item name="android:windowDrawsSystemBarBackgrounds">true</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        
        <!-- Remove scroll bars globally for this activity -->
        <item name="android:scrollbars">none</item>
        <item name="android:fadeScrollbars">false</item>
        <item name="android:scrollbarSize">0dp</item>
        <item name="android:scrollbarStyle">outsideOverlay</item>
        <item name="android:scrollbarAlwaysDrawVerticalTrack">false</item>
        <item name="android:scrollbarAlwaysDrawHorizontalTrack">false</item>
        
        <!-- Ensure content extends into status bar area -->
        <item name="android:fitsSystemWindows">false</item>
    </style>`;

          // Insert before closing </resources> tag
          stylesXml = stylesXml.replace('</resources>', `${customTheme}\n</resources>`);
          
          fs.writeFileSync(stylesPath, stylesXml, 'utf-8');
          console.log('✅ Added custom RingtonePicker theme to styles.xml');
        } else {
          console.log('✅ Theme.RingtonePicker already exists in styles.xml');
        }
      } catch (error) {
        console.warn('⚠️  Could not modify styles.xml:', error.message);
      }

      return cfg;
    },
  ]);
}

// Update manifest to use custom theme
function withRingtonePickerManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // Find RingtonePickerActivity
    const ringtoneActivity = (app.activity || []).find(
      a => a['$']['android:name']?.endsWith('.RingtonePickerActivity')
    );

    if (ringtoneActivity) {
      if (!ringtoneActivity.$) ringtoneActivity.$ = {};
      
      // Apply custom theme
      ringtoneActivity.$['android:theme'] = '@style/Theme.RingtonePicker';
      
      console.log('✅ Applied Theme.RingtonePicker to RingtonePickerActivity');
    } else {
      console.warn('⚠️  RingtonePickerActivity not found in manifest');
    }

    return cfg;
  });
}

// Compose modification
module.exports = (config) => {
  config = withCustomRingtonePickerTheme(config);
  // Manifest update is now handled by with-alarm-module.js directly
  return config;
};
