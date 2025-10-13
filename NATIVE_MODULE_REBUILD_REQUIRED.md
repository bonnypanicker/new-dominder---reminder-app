# Native Module Rebuild Required

## Critical Issue Identified

**Error:** `Cannot read property 'scheduleAlarm' of null`

**Root Cause:** The `AlarmModule` native module is returning `null` because the app has not been rebuilt after the native Kotlin code was added.

## Why This Happens

1. Native modules (Kotlin/Java code) must be compiled into the Android APK
2. The JavaScript bundle is trying to access `NativeModules.AlarmModule`
3. Since the app wasn't rebuilt, the module doesn't exist in the runtime
4. Result: `AlarmModule` is `null`

## Solution

**You MUST rebuild the Android app to include the native module.**

### Steps to Rebuild:

1. **Stop the current app completely**
   ```bash
   # Kill the Metro bundler
   # Close the app on your device
   ```

2. **Clean the build**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

3. **Rebuild and run**
   ```bash
   npx expo run:android
   ```

   OR if using direct gradle:
   ```bash
   cd android
   ./gradlew assembleDebug
   ./gradlew installDebug
   cd ..
   ```

4. **Verify the module is loaded**
   - After rebuild, check the logs for: `[NotificationService] Scheduled native alarm for rem-...`
   - The error `Cannot read property 'scheduleAlarm' of null` should be gone

## What Was Fixed in the Code

I've added null checks to prevent crashes:

```typescript
// In hooks/notification-service.ts
const AlarmModule = Platform.OS === 'android' ? NativeModules.AlarmModule : null;

if (!AlarmModule) {
  console.error('[NotificationService] AlarmModule is not available');
  throw new Error('AlarmModule is not available. Please rebuild the app.');
}
```

This will now show a clear error message instead of a cryptic null reference error.

## Verification

After rebuilding, you should see these logs when creating a high-priority reminder:

```
[NotificationService] Scheduling reminder 1760368001974, priority: high, repeatType: none
[NotificationService] Scheduling for 2025-10-13T15:08:00.000Z
[NotificationService] Scheduled native alarm for rem-1760368001974
AlarmModule: Alarm scheduled for Test (1760368001974) at 1728831480000
```

## Important Notes

- **Hot reload and Fast refresh DO NOT work for native code changes**
- **You must do a full rebuild whenever you modify Kotlin/Java files**
- The native module registration in `MainApplication.kt` is correct
- The `AlarmPackage` is properly added to the packages list

## Files Involved

- `android/app/src/main/java/app/rork/dominder_android_reminder_app/AlarmModule.kt` - Native module
- `android/app/src/main/java/app/rork/dominder_android_reminder_app/AlarmPackage.kt` - Package registration
- `android/app/src/main/java/app/rork/dominder_android_reminder_app/MainApplication.kt` - App initialization
- `hooks/notification-service.ts` - JavaScript interface

## Next Steps After Rebuild

Once the app is rebuilt and the AlarmModule is working:

1. Test creating a high-priority reminder
2. Verify the alarm triggers at the scheduled time
3. Check that the full-screen intent opens the alarm screen (not home screen)
4. Test snooze and done actions
