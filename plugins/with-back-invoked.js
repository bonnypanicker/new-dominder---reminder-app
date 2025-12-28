const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// Ensures android:enableOnBackInvokedCallback="false" on the <application> tag
// This is required for React Native's BackHandler and Modal onRequestClose to work properly
// with the back gesture on Android 13+. Setting to "true" requires explicit OnBackInvokedCallback
// registration which React Native's Modal doesn't support well.
module.exports = function withBackInvoked(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (!app.$) app.$ = {};
    // Set to false to use legacy back handling which works with React Native
    if (app.$['android:enableOnBackInvokedCallback'] !== 'false') {
      app.$['android:enableOnBackInvokedCallback'] = 'false';
      console.log('✅ Set android:enableOnBackInvokedCallback=false on <application> for RN compatibility');
    } else {
      console.log('ℹ️ android:enableOnBackInvokedCallback already false');
    }

    return cfg;
  });
};
