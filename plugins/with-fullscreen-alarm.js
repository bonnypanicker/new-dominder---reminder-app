const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // MainActivity should NOT have showWhenLocked/turnScreenOn
    // Only AlarmActivity should have these flags to appear over lock screen
    const main = (app.activity || []).find(a => a['$']['android:name']?.endsWith('.MainActivity'));
    if (main) {
      // Remove these flags if they exist
      delete main['$']['android:showWhenLocked'];
      delete main['$']['android:turnScreenOn'];
    }

    // Configure AlarmActivity with lock screen bypass flags
    const alarmActivity = (app.activity || []).find(a => a['$']['android:name']?.endsWith('.AlarmActivity'));
    if (alarmActivity) {
      // Ensure necessary flags are set for reliable lock screen bypass
      // Note: dismissKeyguard and showForAllUsers must be set programmatically in the activity code
      alarmActivity['$']['android:showWhenLocked'] = 'true';
      alarmActivity['$']['android:turnScreenOn'] = 'true';
      alarmActivity['$']['android:excludeFromRecents'] = 'true';
      alarmActivity['$']['android:launchMode'] = 'singleTask';
    }

    // Ensure permission USE_FULL_SCREEN_INTENT
    const perms = manifest.manifest['uses-permission'] ?? [];
    const has = perms.find(p => p.$['android:name'] === 'android.permission.USE_FULL_SCREEN_INTENT');
    if (!has) {
      perms.push({ $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' } });
      manifest.manifest['uses-permission'] = perms;
    }
    return cfg;
  });
