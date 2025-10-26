const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withOrientation(config) {
  return withAndroidManifest(config, async (config) => {
    const app = config.modResults.manifest.application?.[0];
    const activities = app.activity || [];

    // Find MainActivity and update its orientation
    const mainActivity = activities.find(a => 
      a.$['android:name']?.includes('.MainActivity')
    );

    if (mainActivity) {
      // Remove the portrait restriction to allow landscape
      if (mainActivity.$['android:screenOrientation']) {
        delete mainActivity.$['android:screenOrientation'];
      }
      
      console.log('✅ MainActivity orientation restriction removed - landscape enabled');
    } else {
      console.log('⚠️ MainActivity not found in manifest');
    }

    return config;
  });
};