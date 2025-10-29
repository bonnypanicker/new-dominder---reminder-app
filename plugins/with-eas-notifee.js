const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withEasNotifee(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const easJsonPath = path.join(config.modRequest.projectRoot, 'eas.json');
      
      if (fs.existsSync(easJsonPath)) {
        const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
        
        // Add gradleCommand to production build if not present
        if (easConfig.build?.production?.android && !easConfig.build.production.android.gradleCommand) {
          easConfig.build.production.android.gradleCommand = ':app:assembleRelease';
          console.log('✅ Added gradleCommand to production build');
        }
        
        // Add gradleCommand to preview build if not present
        if (easConfig.build?.preview?.android && !easConfig.build.preview.android.gradleCommand) {
          easConfig.build.preview.android.gradleCommand = ':app:assembleRelease';
          console.log('✅ Added gradleCommand to preview build');
        }
        
        fs.writeFileSync(easJsonPath, JSON.stringify(easConfig, null, 2));
        console.log('✅ Updated eas.json for Notifee compatibility');
      }
      
      return config;
    },
  ]);
};