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
          /<item\s+name="android:statusBarColor">[^<]*<\/item>/,
          '<item name="android:statusBarColor">@android:color/transparent</item>'
        );
      } else {
        // Insert statusBarColor inside AppTheme after colorPrimary
        xml = xml.replace(
          /(<style\s+name="AppTheme"[\s\S]*?<item\s+name="colorPrimary">[^<]*<\/item>)/,
          '$1\n    <item name="android:statusBarColor">@android:color/transparent</item>'
        );
      }

      // Ensure contrast enforcement disabled to avoid subtle divider
      if (!xml.includes('android:statusBarContrastEnforced')) {
        xml = xml.replace(
          /(<style\s+name="AppTheme"[\s\S]*?<\/style>)/,
          (match) => match.replace(
            /<\/style>/,
            '    <item name="android:statusBarContrastEnforced">false</item>\n  </style>'
          )
        );
      }

      fs.writeFileSync(stylesPath, xml);
      console.log('✅ Patched styles.xml for transparent status bar (no contrast scrim).');
    } catch (e) {
      console.warn('⚠️ Failed to patch styles.xml for status bar:', e);
    }

    return cfg;
  }]);
};

