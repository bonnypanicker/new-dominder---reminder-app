const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// Ensure the main activity uses adjustPan to keep FAB fixed at bottom when keyboard opens
module.exports = function withSoftInputMode(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);

    if (!mainActivity.$) mainActivity.$ = {};
    const current = mainActivity.$['android:windowSoftInputMode'];
    if (current !== 'adjustPan') {
      mainActivity.$['android:windowSoftInputMode'] = 'adjustPan';
      console.log('✅ Set android:windowSoftInputMode=adjustPan on MainActivity');
    } else {
      console.log('ℹ️ android:windowSoftInputMode already set to adjustPan');
    }

    return cfg;
  });
};
