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

    // Ensure permission USE_FULL_SCREEN_INTENT
    const perms = manifest.manifest['uses-permission'] ?? [];
    const has = perms.find(p => p.$['android:name'] === 'android.permission.USE_FULL_SCREEN_INTENT');
    if (!has) {
      perms.push({ $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' } });
      manifest.manifest['uses-permission'] = perms;
    }
    return cfg;
  });
