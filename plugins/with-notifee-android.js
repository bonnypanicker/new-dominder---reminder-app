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
    
    // Add multiDexEnabled to defaultConfig
    if (!buildGradle.includes('multiDexEnabled true')) {
      const defaultConfigRegex = /(defaultConfig\s*{[^}]*)/;
      if (defaultConfigRegex.test(buildGradle)) {
        config.modResults.contents = buildGradle.replace(
          defaultConfigRegex,
          '$1\n        multiDexEnabled true'
        );
        console.log('✅ Added multiDexEnabled to defaultConfig');
      }
    }
    
    // Add multidex dependency
    if (!buildGradle.includes('androidx.multidex:multidex')) {
      // Find the dependencies block and add multidex at the end
      const lines = buildGradle.split('\n');
      let dependenciesStart = -1;
      let dependenciesEnd = -1;
      let braceCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('dependencies {')) {
          dependenciesStart = i;
          braceCount = 1;
          continue;
        }
        
        if (dependenciesStart !== -1) {
          const openBraces = (lines[i].match(/\{/g) || []).length;
          const closeBraces = (lines[i].match(/\}/g) || []).length;
          braceCount += openBraces - closeBraces;
          
          if (braceCount === 0) {
            dependenciesEnd = i;
            break;
          }
        }
      }
      
      if (dependenciesStart !== -1 && dependenciesEnd !== -1) {
        lines.splice(dependenciesEnd, 0, "    implementation 'androidx.multidex:multidex:2.0.1'");
        config.modResults.contents = lines.join('\n');
        console.log('✅ Added multidex dependency');
      }
    }
    
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