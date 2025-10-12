const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // Ensure MainActivity wake flags
    const main = (app.activity || []).find(a => a['$']['android:name']?.endsWith('.MainActivity'));
    if (main) {
      main['$']['android:showWhenLocked'] = 'true';
      main['$']['android:turnScreenOn'] = 'true';
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