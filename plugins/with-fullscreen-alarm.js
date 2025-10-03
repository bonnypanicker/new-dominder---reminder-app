const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Enables full-screen alarm behaviour on Android by:
 * - Setting showWhenLocked / turnScreenOn on MainActivity
 * - Adding USE_FULL_SCREEN_INTENT permission
 */
const withFullScreenAlarm = (config) => {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // Find MainActivity
    const mainActivity = (app.activity || []).find(
      (a) => a['$']['android:name']?.endsWith('.MainActivity')
    );

    if (mainActivity) {
      mainActivity['$']['android:showWhenLocked'] = 'true';
      mainActivity['$']['android:turnScreenOn'] = 'true';
    }

    const perms = manifest.manifest['uses-permission'] ?? [];
    const has = perms.find(
      (p) => p.$['android:name'] === 'android.permission.USE_FULL_SCREEN_INTENT'
    );
    if (!has) {
      perms.push({ $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' } });
      manifest.manifest['uses-permission'] = perms;
    }

    return cfg;
  });
};

module.exports = withFullScreenAlarm;
