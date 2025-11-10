const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// Ensure the main activity uses adjustResize for smooth keyboard animations
module.exports = function withSoftInputMode(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(manifest);

    if (!mainActivity.$) mainActivity.$ = {};
    const current = mainActivity.$['android:windowSoftInputMode'];
    if (current !== 'adjustResize') {
      mainActivity.$['android:windowSoftInputMode'] = 'adjustResize';
      console.log('✅ Set android:windowSoftInputMode=adjustResize on MainActivity');
    } else {
      console.log('ℹ️ android:windowSoftInputMode already set to adjustResize');
    }

    return cfg;
  });
};
