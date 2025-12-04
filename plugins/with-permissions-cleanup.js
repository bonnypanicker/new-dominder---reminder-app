const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to remove unnecessary permissions from AndroidManifest.xml
 * This ensures permissions stay removed even after prebuild
 */
const withPermissionsCleanup = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // List of permissions to remove (not needed for reminder/alarm app)
    const permissionsToRemove = [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.ACCESS_MEDIA_LOCATION',
      'android.permission.INTERNET',
    ];

    // Remove unwanted permissions
    if (androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = androidManifest['uses-permission'].filter(
        (permission) => {
          const permName = permission.$['android:name'];
          const shouldRemove = permissionsToRemove.includes(permName);
          
          if (shouldRemove) {
            console.log(`🗑️  Removing unnecessary permission: ${permName}`);
          }
          
          return !shouldRemove;
        }
      );
    }

    // Log remaining permissions for verification
    console.log('✅ Remaining permissions after cleanup:');
    if (androidManifest['uses-permission']) {
      androidManifest['uses-permission'].forEach((permission) => {
        console.log(`   - ${permission.$['android:name']}`);
      });
    }

    return config;
  });
};

module.exports = withPermissionsCleanup;