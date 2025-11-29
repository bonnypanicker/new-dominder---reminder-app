const { withAndroidManifest, withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');

/**
 * Plugin to style RingtonePickerActivity with seamless status bar
 * and remove scroll bars
 */

// Add custom theme to styles.xml using the proper mod system
function withCustomRingtonePickerTheme(config) {
  return withAndroidStyles(config, (cfg) => {
    // Get the styles resources object
    const styles = cfg.modResults;
    
    // Ensure resources.style exists as an array
    if (!styles.resources) {
      styles.resources = {};
    }
    if (!styles.resources.style) {
      styles.resources.style = [];
    }
    
    // Check if Theme.RingtonePicker already exists
    const existingTheme = styles.resources.style.find(
      s => s.$ && s.$.name === 'Theme.RingtonePicker'
    );
    
    if (!existingTheme) {
      // Add the custom theme for RingtonePickerActivity
      styles.resources.style.push({
        $: {
          name: 'Theme.RingtonePicker',
          parent: 'Theme.AppCompat.Light.NoActionBar'
        },
        item: [
          {
            $: { name: 'android:statusBarColor' },
            _: '@android:color/transparent'
          },
          {
            $: { name: 'android:windowDrawsSystemBarBackgrounds' },
            _: 'true'
          },
          {
            $: { name: 'android:windowLightStatusBar' },
            _: 'true'
          },
          {
            $: { name: 'android:fitsSystemWindows' },
            _: 'false'
          }
        ]
      });
      
      console.log('✅ Added custom RingtonePicker theme to styles.xml');
    }

    return cfg;
  });
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

// Compose both modifications
module.exports = (config) => {
  config = withCustomRingtonePickerTheme(config);
  config = withRingtonePickerManifest(config);
  return config;
};
