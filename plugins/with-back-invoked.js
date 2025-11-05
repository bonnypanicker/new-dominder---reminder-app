const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// Ensures android:enableOnBackInvokedCallback="true" on the <application> tag
module.exports = function withBackInvoked(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (!app.$) app.$ = {};
    if (app.$['android:enableOnBackInvokedCallback'] !== 'true') {
      app.$['android:enableOnBackInvokedCallback'] = 'true';
      console.log('✅ Set android:enableOnBackInvokedCallback=true on <application>');
    } else {
      console.log('ℹ️ android:enableOnBackInvokedCallback already true');
    }

    return cfg;
  });
};
