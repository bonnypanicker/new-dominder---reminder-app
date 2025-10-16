// plugins/with-alarm-module.js
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require(' @expo/config-plugins');

function copyTemplateFile(projectRoot, relativeSrc, targetPath) {
  const src = path.join(projectRoot, 'plugins', 'templates', relativeSrc);
  if (!fs.existsSync(src)) throw new Error(`Missing template: ${src}`);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(src, targetPath);
  console.log('✅ Copied', targetPath);
}

module.exports = function withAlarmModule(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidAppRoot = path.join(config.modRequest.projectRoot, 'android/app/src/main/java/app/rork/dominder_android_reminder_app');

      // Copy all required Kotlin files from /plugins/templates/android/alarm/
      copyTemplateFile(config.modRequest.projectRoot, 'android/alarm/AlarmActivity.kt', path.join(androidAppRoot, 'alarm/AlarmActivity.kt'));
      copyTemplateFile(config.modRequest.projectRoot, 'android/alarm/AlarmModule.kt', path.join(androidAppRoot, 'alarm/AlarmModule.kt'));
      copyTemplateFile(config.modRequest.projectRoot, 'android/alarm/AlarmPackage.kt', path.join(androidAppRoot, 'alarm/AlarmPackage.kt'));

      // Patch MainActivity.kt only if missing handleAlarmIntent
      const mainActivityPath = path.join(androidAppRoot, 'MainActivity.kt');
      let content = fs.readFileSync(mainActivityPath, 'utf8');
      if (!content.includes('handleAlarmIntent')) {
        content = content.replace(
          /class\s+MainActivity\s*:\s*ReactActivity\s*{/,
          `class MainActivity : ReactActivity() {
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleAlarmIntent(intent)
    }

    private fun handleAlarmIntent(intent: Intent?) {
        val reminderId = intent?.getStringExtra("reminderId")
        if (reminderId != null) {
            android.util.Log.d("Dominder-Debug", "MainActivity received alarm intent for reminderId=$reminderId")
        }
    }`
        );
        fs.writeFileSync(mainActivityPath, content, 'utf8');
        console.log('✅ Patched MainActivity.kt with handleAlarmIntent');
      }
      return config;
    },
  ]);
};