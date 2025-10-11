const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Enables full-screen alarm behaviour:
 * - Sets showWhenLocked/turnScreenOn on MainActivity
 * - Adds USE_FULL_SCREEN_INTENT and WAKE_LOCK permissions
 */
module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const main = (app.activity || []).find(a => a['$']['android:name']?.endsWith('.MainActivity'));
    if (main) {
      main['$']['android:showWhenLocked'] = 'true';
      main['$']['android:turnScreenOn'] = 'true';
      main['$']['android:excludeFromRecents'] = 'true';
      main['$']['android:taskAffinity'] = '';
    }
    const perms = manifest.manifest['uses-permission'] ?? [];
    const hasFullScreenIntent = perms.find(p => p.$['android:name'] === 'android.permission.USE_FULL_SCREEN_INTENT');
    if (!hasFullScreenIntent) {
      perms.push({ $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' } });
    }
    const hasWakeLock = perms.find(p => p.$['android:name'] === 'android.permission.WAKE_LOCK');
    if (!hasWakeLock) {
      perms.push({ $: { 'android:name': 'android.permission.WAKE_LOCK' } });
    }
    manifest.manifest['uses-permission'] = perms;
    return cfg;
  });