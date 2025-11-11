# Permissions Cleanup Plugin

## Purpose
The `with-permissions-cleanup.js` plugin ensures that unnecessary permissions are removed from the AndroidManifest.xml file during the Expo prebuild process.

## Why This Plugin Exists
When using Expo and various npm packages, many dependencies automatically add permissions to your AndroidManifest.xml. Some of these permissions may be:
- Not needed for your app's functionality
- Privacy-invasive
- Causing Google Play Store review issues

This plugin runs during `npx expo prebuild` and removes unwanted permissions automatically.

## How It Works
1. The plugin is registered in `app.json` under the `plugins` array
2. During prebuild, it scans the generated AndroidManifest.xml
3. It removes any permissions listed in the `permissionsToRemove` array
4. It logs which permissions were removed and which remain

## Permissions Removed
The following permissions are automatically removed as they are not needed for a reminder/alarm app:
- `android.permission.ACCESS_COARSE_LOCATION`
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.INTERNET`
- `android.permission.READ_EXTERNAL_STORAGE`
- `android.permission.RECORD_AUDIO`
- `android.permission.WRITE_EXTERNAL_STORAGE`
- `android.permission.CAMERA`
- `android.permission.READ_MEDIA_IMAGES`
- `android.permission.READ_MEDIA_VIDEO`
- `android.permission.READ_MEDIA_AUDIO`
- `android.permission.ACCESS_MEDIA_LOCATION`

## Permissions Kept
The following 9 permissions are kept as they are essential for alarm/reminder functionality:
- `android.permission.FOREGROUND_SERVICE` - Run alarm ringtone service
- `android.permission.MODIFY_AUDIO_SETTINGS` - Control alarm volume
- `android.permission.POST_NOTIFICATIONS` - Send reminder notifications
- `android.permission.RECEIVE_BOOT_COMPLETED` - Reschedule alarms after reboot
- `android.permission.SCHEDULE_EXACT_ALARM` - Schedule exact time reminders
- `android.permission.SYSTEM_ALERT_WINDOW` - Show full-screen alarm window
- `android.permission.USE_FULL_SCREEN_INTENT` - Full-screen alarm notifications
- `android.permission.VIBRATE` - Vibrate for alarms
- `android.permission.WAKE_LOCK` - Wake device for alarms

## Usage

### Running Prebuild
```bash
npx expo prebuild --clean
```

The plugin will automatically run and you'll see output like:
```
🗑️  Removing unnecessary permission: android.permission.ACCESS_FINE_LOCATION
🗑️  Removing unnecessary permission: android.permission.RECORD_AUDIO
✅ Remaining permissions after cleanup:
   - android.permission.VIBRATE
   - android.permission.SCHEDULE_EXACT_ALARM
   ...
```

### Verifying Permissions
After prebuild, check the generated manifest:
```bash
cat android/app/src/main/AndroidManifest.xml
```

## Modifying the Plugin
To add or remove permissions from the cleanup list:

1. Edit `plugins/with-permissions-cleanup.js`
2. Modify the `permissionsToRemove` array
3. Run `npx expo prebuild --clean` to regenerate

## Important Notes
- ✅ This plugin preserves changes across prebuild
- ✅ Changes persist even after updating Expo or dependencies
- ✅ Plugin is version-controlled with your app
- ⚠️ Don't manually edit AndroidManifest.xml - use this plugin instead
- ⚠️ After adding new dependencies, run prebuild and verify permissions

## Google Play Store Compliance
This plugin helps ensure your app passes Google Play Store review by:
- Removing privacy-invasive permissions
- Keeping only justified, necessary permissions
- Providing a clear permission purpose for reviewers
- Reducing manual review triggers

## Testing
To verify the plugin works correctly:
1. Run `npx expo prebuild --clean`
2. Check the console output for removed permissions
3. Verify `android/app/src/main/AndroidManifest.xml` only has 9 permissions
4. Build and test the app to ensure all features work

## Troubleshooting
**Problem:** Unwanted permissions still appear after prebuild  
**Solution:** Ensure the plugin is listed in `app.json` plugins array

**Problem:** Plugin not running  
**Solution:** Run with `--clean` flag: `npx expo prebuild --clean`

**Problem:** App features broken after permission removal  
**Solution:** Check if a required permission was removed and add it to the kept list
