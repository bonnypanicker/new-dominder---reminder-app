# Kotlin Fixes for DoMinder Reminder App

## Context
This is a React Native reminder app with native Android alarm functionality. The app has three reminder modes:
- **Standard**: Regular notifications
- **Silent**: Silent notifications  
- **Ringer**: Full-screen alarm with sound (the problematic one)

## Current Issues

### Issue 1: Ringer Mode Full-Screen Alarm Not Working Properly
**Problem**: When phone is locked and a ringer reminder triggers, the full-screen alarm UI doesn't show up consistently. Sometimes it shows the app home screen instead of AlarmActivity.

**Root Cause**: AlarmReceiver always launches AlarmActivity regardless of screen state, and AlarmActivity buttons don't properly communicate with React Native.

### Issue 2: Snooze and Done Buttons Don't Work
**Problem**: In AlarmActivity, tapping "Snooze" or "Done" just dismisses the alarm without actually snoozing or marking the reminder as done in React Native.

**Root Cause**: AlarmActivity doesn't send intents back to MainActivity, so React Native never receives the action events.

### Issue 3: No Persistent Notification When Screen is Unlocked
**Problem**: When screen is unlocked and a ringer reminder triggers, it should show a persistent notification (not full-screen alarm), but currently always shows full-screen.

**Root Cause**: AlarmReceiver doesn't check screen state before deciding which UI to show.

---

## Required Fixes

### Fix 1: Update AlarmActivity.kt
**File**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActivity.kt`

**Changes Needed**:
1. Add `handleSnooze()` method that:
   - Creates an Intent to launch MainActivity
   - Adds flags: `FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_SINGLE_TOP`
   - Puts extras: `action="snooze"`, `reminderId`, `snoozeMinutes=10`
   - Starts the activity
   - Calls `dismissAlarm()`

2. Add `handleDismiss()` method that:
   - Creates an Intent to launch MainActivity
   - Adds flags: `FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_SINGLE_TOP`
   - Puts extras: `action="done"`, `reminderId`
   - Starts the activity
   - Calls `dismissAlarm()`

3. Update button click listeners:
   - `snoozeButton.setOnClickListener` → call `handleSnooze()`
   - `dismissButton.setOnClickListener` → call `handleDismiss()`

4. Update `dismissAlarm()` to call `finishAffinity()` instead of just `finish()`

**Key Code Pattern**:
```kotlin
private fun handleSnooze() {
    if (reminderId != null) {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        launchIntent?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("action", "snooze")
            putExtra("reminderId", reminderId)
            putExtra("snoozeMinutes", 10)
        }
        startActivity(launchIntent)
    }
    dismissAlarm()
}
```

---

### Fix 2: Update AlarmReceiver.kt
**File**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt`

**Changes Needed**:
1. Add screen state detection in `onReceive()`:
   ```kotlin
   val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
   val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
   val isScreenOn = powerManager.isInteractive
   val isLocked = keyguardManager.isKeyguardLocked
   ```

2. Add conditional logic:
   - If `isLocked || !isScreenOn` → Launch AlarmActivity (full-screen)
   - Else → Call `showPersistentNotification()`

3. Add `showPersistentNotification()` method that:
   - Creates notification channel "ringer-notifications"
   - Builds a persistent notification with:
     - `setOngoing(true)`
     - `setAutoCancel(false)`
     - Content intent that opens AlarmActivity when tapped
   - Shows notification using `notificationManager.notify()`

**Key Code Pattern**:
```kotlin
if (isLocked || !isScreenOn) {
    // Launch full-screen alarm
    val alarmIntent = Intent(context, AlarmActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        putExtra("reminderId", reminderId)
        putExtra("title", title)
    }
    context.startActivity(alarmIntent)
} else {
    // Show persistent notification
    showPersistentNotification(context, reminderId, title)
}
```

---

### Fix 3: Update MainActivity.kt
**File**: `android/app/src/main/java/app/rork/dominder_android_reminder_app/MainActivity.kt`

**Changes Needed**:
1. Override `onCreate()` to call `handleAlarmIntent(intent)`

2. Override `onNewIntent()` to call `handleAlarmIntent(intent)`

3. Add `handleAlarmIntent()` method that:
   - Extracts `action` and `reminderId` from intent
   - Gets React context from `reactNativeHost.reactInstanceManager.currentReactContext`
   - Creates params map with action, reminderId, and snoozeMinutes (if snooze)
   - Emits "alarmAction" event to React Native using DeviceEventEmitter

**Key Code Pattern**:
```kotlin
private fun handleAlarmIntent(intent: Intent) {
    val action = intent.getStringExtra("action")
    val reminderId = intent.getStringExtra("reminderId")
    
    if (action != null && reminderId != null) {
        val reactContext = reactNativeHost.reactInstanceManager.currentReactContext
        
        if (reactContext != null) {
            val params = com.facebook.react.bridge.Arguments.createMap().apply {
                putString("action", action)
                putString("reminderId", reminderId)
                if (action == "snooze") {
                    putInt("snoozeMinutes", intent.getIntExtra("snoozeMinutes", 10))
                }
            }
            
            reactContext
                .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("alarmAction", params)
        }
    }
}
```

---

## Expected Flow After Fixes

### Scenario 1: Phone Locked, Ringer Reminder Triggers
1. AlarmReceiver detects screen is locked
2. Launches AlarmActivity (full-screen with sound)
3. User taps "Snooze" → AlarmActivity sends intent to MainActivity
4. MainActivity emits "alarmAction" event to React Native
5. React Native calls `rescheduleReminderById()` with 10-minute snooze
6. Alarm dismissed, app closed

### Scenario 2: Phone Unlocked, Ringer Reminder Triggers
1. AlarmReceiver detects screen is unlocked
2. Shows persistent notification (no sound, no full-screen)
3. User taps notification → Opens AlarmActivity
4. User taps "Done" → AlarmActivity sends intent to MainActivity
5. MainActivity emits "alarmAction" event to React Native
6. React Native calls `markReminderDone()`
7. Alarm dismissed, app closed

### Scenario 3: App is Open, Ringer Reminder Triggers
1. AlarmReceiver detects screen is unlocked
2. Shows persistent notification (app stays in foreground)
3. User taps notification → Opens AlarmActivity overlay
4. User taps "Snooze" → Same flow as Scenario 1

---

## Testing Checklist
After applying fixes, test these scenarios:

- [ ] Lock phone, trigger ringer reminder → Full-screen alarm appears with sound
- [ ] Tap "Snooze" → Alarm dismissed, reminder snoozed for 10 minutes
- [ ] Tap "Done" → Alarm dismissed, reminder marked as done
- [ ] Unlock phone, trigger ringer reminder → Persistent notification appears
- [ ] Tap notification → AlarmActivity opens
- [ ] Tap "Done" from notification flow → Reminder marked as done
- [ ] Check logcat for "alarmAction event" messages
- [ ] Verify app closes after dismissing alarm (not stuck on home screen)

---

## Important Notes

1. **Don't change AlarmModule.kt** - It's working correctly for scheduling alarms
2. **Don't change notification-service.ts** - React Native side is correct
3. **Focus only on the three Kotlin files** mentioned above
4. **Use `finishAffinity()`** in AlarmActivity to ensure app closes completely
5. **Test on Android 10+** where Doze mode is stricter
6. **Check AndroidManifest.xml** has these permissions:
   - `USE_FULL_SCREEN_INTENT`
   - `SCHEDULE_EXACT_ALARM`
   - `WAKE_LOCK`
   - `DISABLE_KEYGUARD`

---

## Gemini CLI Command

To apply these fixes using Gemini CLI, use this command:

```bash
gemini code fix \
  --file android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmActivity.kt \
  --file android/app/src/main/java/app/rork/dominder_android_reminder_app/alarm/AlarmReceiver.kt \
  --file android/app/src/main/java/app/rork/dominder_android_reminder_app/MainActivity.kt \
  --instructions "Apply the fixes described in GEMINI_KOTLIN_FIX_PROMPT.md. Focus on: 1) Making AlarmActivity send intents to MainActivity for snooze/done actions, 2) Making AlarmReceiver check screen state and show persistent notification when unlocked, 3) Making MainActivity handle alarm intents and emit events to React Native. Use the code patterns provided in the prompt."
```

Or if using interactive mode:

```bash
gemini code chat
```

Then paste this entire prompt and ask:
> "Please apply these fixes to the three Kotlin files. Make sure to follow the exact code patterns provided and maintain the existing functionality for standard and silent modes."
