const { withDangerousMod, withMainActivity } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withSplashDarkMode(config) {
  config = withMainActivity(config, (cfg) => {
    let contents = cfg.modResults.contents;
    const newline = contents.includes('\r\n') ? '\r\n' : '\n';

    if (!contents.includes('AppCompatDelegate')) {
      contents = contents.replace(
        /import androidx\.core\.view\.WindowCompat\r?\n/,
        `import androidx.core.view.WindowCompat${newline}import androidx.appcompat.app.AppCompatDelegate${newline}`
      );
    }

    if (!contents.includes('AppCompatDelegate.setDefaultNightMode')) {
      contents = contents.replace(
        /override fun onCreate\(([^)]*)\)\s*\{\r?\n/,
        `override fun onCreate($1) {${newline}    val prefs = getSharedPreferences("DoMinderSettings", MODE_PRIVATE)${newline}    val darkMode = prefs.getBoolean("darkMode", false)${newline}    AppCompatDelegate.setDefaultNightMode(if (darkMode) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO)${newline}`
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });

  return withDangerousMod(config, ['android', async (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
    const valuesNightDir = path.join(resDir, 'values-night');
    const drawableNightDir = path.join(resDir, 'drawable-night');
    const manifestPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

    try {
      if (!fs.existsSync(valuesNightDir)) {
        fs.mkdirSync(valuesNightDir, { recursive: true });
      }
      if (!fs.existsSync(drawableNightDir)) {
        fs.mkdirSync(drawableNightDir, { recursive: true });
      }

      const nightColorsPath = path.join(valuesNightDir, 'colors.xml');
      const nightColorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="splashscreen_background">#10131C</color>
  <color name="iconBackground">#10131C</color>
  <color name="colorPrimary">#023c69</color>
  <color name="colorPrimaryDark">#000000</color>
</resources>
`;
      fs.writeFileSync(nightColorsPath, nightColorsXml);

      const densityCandidates = [
        path.join(resDir, 'drawable-xxxhdpi', 'splashscreen_logo.png'),
        path.join(resDir, 'drawable-xxhdpi', 'splashscreen_logo.png'),
        path.join(resDir, 'drawable-xhdpi', 'splashscreen_logo.png'),
        path.join(resDir, 'drawable-hdpi', 'splashscreen_logo.png'),
        path.join(resDir, 'drawable-mdpi', 'splashscreen_logo.png')
      ];
      const sourceLogo = densityCandidates.find((candidate) => fs.existsSync(candidate));
      if (sourceLogo) {
        const nightLogoPath = path.join(drawableNightDir, 'splashscreen_logo.png');
        fs.copyFileSync(sourceLogo, nightLogoPath);
      }

      if (fs.existsSync(manifestPath)) {
        let manifestXml = fs.readFileSync(manifestPath, 'utf8');
        if (!manifestXml.includes('android:theme="@style/Theme.App.SplashScreen"')) {
          manifestXml = manifestXml.replace(
            /<activity\s+android:name="\.MainActivity"([\s\S]*?)>/,
            '<activity android:name=".MainActivity"$1 android:theme="@style/Theme.App.SplashScreen">'
          );
          fs.writeFileSync(manifestPath, manifestXml);
        }
      }

    } catch (e) {
      console.warn('Failed to configure splash dark mode via plugin:', e);
    }

    return cfg;
  }]);
};
