const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Enables full-screen alarm behaviour:
 * - Sets showWhenLocked/turnScreenOn on MainActivity
 * - Adds USE_FULL_SCREEN_INTENT permission
 */
module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const main = (app.activity || []).find(a => a['$']['android:name']?.endsWith('.MainActivity'));
    if (main) {
      main['$']['android:showWhenLocked'] = 'true';
      main['$']['android:turnScreenOn'] = 'true';
    }
    const perms = manifest.manifest['uses-permission'] ?? [];
    const has = perms.find(p => p.$['android:name'] === 'android.permission.USE_FULL_SCREEN_INTENT');
    if (!has) {
      perms.push({ $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' } });
      manifest.manifest['uses-permission'] = perms;
    }
    return cfg;
  });