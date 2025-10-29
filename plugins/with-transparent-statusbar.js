const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Ensures the Android status bar is fully transparent and doesn't draw a contrast scrim.
 * Uses a dangerous mod to patch styles.xml on prebuild so changes persist.
 */
module.exports = function withTransparentStatusBar(config) {
  return withDangerousMod(config, ['android', async (cfg) => {
    const stylesPath = path.join(
      cfg.modRequest.projectRoot,
      'android',
      'app',
      'src',
      'main',
      'res',
      'values',
      'styles.xml'
    );

    try {
      let xml = fs.readFileSync(stylesPath, 'utf8');

      // Replace existing statusBarColor if present
      if (xml.includes('android:statusBarColor')) {
        xml = xml.replace(
          /<item\s+name="android:statusBarColor"[^>]*>[^<]*<\/item>/g,
          '<item name="android:statusBarColor">@android:color/transparent</item>'
        );
      } else {
        // Insert statusBarColor inside AppTheme - try multiple insertion points
        if (xml.includes('<item name="colorPrimary">')) {
          xml = xml.replace(
            /(<style\s+name="AppTheme"[\s\S]*?<item\s+name="colorPrimary">[^<]*<\/item>)/,
            '$1\n    <item name="android:statusBarColor">@android:color/transparent</item>'
          );
        } else {
          // Fallback: insert after AppTheme opening tag
          xml = xml.replace(
            /(<style\s+name="AppTheme"[^>]*>)/,
            '$1\n    <item name="android:statusBarColor">@android:color/transparent</item>'
          );
        }
      }

      // Remove statusBarContrastEnforced from main styles.xml if present (API compatibility)
      if (xml.includes('android:statusBarContrastEnforced')) {
        xml = xml.replace(
          /<item\s+name="android:statusBarContrastEnforced"[^>]*>[^<]*<\/item>\s*/g,
          ''
        );
        console.log('✅ Removed statusBarContrastEnforced from main styles.xml for API compatibility.');
      }

      // Create API 35+ specific styles directory and file for statusBarContrastEnforced
      const valuesV35Dir = path.join(
        cfg.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
        'values-v35'
      );
      
      if (!fs.existsSync(valuesV35Dir)) {
        fs.mkdirSync(valuesV35Dir, { recursive: true });
      }
      
      const stylesV35Path = path.join(valuesV35Dir, 'styles.xml');
      
      // Read the main styles.xml to extract the complete AppTheme and other styles
      const appThemeMatch = xml.match(/<style\s+name="AppTheme"[\s\S]*?<\/style>/);
      const splashThemeMatch = xml.match(/<style\s+name="Theme\.App\.SplashScreen"[\s\S]*?<\/style>/);
      
      let appThemeContent = '';
      if (appThemeMatch) {
        // Add statusBarContrastEnforced to the AppTheme for API 35+
        appThemeContent = appThemeMatch[0].replace(
          /(<\/style>)/,
          '    <item name="android:statusBarContrastEnforced" tools:targetApi="35">false</item>\n  $1'
        );
      }
      
      let splashThemeContent = splashThemeMatch ? splashThemeMatch[0] : '';
      
      // Create complete API 35+ specific styles with statusBarContrastEnforced
      const stylesV35Content = `<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools">
  ${appThemeContent}
  ${splashThemeContent}
</resources>`;
      
      fs.writeFileSync(stylesV35Path, stylesV35Content);
      console.log('✅ Created values-v35/styles.xml for API 35+ status bar contrast enforcement.');

      fs.writeFileSync(stylesPath, xml);
      console.log('✅ Patched styles.xml for transparent status bar (no contrast scrim).');
    } catch (e) {
      console.warn('⚠️ Failed to patch styles.xml for status bar:', e);
    }

    return cfg;
  }]);
};

