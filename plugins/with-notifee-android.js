const { withAppBuildGradle, withProjectBuildGradle, withGradleProperties } = require('@expo/config-plugins');

module.exports = function withNotifeeAndroid(config) {
  // Update project build.gradle
  config = withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    
    // Update Android Gradle Plugin version
    if (buildGradle.includes("classpath('com.android.tools.build:gradle')")) {
      config.modResults.contents = buildGradle.replace(
        "classpath('com.android.tools.build:gradle')",
        "classpath('com.android.tools.build:gradle:8.1.4')"
      );
      console.log('✅ Updated Android Gradle Plugin version to 8.1.4');
    }
    
    return config;
  });

  // Update app build.gradle
  config = withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    
    // Multidex disabled for build compatibility
    // Removed multiDexEnabled and multidex dependency to prevent build issues
    
    return config;
  });

  // Update gradle.properties
  config = withGradleProperties(config, (config) => {
    const properties = config.modResults;
    
    // Add Android build optimizations for EAS
    const notifeeProperties = {
      'android.enableJetifier': 'true',
      'android.enableR8.fullMode': 'false'
    };
    
    Object.entries(notifeeProperties).forEach(([key, value]) => {
      if (!properties.some(prop => prop.key === key)) {
        properties.push({
          type: 'property',
          key,
          value
        });
        console.log(`✅ Added ${key}=${value} to gradle.properties`);
      }
    });
    
    return config;
  });

  return config;
};