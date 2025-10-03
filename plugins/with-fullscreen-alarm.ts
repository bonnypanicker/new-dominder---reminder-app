import { AndroidConfig, ConfigPlugin, withAndroidManifest } from '@expo/config-plugins';

const withFullScreenAlarm: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    config.modResults = setFullScreenAlarm(config.modResults);
    return config;
  });
};

function setFullScreenAlarm(androidManifest: AndroidConfig.AndroidManifest) {
  const application = androidManifest.manifest.application?.[0];
  if (application) {
    // Add USE_FULL_SCREEN_INTENT permission
    androidManifest.manifest.permissions?.push({
      $: {
        'android:name': 'android.permission.USE_FULL_SCREEN_INTENT',
      },
    });

    // Set launchMode to singleInstance for the main activity
    const mainActivity = AndroidConfig.Manifest.get = (
      'activity',
      androidManifest,
      'android.intent.action.MAIN'
    );

    if (mainActivity?.['android:name']) {
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
      // Ensure launchMode is singleInstance for proper full-screen intent handling
      mainActivity.$['android:launchMode'] = 'singleInstance';
    }
  }
  return androidManifest;
}

export default withFullScreenAlarm;
