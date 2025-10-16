const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAlarmManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const app = config.modResults.manifest.application?.[0];
    const activities = app.activity || [];

    // Add AlarmActivity if missing
    if (!activities.some(a => a.$['android:name']?.includes('.alarm.AlarmActivity'))) {
      activities.push({
        $: {
          'android:name': '.alarm.AlarmActivity',
          'android:exported': 'true',
          'android:showWhenLocked': 'true',
          'android:turnScreenOn': 'true',
          'android:excludeFromRecents': 'true',
          'android:launchMode': 'singleTop',
          'android:theme': ' @style/Theme.AppCompat.NoActionBar'
        }
      });
    }

    // Add full screen intent permissions
    config.modResults.manifest['uses-permission'] = [
      ...(config.modResults.manifest['uses-permission'] || []),
      { $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' } },
      { $: { 'android:name': 'android.permission.POST_NOTIFICATIONS' } },
      { $: { 'android:name': 'android.permission.SCHEDULE_EXACT_ALARM' } }
    ];

    console.log('✅ AlarmActivity + permissions injected into manifest');
    return config;
  });
};
