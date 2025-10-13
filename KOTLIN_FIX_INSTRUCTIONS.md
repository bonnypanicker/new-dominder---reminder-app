# Kotlin Native Module Fix Instructions

## Problem Summary
The AlarmModule native module is returning NULL when accessed from JavaScript, causing the error:
```
[TypeError: Cannot read property 'scheduleAlarm' of null]
```

## Root Causes
1. Duplicate AlarmPackage.kt files causing build conflicts
2. Missing logging to verify module registration
3. App needs full rebuild after native module changes

---

## Step 1: Delete Duplicate File

**File to delete:**
```
/android/app/src/main/java/app/rork/dominder_android_reminder_app/AlarmPackage.kt
```

This is the OLD file. The correct file is in the `alarm` subdirectory.

**Command:**
```bash
rm android/app/src/main/java/app/rork/dominder_android_reminder_app/AlarmPackage.kt
```

---

## Step 2: Add Logging to AlarmPackage.kt

**File:** `/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmPackage.kt`

**Current code:**
```kotlin
package app.rork.dominder_android_reminder_app.alarm

import app.rork.dominder_android_reminder_app.AlarmModule
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AlarmModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

**Updated code:**
```kotlin
package app.rork.dominder_android_reminder_app.alarm

import app.rork.dominder_android_reminder_app.AlarmModule
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import android.util.Log

class AlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        Log.d("AlarmPackage", "Creating AlarmModule native module")
        val module = AlarmModule(reactContext)
        Log.d("AlarmPackage", "AlarmModule created successfully")
        return listOf(module)
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

**Changes:**
- Added `import android.util.Log`
- Added log before creating module
- Added log after creating module

---

## Step 3: Add Logging to AlarmModule.kt

**File:** `/android/app/src/main/java/app/rork/dominder_android_reminder_app/AlarmModule.kt`

**Current code (lines 15-19):**
```kotlin
class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AlarmModule"
    }
```

**Updated code:**
```kotlin
class AlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        Log.d("AlarmModule", "AlarmModule initialized - getName will return: AlarmModule")
    }

    override fun getName(): String {
        Log.d("AlarmModule", "getName() called, returning: AlarmModule")
        return "AlarmModule"
    }
```

**Changes:**
- Added `init` block with logging
- Added log in `getName()` method

---

## Step 4: Verify AlarmReceiver.kt

**File:** `/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt`

**Check lines 76-88** - Ensure full-screen intent is properly configured:

```kotlin
// Create full-screen intent for locked screen
val fullScreenIntent = Intent(context, AlarmActivity::class.java).apply {
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    putExtra("reminderId", reminderId)
    putExtra("title", title)
    putExtra("fromFullScreen", true)
}
val fullScreenPendingIntent = PendingIntent.getActivity(
    context,
    (reminderId.hashCode() + 1000),
    fullScreenIntent,
    PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
)
```

**Check line 99** - Ensure `.setFullScreenIntent()` is called:
```kotlin
.setFullScreenIntent(fullScreenPendingIntent, true)
```

This should already be correct based on the current code.

---

## Step 5: Clean and Rebuild

**Commands:**
```bash
# Navigate to android directory
cd android

# Clean build artifacts
./gradlew clean

# Go back to root
cd ..

# Rebuild and run
npx expo run:android
```

**Alternative (if above doesn't work):**
```bash
# Stop Metro bundler if running
# Then:

cd android
./gradlew clean
./gradlew assembleDebug
cd ..

# Start fresh
npx expo start --clear
# Then press 'a' for Android
```

---

## Step 6: Verify Logs

After rebuilding and launching the app, check logs:

```bash
adb logcat | grep -E "AlarmPackage|AlarmModule|NotificationService"
```

**Expected output:**
```
AlarmPackage: Creating AlarmModule native module
AlarmModule: AlarmModule initialized - getName will return: AlarmModule
AlarmPackage: AlarmModule created successfully
AlarmModule: getName() called, returning: AlarmModule
[NotificationService] AlarmModule availability: Available
[NotificationService] AlarmModule methods: ['scheduleAlarm', 'cancelAlarm', 'finishAffinity']
```

**If you see:**
```
[NotificationService] AlarmModule availability: NULL
```

Then the module is still not registered. Try:
1. Verify MainApplication.kt has the correct import
2. Check for any build errors in Android Studio
3. Try invalidating caches in Android Studio

---

## Step 7: Test Reminder Scheduling

1. Open the app
2. Create a new reminder with HIGH priority
3. Set time to 2-3 minutes in the future
4. Check logs:

```bash
adb logcat | grep -E "AlarmModule|AlarmReceiver"
```

**Expected output:**
```
AlarmModule: Scheduling alarm from React Native bridge: [reminderId] at [timestamp]
AlarmModule: Alarm scheduled for [title] ([reminderId]) at [timestamp]
```

When alarm triggers:
```
AlarmReceiver: Alarm received!
AlarmReceiver: Screen state - isScreenOn: [true/false], isLocked: [true/false]
AlarmReceiver: Launching full-screen AlarmActivity
```

---

## Troubleshooting

### Issue: AlarmModule still NULL after rebuild

**Solution 1: Check MainApplication.kt**
Verify line 27:
```kotlin
packages.add(app.rork.dominder_android_reminder_app.alarm.AlarmPackage())
```

**Solution 2: Check for build errors**
```bash
cd android
./gradlew assembleDebug --stacktrace
```

Look for any errors related to AlarmPackage or AlarmModule.

**Solution 3: Verify package name**
In AlarmModule.kt, verify the package declaration:
```kotlin
package app.rork.dominder_android_reminder_app
```

This should match the import in AlarmPackage.kt:
```kotlin
import app.rork.dominder_android_reminder_app.AlarmModule
```

### Issue: Build fails with duplicate class error

This means the old AlarmPackage.kt wasn't deleted. Delete it:
```bash
rm android/app/src/main/java/app/rork/dominder_android_reminder_app/AlarmPackage.kt
```

### Issue: AlarmActivity doesn't show on locked screen

Check AndroidManifest.xml for required permissions:
```xml
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.TURN_SCREEN_ON" />
```

And verify AlarmActivity is registered:
```xml
<activity
    android:name=".alarm.AlarmActivity"
    android:showWhenLocked="true"
    android:turnScreenOn="true"
    android:excludeFromRecents="true"
    android:exported="false" />
```

---

## Summary of Changes

### Files Modified:
1. ✅ `/hooks/notification-service.ts` - Added logging and fallback
2. ⏳ `/android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmPackage.kt` - Need to add logging
3. ⏳ `/android/app/src/main/java/app/rork/dominder_android_reminder_app/AlarmModule.kt` - Need to add logging

### Files to Delete:
1. ⏳ `/android/app/src/main/java/app/rork/dominder_android_reminder_app/AlarmPackage.kt` - OLD duplicate file

### Build Steps:
1. ⏳ Delete duplicate file
2. ⏳ Add logging to Kotlin files
3. ⏳ Clean build: `cd android && ./gradlew clean`
4. ⏳ Rebuild: `npx expo run:android`
5. ⏳ Verify logs

---

## Gemini CLI Prompt

If using Gemini CLI to make these changes, use this prompt:

```
I need to fix a React Native native module registration issue. Please make the following changes:

1. Delete this file:
   android/app/src/main/java/app/rork/dominder_android_reminder_app/AlarmPackage.kt

2. In android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmPackage.kt:
   - Add import: import android.util.Log
   - In createNativeModules method, add logging before and after creating AlarmModule:
     Log.d("AlarmPackage", "Creating AlarmModule native module")
     val module = AlarmModule(reactContext)
     Log.d("AlarmPackage", "AlarmModule created successfully")
     return listOf(module)

3. In android/app/src/main/java/app/rork/dominder_android_reminder_app/AlarmModule.kt:
   - Add init block after class declaration:
     init {
         Log.d("AlarmModule", "AlarmModule initialized - getName will return: AlarmModule")
     }
   - Add logging in getName() method:
     override fun getName(): String {
         Log.d("AlarmModule", "getName() called, returning: AlarmModule")
         return "AlarmModule"
     }

These changes will help debug why the AlarmModule is returning null in JavaScript.
```

---

## Expected Result

After completing all steps:
1. ✅ AlarmModule is available in JavaScript (not null)
2. ✅ High-priority reminders schedule native alarms
3. ✅ Alarms trigger at correct time
4. ✅ Full-screen AlarmActivity shows on locked screen
5. ✅ Persistent notification shows on unlocked screen
6. ✅ Snooze and Done actions work correctly
7. ✅ No home screen shown after dismissing alarm
