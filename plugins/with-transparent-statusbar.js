const { withAndroidStyles, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TRANSPARENT = '@android:color/transparent';
const BAR_COLORS = ['android:statusBarColor', 'android:navigationBarColor'];
const CONTRAST_ITEMS = [
  'android:statusBarContrastEnforced',
  'android:enforceStatusBarContrast',
  'android:enforceNavigationBarContrast',
];

const findAppTheme = (styles) =>
  (styles.resources.style || []).find((s) => s.$ && s.$.name === 'AppTheme');

const setItem = (style, name, value) => {
  if (!style.item) style.item = [];
  const found = style.item.find((i) => i.$ && i.$.name === name);
  if (found) found._ = value;
  else style.item.push({ $: { name }, _: value });
};

const removeItem = (style, name) => {
  if (!style.item) return;
  style.item = style.item.filter((i) => i.$ && i.$.name !== name);
};

// App surface colours (mirror constants/colors.ts) so the window background —
// visible in the status-bar space during cold start, before React renders, and
// behind translucent bars — matches the app's own background in both themes.
const LIGHT_SURFACE = '#FFFBFE';
const DARK_SURFACE = '#10131C';

/**
 * A complete AppTheme for a resource-qualified directory.
 *
 * `values-night` and `values-v29` replace AppTheme wholesale rather than
 * merging, so each variant must restate every item. The dangerous mod runs
 * before Expo's base mods flush styles.xml, so reading the file here would
 * capture a half-built theme.
 */
const appThemeXml = ({ lightStatusBar, contrast, windowBackground }) =>
  [
    '<style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">',
    '    <item name="android:editTextBackground">@drawable/rn_edit_text_material</item>',
    '    <item name="colorPrimary">@color/colorPrimary</item>',
    ...BAR_COLORS.map((n) => `    <item name="${n}">${TRANSPARENT}</item>`),
    `    <item name="android:windowLightStatusBar">${lightStatusBar}</item>`,
    // Seamless system bars: the window background matches the app surface so
    // the status-bar space blends into the app background in both themes.
    `    <item name="android:windowBackground">${windowBackground}</item>`,
    ...(contrast
      ? [
          '    <item name="android:enforceStatusBarContrast">false</item>',
          '    <item name="android:enforceNavigationBarContrast">false</item>',
        ]
      : []),
    '    <item name="android:windowActionBar">false</item>',
    '    <item name="android:windowNoTitle">true</item>',
    '  </style>',
  ].join('\n');

const writeStyles = (dir, themeXml) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'styles.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  ${themeXml}\n</resources>\n`
  );
};

/**
 * Makes the Android system bars transparent and adaptive.
 *
 * targetSdk 36 (Android 16) enforces edge-to-edge and ignores
 * `android:statusBarColor`, so the bars follow the theme window background
 * instead of the app's own colours. Making them transparent lets the app
 * background show through, and `windowLightStatusBar` keeps the icons legible
 * in both light and dark mode.
 *
 * Uses `withAndroidStyles` for the base theme: Expo's edge-to-edge pipeline
 * rewrites AppTheme from an in-memory copy, so a raw file write gets clobbered.
 */
module.exports = function withAdaptiveSystemBars(config) {
  config = withAndroidStyles(config, (cfg) => {
    const theme = findAppTheme(cfg.modResults);
    if (!theme) {
      console.warn('⚠️ AppTheme not found; system bars left untouched.');
      return cfg;
    }

    CONTRAST_ITEMS.forEach((name) => removeItem(theme, name));
    BAR_COLORS.forEach((name) => setItem(theme, name, TRANSPARENT));
    setItem(theme, 'android:windowLightStatusBar', 'true');
    // Light default; values-night overrides with the dark surface.
    setItem(theme, 'android:windowBackground', LIGHT_SURFACE);
    setItem(theme, 'android:windowActionBar', 'false');
    setItem(theme, 'android:windowNoTitle', 'true');

    return cfg;
  });

  return withDangerousMod(config, ['android', async (cfg) => {
    const resDir = path.join(
      cfg.modRequest.projectRoot,
      'android',
      'app',
      'src',
      'main',
      'res'
    );

    writeStyles(
      path.join(resDir, 'values-night'),
      appThemeXml({ lightStatusBar: 'false', contrast: false, windowBackground: DARK_SURFACE })
    );
    writeStyles(
      path.join(resDir, 'values-v29'),
      appThemeXml({ lightStatusBar: 'true', contrast: true, windowBackground: LIGHT_SURFACE })
    );
    // Android matches the night qualifier ahead of the version qualifier, so
    // the API 29+ dark case needs its own combination directory.
    writeStyles(
      path.join(resDir, 'values-night-v29'),
      appThemeXml({ lightStatusBar: 'false', contrast: true, windowBackground: DARK_SURFACE })
    );

    console.log('✅ Adaptive system bars: transparent colors + night/v29 variants.');
    return cfg;
  }]);
};