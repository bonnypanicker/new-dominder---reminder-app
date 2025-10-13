# Critical Fixes Required for DoMinder Reminder System

## Analysis Summary
After deep analysis of the reminder system, I found several critical issues preventing proper functionality, especially for ringer mode (high priority) reminders.

---

## 🔴 CRITICAL ISSUE #1: Full-Screen Intent Not Working When Phone is Locked

### Problem:
When the phone is locked and a ringer reminder triggers, the screen doesn't light up and show AlarmActivity. Instead, only a notification appears.

### Root Cause:
In `AlarmReceiver.kt`, the persistent notification doesn't have a `fullScreenIntent` configured. Without this, Android won't light up the screen when locked.

### Fix Required in `AlarmReceiver.kt`:

**Location:** `showPersistentNotification()` function (lines 46-89)

**Add this code BEFORE building the notification:**

```kotlin
// Add full-screen intent for locked screen
val fullScreenIntent = Intent(context, AlarmActivity::class.java).apply {
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    putExtra("reminderId", reminderId)
    putExtra("title", title)
    putExtra("fromFullScreen", true)
}
val fullScreenPendingIntent = PendingIntent.getActivity(
    context,
    (reminderId.hashCode() + 1000), // Different request code
    fullScreenIntent,
    PendingIntent.FLAG_UPDATE_CURRENT or if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
)
```

**Then modify the notification builder to include:**

```kotlin
val notification = NotificationCompat.Builder(context, channelId)
    .setContentTitle(title)
    .setContentText("Tap to open alarm")
    .setSmallIcon(R.mipmap.ic_launcher)
    .setPriority(NotificationCompat.PRIORITY_HIGH)
    .setCategory(NotificationCompat.CATEGORY_ALARM)
    .setOngoing(true)
    .setAutoCancel(false)
    .setContentIntent(tapPendingIntent)
    .setFullScreenIntent(fullScreenPendingIntent, true)  // ADD THIS LINE
    .build()
```

---

## 🔴 CRITICAL ISSUE #2: RescheduleAlarmsService Returns NULL for Next Reminder Date

### Problem:
When Done/Snooze is pressed in AlarmActivity, the `RescheduleAlarmsService` tries to calculate the next reminder date but always returns `null`, breaking repeating reminders.

### Root Cause:
In `RescheduleAlarmsService.kt` line 238-246, the `calculateNextReminderDate()` function is not implemented.

### Fix Required in `RescheduleAlarmsService.kt`:

**Replace the entire `calculateNextReminderDate()` function with:**

```kotlin
private fun calculateNextReminderDate(reminder: JSONObject): String? {
    val repeatType = reminder.optString("repeatType", "none")
    if (repeatType == "none") return null
    
    val date = reminder.getString("date")
    val time = reminder.getString("time")
    val parts = date.split("-")
    val timeParts = time.split(":")
    
    val calendar = java.util.Calendar.getInstance()
    calendar.set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt(), timeParts[0].toInt(), timeParts[1].toInt(), 0)
    calendar.set(java.util.Calendar.MILLISECOND, 0)
    
    val now = java.util.Calendar.getInstance()
    
    when (repeatType) {
        "daily" -> {
            // Move to next day if time has passed today
            if (calendar.before(now)) {
                calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
            }
            
            // Check if specific days are set
            val repeatDays = reminder.optJSONArray("repeatDays")
            if (repeatDays != null && repeatDays.length() > 0) {
                val allowedDays = mutableListOf<Int>()
                for (i in 0 until repeatDays.length()) {
                    allowedDays.add(repeatDays.getInt(i))
                }
                
                // Find next allowed day
                var attempts = 0
                while (attempts < 7) {
                    val dayOfWeek = (calendar.get(java.util.Calendar.DAY_OF_WEEK) + 5) % 7 // Convert to 0=Sun
                    if (allowedDays.contains(dayOfWeek)) {
                        break
                    }
                    calendar.add(java.util.Calendar.DAY_OF_MONTH, 1)
                    attempts++
                }
            }
        }
        "weekly" -> {
            calendar.add(java.util.Calendar.WEEK_OF_YEAR, 1)
        }
        "monthly" -> {
            calendar.add(java.util.Calendar.MONTH, 1)
        }
        "yearly" -> {
            calendar.add(java.util.Calendar.YEAR, 1)
        }
        else -> return null
    }
    
    return formatISODate(calendar.timeInMillis)
}
```

---

## 🔴 CRITICAL ISSUE #3: Disc Rotation Not Following Finger on Android

### Problem:
In the time selector (`app/index.tsx`), the disc doesn't follow finger rotation properly on Android.

### Root Cause:
The PanResponder is using `locationX/locationY` which might be affected by keyboard or view hierarchy on Android.

### Fix Required in `app/index.tsx`:

**Location:** `panResponder` in `TimeSelector` component (around line 1673-1909)

**Replace the `onPanResponderGrant` handler:**

```typescript
onPanResponderGrant: (evt, gestureState) => {
  isDragging.current = true;
  rotationRef.current = rotation;
  measureCenter();
  
  // Stop any ongoing animations
  if (decayAnimation.current) {
    clearInterval(decayAnimation.current);
    decayAnimation.current = null;
  }
  if (autoSwitchTimeout.current) {
    clearTimeout(autoSwitchTimeout.current);
    autoSwitchTimeout.current = null;
  }
  if (snapAnimation.current) {
    snapAnimation.current.stop();
    snapAnimation.current = null;
  }
  velocity.current = 0;
  stoppedByFriction.current = false;
  lastMoveTime.current = Date.now();
  
  // Use pageX/pageY instead of locationX/locationY for better Android compatibility
  const touchX = evt.nativeEvent.pageX - centerRef.current.x;
  const touchY = evt.nativeEvent.pageY - centerRef.current.y;
  const angle = Math.atan2(touchY, touchX);
  const degrees = (angle * 180 / Math.PI + 90 + 360) % 360;
  lastAngle.current = degrees;
},
```

**Replace the `onPanResponderMove` handler:**

```typescript
onPanResponderMove: (evt, gestureState) => {
  if (!isDragging.current) return;
  const currentTime = Date.now();
  
  // Use pageX/pageY for better Android compatibility
  const touchX = evt.nativeEvent.pageX - centerRef.current.x;
  const touchY = evt.nativeEvent.pageY - centerRef.current.y;
  const angle = Math.atan2(touchY, touchX);
  const degrees = (angle * 180 / Math.PI + 90 + 360) % 360;
  
  let delta = degrees - lastAngle.current;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  if (Math.abs(delta) < DEADBAND_DEG) return;
  
  const timeDelta = currentTime - lastMoveTime.current;
  if (timeDelta > 0 && timeDelta < 100) {
    const newVelocity = delta / timeDelta;
    velocity.current = velocity.current * 0.3 + newVelocity * 0.7;
  } else if (timeDelta >= 100) {
    velocity.current = 0;
  }
  lastMoveTime.current = currentTime;
  
  delta *= activeSection === 'hour' ? HOUR_SENSITIVITY : MINUTE_SENSITIVITY;
  rotationRef.current = (rotationRef.current + delta + 360) % 360;
  lastAngle.current = degrees;
  
  const r = rotationRef.current % 360;
  setRotation(r);
  
  if (!framePending.current) {
    framePending.current = true;
    requestAnimationFrame(() => {
      const currentR = rotationRef.current % 360;
      if (activeSection === 'hour') {
        const hourStep = 360 / 12;
        const hourIndex = Math.round(currentR / hourStep) % 12;
        const newHour = hourIndex === 0 ? 12 : hourIndex;
        if (newHour !== currentHour) {
          setCurrentHour(newHour);
        }
      } else {
        const minuteStep = 360 / 60;
        const minuteIndex = Math.round(currentR / minuteStep) % 60;
        if (minuteIndex !== currentMinute) {
          setCurrentMinute(minuteIndex);
        }
      }
      framePending.current = false;
    });
  }
},
```

---

## 🟡 ISSUE #4: State Sync Between Native and React Native

### Problem:
When AlarmActivity sends Done/Snooze actions, `RescheduleAlarmsService` modifies AsyncStorage directly in Kotlin. This doesn't trigger React Native state updates.

### Current Flow:
1. AlarmActivity → Broadcast → AlarmActionReceiver → RescheduleAlarmsService
2. RescheduleAlarmsService modifies AsyncStorage
3. React Native doesn't know about the change

### Recommended Fix:
After modifying AsyncStorage in `RescheduleAlarmsService`, emit a DeviceEvent to notify React Native:

**Add to `RescheduleAlarmsService.kt` after line 67:**

```kotlin
// Notify React Native about the change
try {
    val reactInstanceManager = (application as MainApplication).reactNativeHost.reactInstanceManager
    val reactContext = reactInstanceManager.currentReactContext
    
    if (reactContext != null) {
        reactContext
            .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("remindersChanged", null)
        
        Log.d("RescheduleAlarmsService", "Emitted remindersChanged event")
    }
} catch (e: Exception) {
    Log.e("RescheduleAlarmsService", "Error emitting event", e)
}
```

---

## 🟢 VERIFICATION CHECKLIST

After applying fixes, test these scenarios:

### Ringer Mode (High Priority):
- [ ] **Phone LOCKED + App CLOSED**: Screen lights up, AlarmActivity shows
- [ ] **Phone LOCKED + App MINIMIZED**: Screen lights up, AlarmActivity shows
- [ ] **Phone UNLOCKED + App CLOSED**: Persistent notification shows, tap opens AlarmActivity
- [ ] **Phone UNLOCKED + App OPENED**: Persistent notification shows, tap opens AlarmActivity
- [ ] **Done button**: Closes AlarmActivity, app not visible
- [ ] **Snooze button**: Closes AlarmActivity, reschedules alarm
- [ ] **Repeating reminder**: Next occurrence calculated correctly

### Time Selector:
- [ ] Disc follows finger smoothly on Android
- [ ] No jitter when rotating
- [ ] Keyboard doesn't interfere with touch

---

## 📝 IMPLEMENTATION STEPS

1. **Fix AlarmReceiver.kt** - Add full-screen intent
2. **Fix RescheduleAlarmsService.kt** - Implement calculateNextReminderDate()
3. **Fix app/index.tsx** - Use pageX/pageY in PanResponder
4. **Add DeviceEvent emission** - Notify React Native of state changes
5. **Test all scenarios** - Use verification checklist

---

## 🔧 ADDITIONAL NOTES

### Permissions Required:
Ensure these permissions are in AndroidManifest.xml (already present):
- `USE_FULL_SCREEN_INTENT`
- `SCHEDULE_EXACT_ALARM`
- `SYSTEM_ALERT_WINDOW`

### Android 12+ Considerations:
On Android 12+, users must grant "Alarms & reminders" permission in Settings for full-screen intents to work.

### Testing Tips:
1. Use `adb logcat | grep -E "(AlarmReceiver|AlarmActivity|RescheduleAlarmsService)"` to monitor logs
2. Test with phone locked using power button
3. Test with different Android versions (especially 12+)
4. Verify notification channel settings allow full-screen intents

---

## 🚨 PRIORITY ORDER

1. **HIGHEST**: Fix #1 (Full-screen intent) - This is why locked screen doesn't work
2. **HIGH**: Fix #2 (calculateNextReminderDate) - Breaks repeating reminders
3. **MEDIUM**: Fix #3 (Disc rotation) - UX issue on Android
4. **LOW**: Fix #4 (State sync) - Nice to have for real-time updates

---

Generated: 2025-01-XX
