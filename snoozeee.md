Now I have a complete picture. Let me create a comprehensive analysis file with all the details:
Action: file_editor create /app/RINGER_SNOOZE_BUG_DETAILED_ANALYSIS.md --file-text "# Comprehensive Snooze Flow Bug Analysis for \"Every\" Ringer Mode Reminders

## Bug Report Summary

**Scenario:**  
User sets a **Ringer (high priority)** \"Every\" reminder:
- Start: 2:00 PM
- Repeat: Every 1 minute  
- End: After 3 occurrences

**Expected Behavior:**
| Time | Event | Expected State |
|------|-------|----------------|
| 2:00 PM | Alarm fires → User presses **Snooze 5m** | Snooze scheduled for 2:05 PM, count=1 |
| 2:01 PM | Alarm fires → User presses **Done** | count=2, history records 2:01 PM |
| 2:02 PM | Alarm fires → User presses **Done** | count=3 (limit reached), history records 2:02 PM |
| 2:02 PM+ | Card shows | \"Snoozed until 2:05 PM\" (NOT \"Ended\") |
| 2:05 PM | Snoozed alarm fires → User presses **Done** | history records 2:05 PM, card shows \"Ended\" |
| Final | Completed tab | Counter shows **3** with green ring (2:01, 2:02, 2:05) |

**Actual Behavior (BUGS):**
1. ❌ **BUG #1:** Card shows \"Ended\" immediately after 2:02 PM even though snoozed 2:05 PM is pending
2. ❌ **BUG #2:** When 2:05 PM fires and user presses Done, it's NOT added to completion counter/history
3. ❌ **BUG #3:** User receives \"You missed a Ringer reminder at 2:00 PM\" - inaccurate since user snoozed it

---

## Bug Analysis

### BUG #1: Card Shows \"Ended\" While Shadow Snooze Is Pending

#### Problem Location
- **Native:** `plugins/with-alarm-module.js` (AlarmActionBridge snooze handling, lines 370-459)
- **JS:** `services/reminder-scheduler.ts` (markReminderDone, lines 333-416)
- **UI:** `app/index.tsx` (ReminderCard next occurrence display, lines 1113-1152)

#### Root Cause Analysis

**Flow when user presses Snooze at 2:00 PM:**

1. **Native `AlarmActionBridge` receives `ALARM_SNOOZE`** (line 350):
   ```kotlin
   // Line 375-381: Increments actualTriggerCount from 0 to 1
   val currentCount = metaPrefs.getInt(\"meta_${reminderId}_actualTriggerCount\", 0)
   val newCount = currentCount + 1  // newCount = 1
   metaPrefs.edit().apply {
       putInt(\"meta_${reminderId}_actualTriggerCount\", newCount)
       apply()
   }
   ```

2. **Native creates shadow snooze** (lines 391-450):
   - Creates `{reminderId}_snooze` with complete metadata
   - Links to parent via `meta_{shadowId}_parentReminderId`
   - Sets `meta_{shadowId}_isShadowSnooze = true`

3. **Native schedules next series occurrence** (lines 452-459):
   - Since `newCount (1) < untilCount (3)`, calls `scheduleNextOccurrenceIfNeeded()`
   - Series continues at 2:01 PM and 2:02 PM

4. **Native emits `alarmSnooze` to JS** (line 495)

5. **JS `rescheduleReminderById` receives event** (in `_layout.tsx` line 48):
   ```typescript
   rescheduleReminderById(event.reminderId, event.snoozeMinutes);
   ```

6. **JS `rescheduleReminderById` in `reminder-scheduler.ts`** (lines 24-91):
   ```typescript
   // Lines 67-78: For repeating reminders, advances the series
   const nextDate = calculateNextReminderDate(calcContext, now);
   if (nextDate) {
       const updated = {
           ...reminder,
           nextReminderDate: nextDate.toISOString(),
           isActive: true
       };
       await updateReminder(updated);
   } else {
       // Lines 81-90: Series ended but snooze pending - keep active
       const updated = {
           ...reminder,
           isActive: true,
           isCompleted: false  // Ensure not marked as completed
       };
       await updateReminder(updated);
   }
   ```

**Problem Point 1:** When the series ends (count reaches 3 at 2:02 PM), JS `markReminderDone` is called.

**In `markReminderDone` (lines 333-416):**
```typescript
// Lines 333-352: Series ended check
console.log('[Scheduler] Series ended, checking for pending shadow snooze...');

let hasPendingShadowSnooze = false;
if (AlarmModule?.getNativeReminderState) {
    try {
        const shadowId = `${reminderId}_snooze`;
        const shadowState = await AlarmModule.getNativeReminderState(shadowId);
        if (shadowState && !shadowState.isCompleted) {
            hasPendingShadowSnooze = true;
        }
    } catch (e) {
        // Shadow snooze doesn't exist or error checking
    }
}

if (hasPendingShadowSnooze) {
    // Lines 355-370: Keep active until shadow completes
    const updated = {
        ...calcContext,
        nextReminderDate: undefined,  // No more regular occurrences
        isActive: true,               // Keep active
        isCompleted: false,           // NOT complete yet
    };
    await updateReminder(updated);
} else {
    // Lines 373-405: Mark as complete
    const completed = {
        ...calcContext,
        isCompleted: true,
        isActive: false,
    };
    await updateReminder(completed);
}
```

**Issue:** The `getNativeReminderState(shadowId)` call may fail or return incomplete data:

1. **Native `getNativeReminderState`** (lines 3007-3023 in `with-alarm-module.js`):
   ```kotlin
   @ReactMethod
   fun getNativeReminderState(reminderId: String, promise: Promise) {
       val prefs = reactContext.getSharedPreferences(\"DoMinderReminderMeta\", Context.MODE_PRIVATE)
       val result = Arguments.createMap().apply {
           putInt(\"actualTriggerCount\", prefs.getInt(\"meta_${reminderId}_actualTriggerCount\", 0))
           putInt(\"occurrenceCount\", prefs.getInt(\"meta_${reminderId}_occurrenceCount\", 0))
           putBoolean(\"isCompleted\", prefs.getBoolean(\"meta_${reminderId}_isCompleted\", false))
           // ...other fields
       }
       promise.resolve(result)
   }
   ```

2. **Problem:** The shadow snooze exists with metadata like:
   - `meta_{shadowId}_isShadowSnooze = true`
   - `meta_{shadowId}_parentReminderId = {originalId}`
   
   But `getNativeReminderState` checks `meta_{shadowId}_isCompleted` which is `false` (good), BUT it doesn't check if the **alarm is actually scheduled**. The shadow snooze might exist in metadata but the alarm could have been cancelled.

3. **The Real Problem:** When checking `shadowState && !shadowState.isCompleted`, the `shadowState` object is always returned (even if shadow doesn't really exist as a pending alarm). The JS relies on this returning empty/error for non-existent shadows.

**UI Display Issue (lines 1119-1152 in `app/index.tsx`):**
```typescript
const nextDate = getNextDate();

// If no next date and has end condition, the reminder has ended
if (!nextDate && hasEndCondition) {
    // Shows \"Ended: ...\"
    return `Ended: ${dateStr} at ${timeStr}`;
}
```

When `nextReminderDate` is set to `undefined` (line 361 in markReminderDone), the UI shows \"Ended\" because:
- `getNextDate()` returns null (no nextReminderDate, no snoozeUntil in JS store)
- `hasEndCondition` is true (`untilType === 'count'`)

#### Missing Link
The **shadow snooze time is stored in NATIVE SharedPreferences** but NOT in the **JS reminder store** (`snoozeUntil`). The UI checks `reminder.snoozeUntil` but this is never set for shadow snoozes.

---

### BUG #2: Shadow Snooze Completion Not Recorded in History/Counter

#### Problem Location
- **Native:** `plugins/with-alarm-module.js` (AlarmActionBridge ALARM_DONE for shadow, lines 246-302)
- **JS:** `services/reminder-scheduler.ts` (markReminderDone isShadowSnooze handling, lines 119-186)

#### Root Cause Analysis

**Flow when user presses Done at 2:05 PM (shadow snooze):**

1. **Native AlarmReceiver fires for `{reminderId}_snooze`** (line 1861)
   - Shows AlarmActivity with the snooze title
   - User presses Done

2. **Native AlarmActionBridge receives `ALARM_DONE` with shadowId** (lines 240-302):
   ```kotlin
   // Lines 246-249: Check if this is a shadow snooze
   val isShadowSnooze = metaPrefs.getBoolean(\"meta_${reminderId}_isShadowSnooze\", false)
   val parentReminderId = metaPrefs.getString(\"meta_${reminderId}_parentReminderId\", null)
   
   if (isShadowSnooze && parentReminderId != null) {
       // Lines 253-254: Record trigger for shadow snooze
       recordNativeTrigger(context, reminderId, triggerTime)  // Records under SHADOW ID, not parent!
       
       // Lines 261-272: Check if parent should complete
       if (parentUntilType == \"count\" && parentActualCount >= parentUntilCount) {
           // Mark parent as complete
           metaPrefs.edit().apply {
               putBoolean(\"meta_${parentReminderId}_isCompleted\", true)
               putLong(\"meta_${parentReminderId}_completedAt\", triggerTime)
               apply()
           }
           
           // Emit completion event for parent
           emitEventToReactNative(context, \"alarmDone\", parentReminderId, 0, triggerTime)
       }
       
       // Lines 274-298: Clean up shadow snooze metadata
       // ...removes all meta_{shadowId}_* keys
       
       // Line 300-301: Emit event for shadow snooze completion (for UI update)
       emitEventToReactNative(context, \"alarmDone\", reminderId, 0, triggerTime)  // Emits with SHADOW ID
       return  // ← RETURNS EARLY, doesn't call recordNativeTrigger for parent!
   }
   ```

**Issue #1:** `recordNativeTrigger(context, reminderId, triggerTime)` at line 254 records the trigger under the **SHADOW ID**, not the parent ID! This means:
- `meta_{shadowId}_actualTriggerCount` is incremented (then deleted in cleanup)
- `meta_{shadowId}_triggerHistory` gets the timestamp (then deleted in cleanup)
- **PARENT's triggerHistory NEVER gets this completion!**

**Issue #2:** The `emitEventToReactNative(context, \"alarmDone\", reminderId, ...)` at line 301 emits with the **shadow ID** (`{originalId}_snooze`).

3. **JS receives `alarmDone` event** (in `_layout.tsx` line 30-39):
   ```typescript
   DeviceEventEmitter.addListener('alarmDone', (event) => {
       // event.reminderId = \"{originalId}_snooze\"
       markReminderDone(event.reminderId, false, event.triggerTime);
   });
   ```

4. **JS `markReminderDone` processes shadow completion** (lines 119-186):
   ```typescript
   // Lines 119-122: Detect shadow snooze
   const isShadowSnooze = reminderId.endsWith('_snooze');
   const originalReminderId = isShadowSnooze ? reminderId.replace('_snooze', '') : reminderId;
   
   // Lines 124-129: Get the ORIGINAL reminder
   let reminder = await getReminder(isShadowSnooze ? originalReminderId : reminderId);
   
   if (!reminder) {
       console.log(`[Scheduler] Reminder not found`);
       return;  // ← If original not found, exits!
   }
   
   // Lines 132-186: Shadow snooze handling
   if (isShadowSnooze) {
       const completedOccurrenceTime = triggerTimeMs
           ? new Date(triggerTimeMs).toISOString()
           : new Date().toISOString();
       
       // Lines 140-152: If original is already completed
       if (reminder.isCompleted) {
           const existingHistory = reminder.completionHistory || [];
           if (!existingHistory.includes(completedOccurrenceTime)) {
               const updatedReminder = {
                   ...reminder,
                   completionHistory: [...existingHistory, completedOccurrenceTime].sort(),
                   lastTriggeredAt: completedOccurrenceTime
               };
               await updateReminder(updatedReminder);  // ← Should work!
           }
       } else {
           // Lines 154-168: Original still active - add to separate history item
           const historyId = `${originalReminderId}_hist`;
           // ...finds or creates history item
       }
       
       // Lines 172-183: Clear shadow metadata and cancel notifications
       if (AlarmModule?.clearReminderMetadata) {
           await AlarmModule.clearReminderMetadata(reminderId);  // Clear shadow
       }
       await notificationService.cancelAllNotificationsForReminder(reminderId);
       
       DeviceEventEmitter.emit('remindersChanged');
       return;
   }
   ```

**Issue #3:** The JS path **should** update `completionHistory`, but there's a timing issue:
- Native emits `alarmDone` for **parent** first (line 271): `emitEventToReactNative(context, \"alarmDone\", parentReminderId, 0, triggerTime)`
- Then emits for **shadow** (line 301): `emitEventToReactNative(context, \"alarmDone\", reminderId, 0, triggerTime)`

When the parent event arrives:
- JS `markReminderDone` runs for parent
- It's the THIRD occurrence (count=3), series complete
- JS marks it as `isCompleted: true`

Then when shadow event arrives:
- JS `markReminderDone` runs for shadow
- Finds original reminder with `isCompleted: true` (✓)
- SHOULD add to `completionHistory`

**But there's a race condition:** If the parent's completion event processes **after** the shadow's (due to async), or if the shadow event is processed first but doesn't find the reminder marked complete yet, the history update could fail.

**Issue #4:** Even if JS updates `completionHistory`, the **UI counter** in `ReminderCard` may not reflect it because:
- The counter badge reads `completionHistory.length`
- If the shadow completion isn't added to history, counter shows incorrect value

---

### BUG #3: False \"Missed Alarm\" Notification for Snoozed Reminder

#### Problem Location
- **Native:** `plugins/with-alarm-module.js` (AlarmActivity timeout, lines 1571-1600)

#### Root Cause Analysis

**Flow when alarm fires at 2:00 PM:**

1. **AlarmReceiver triggers AlarmActivity** (line 1904)
   - `priority = \"high\"` → Ringer mode
   - `AlarmActivity.onCreate()` is called

2. **AlarmActivity sets 5-minute timeout** (lines 1571-1600):
   ```kotlin
   // Line 1572-1599: Setup 5-minute timeout
   timeoutRunnable = Runnable {
       DebugLogger.log(\"AlarmActivity: 5-minute timeout reached, sending missed alarm broadcast\")
       
       // Stop ringtone
       AlarmRingtoneService.stopAlarmRingtone(this)
       
       // Send missed alarm broadcast
       val missedIntent = Intent(\"com.dominder.MISSED_ALARM\").apply {
           putExtra(\"reminderId\", reminderId)
           putExtra(\"title\", title)
           putExtra(\"time\", timeFormat.format(Date()))  // ← CURRENT time, not original trigger time!
       }
       sendBroadcast(missedIntent)
       
       // Post native missed notification
       postMissedNotification(reminderId, title)
       
       finishAlarmProperly()
   }
   
   handler.postDelayed(timeoutRunnable!!, TIMEOUT_DURATION)  // TIMEOUT_DURATION = 5 minutes
   ```

3. **When user presses Snooze** (lines 1612-1649):
   ```kotlin
   private fun handleSnooze(minutes: Int) {
       // Line 1615-1616: Cancel timeout
       timeoutRunnable?.let { handler.removeCallbacks(it) }
       
       // Stop ringtone, save to SharedPreferences, send broadcast...
   }
   ```

**The Actual Problem is NOT the timeout mechanism itself.**

Looking more carefully at the bug report: \"I get a notification that I missed a ringer reminder at 2:00pm\"

This happens AFTER the user has already snoozed. The possible causes are:

**Hypothesis A: Race Condition in Timeout Cancellation**
- User presses Snooze at 2:00:04 (4 seconds after alarm)
- `handler.removeCallbacks(timeoutRunnable)` is called
- But due to thread timing, the `timeoutRunnable` might have already been queued to run
- This is unlikely with 5-minute timeout but possible

**Hypothesis B: Native Scheduling Issues**
The more likely cause is in `AlarmActionBridge.scheduleNextOccurrenceIfNeeded`:

When snooze is pressed:
1. Native creates shadow snooze at 2:05 PM
2. Native advances series to 2:01 PM
3. Series continues: 2:01 PM (done), 2:02 PM (done), count=3

At 2:02 PM, native `checkAndMarkCompletionNatively` (lines 1034-1098):
```kotlin
// Line 1051-1065: Count check
if (untilType == \"count\") {
    val untilCount = metaPrefs.getInt(\"meta_${reminderId}_untilCount\", 0)
    val actualTriggerCount = metaPrefs.getInt(\"meta_${reminderId}_actualTriggerCount\", 0)
    
    if (actualTriggerCount >= untilCount) {
        metaPrefs.edit().apply {
            putBoolean(\"meta_${reminderId}_isCompleted\", true)
            putLong(\"meta_${reminderId}_completedAt\", triggerTime)
            apply()
        }
        return true  // ← Marked complete!
    }
}
```

Then in `ALARM_DONE` handler (lines 310-328):
```kotlin
val shouldComplete = checkAndMarkCompletionNatively(context, reminderId, triggerTime)
if (shouldComplete) {
    // Check if there's a pending shadow snooze
    val shadowId = reminderId + \"_snooze\"
    val hasShadowSnooze = metaPrefs.contains(\"meta_${shadowId}_isShadowSnooze\")
    
    if (hasShadowSnooze) {
        // Don't mark as complete yet - wait for shadow snooze
        metaPrefs.edit().apply {
            putBoolean(\"meta_${reminderId}_isCompleted\", false)
            putBoolean(\"meta_${reminderId}_pendingShadowSnooze\", true)
            apply()
        }
    }
}
```

**KEY INSIGHT:** The native code DOES set `pendingShadowSnooze = true` at line 324!

But this flag is NEVER checked:
1. Not in `postMissedNotification`
2. Not in JS UI rendering
3. Not in `getNativeReminderState` return value

**Hypothesis C: MissedAlarmService JS Handler**

Looking at `services/missed-alarm-service.ts`:
```typescript
// Lines 50-58: Handle missed alarm
private async handleMissedAlarm(data: MissedAlarmData) {
    console.log('[MissedAlarmService] Received missed alarm:', data);
    
    try {
        await this.showMissedNotification(data);  // Shows notification unconditionally!
    } catch (error) {
        console.error('[MissedAlarmService] Error showing missed notification:', error);
    }
}
```

**No check for whether the alarm was snoozed!**

The `com.dominder.MISSED_ALARM` broadcast is sent after the 5-minute timeout OR when the AlarmActivity finishes without user interaction. But once sent, `missedAlarmService` shows the notification regardless of snooze status.

**Actual Root Cause:**
Looking at the scenario again:
1. 2:00 PM: Alarm fires, user presses Snooze 5m
2. `AlarmActionBridge.ALARM_SNOOZE` increments count to 1
3. Native schedules shadow snooze at 2:05 PM
4. Native schedules next series at 2:01 PM
5. 2:01 PM: Alarm fires, user presses Done → count=2
6. 2:02 PM: Alarm fires, user presses Done → count=3, series complete
7. **BUT:** The native `actualTriggerCount` is 3, NOT including the shadow!
8. When 2:02 PM completes, native checks for shadow, finds it, sets `pendingShadowSnooze=true`
9. **HOWEVER:** The original 2:00 PM occurrence was snoozed, and the snooze should fire at 2:05 PM

**The bug might be:** The `checkAndMarkCompletionNatively` counts the 2:00 PM snooze as occurrence #1, so by 2:02 PM we have:
- Count 1: 2:00 PM (snoozed)
- Count 2: 2:01 PM (done)  
- Count 3: 2:02 PM (done)

The series is \"complete\" per the count logic. But the user only COMPLETED 2 alarms (2:01 and 2:02), the 2:00 was snoozed.

**This is a fundamental design question:** Should a snoozed occurrence count toward the limit?

Currently: YES (count incremented on snooze)
Result: Series ends at 2:02 with only 2 completions

But the snooze at 2:05 PM DOES fire (shadow snooze). So the user expects 3 completions total (2:01, 2:02, 2:05).

**The MISSED notification issue:**
Given the flow above, where does \"missed at 2:00 PM\" come from?

Possibility: When the ORIGINAL reminder completes at 2:02 PM, something in the flow triggers a \"missed\" check for the first occurrence (2:00 PM) because:
- The first occurrence was never marked as \"completed\" (it was snoozed)
- Some cleanup or sync logic sees the 2:00 PM trigger without a completion and posts \"missed\"

This would happen if `syncTriggerHistoryToJS` or `useCompletedAlarmSync` sees the 2:00 PM in native `triggerHistory` but not in JS `completionHistory` and treats it as missed.

---

## Summary of Root Causes

| Bug | Root Cause | Files Affected |
|-----|-----------|----------------|
| #1 Card shows \"Ended\" | JS `snoozeUntil` not set for shadow snooze; `nextReminderDate` is `undefined`; UI relies on these fields | `reminder-scheduler.ts`, `app/index.tsx` |
| #2 Shadow completion not in counter | Native records trigger under shadow ID not parent; possible race condition in event handling | `with-alarm-module.js` (line 254), `reminder-scheduler.ts` |
| #3 False \"missed\" notification | Snooze counts toward limit; no \"was snoozed\" tracking for individual occurrences; missed notification logic doesn't check snooze status | `with-alarm-module.js`, `missed-alarm-service.ts` |

---

## Proposed Fixes

### Fix #1: Expose Shadow Snooze Time to JS/UI

**Option A: Store snoozeUntil for shadow snoozes**

In `services/reminder-scheduler.ts` `rescheduleReminderById`:
```typescript
// After creating shadow snooze (line 56), also update JS reminder:
const snoozeTime = Date.now() + minutes * 60 * 1000;
const updated = {
    ...reminder,
    snoozeUntil: new Date(snoozeTime).toISOString(),  // NEW: Track shadow snooze time
    nextReminderDate: nextDate?.toISOString(),
    lastTriggeredAt: now.toISOString(),
    isActive: true
};
await updateReminder(updated);
```

**Option B: Add `pendingShadowSnoozeUntil` field**

In `types/reminder.ts`:
```typescript
interface Reminder {
    // ...existing fields
    pendingShadowSnoozeUntil?: string;  // NEW: Track shadow snooze time
}
```

Then set this in `rescheduleReminderById` and check in UI.

**Option C: Use native `pendingShadowSnooze` flag**

In native `getNativeReminderState` (add new field):
```kotlin
putBoolean(\"pendingShadowSnooze\", prefs.getBoolean(\"meta_${reminderId}_pendingShadowSnooze\", false))
```

Then in JS `markReminderDone`, check this flag:
```typescript
const parentState = await AlarmModule.getNativeReminderState(reminderId);
if (parentState?.pendingShadowSnooze) {
    hasPendingShadowSnooze = true;
}
```

And in UI:
```typescript
// In ReminderCard, check for pending shadow:
const nativeState = await AlarmModule?.getNativeReminderState(reminder.id);
if (nativeState?.pendingShadowSnooze) {
    // Show \"Snoozed\" instead of \"Ended\"
}
```

### Fix #2: Record Shadow Completion to Parent's History

**In native `AlarmActionBridge.kt` ALARM_DONE for shadow snooze:**

Change line 254 from:
```kotlin
recordNativeTrigger(context, reminderId, triggerTime)  // Shadow ID
```
To:
```kotlin
recordNativeTrigger(context, parentReminderId, triggerTime)  // Parent ID!
```

This ensures the parent's `triggerHistory` gets the shadow completion timestamp.

**In JS `markReminderDone` (lines 140-152):**

Ensure completion is always added to parent:
```typescript
if (isShadowSnooze) {
    const parentReminder = await getReminder(originalReminderId);
    if (parentReminder) {
        const existingHistory = parentReminder.completionHistory || [];
        const newHistory = [...existingHistory];
        
        if (!newHistory.includes(completedOccurrenceTime)) {
            newHistory.push(completedOccurrenceTime);
        }
        
        await updateReminder({
            ...parentReminder,
            completionHistory: newHistory.sort(),
            lastTriggeredAt: completedOccurrenceTime,
            isCompleted: true,  // Now truly complete
            isActive: false,
            pendingShadowSnoozeUntil: undefined  // Clear the pending flag
        });
    }
}
```

### Fix #3: Prevent False \"Missed\" Notification for Snoozed Occurrences

**Option A: Track per-occurrence snooze status**

In native when snooze is pressed:
```kotlin
// In AlarmActionBridge ALARM_SNOOZE (add after line 381):
metaPrefs.edit().apply {
    putInt(\"meta_${reminderId}_actualTriggerCount\", newCount)
    putBoolean(\"meta_${reminderId}_occurrence_${triggerTime}_snoozed\", true)  // NEW
    apply()
}
```

Then in any \"missed\" logic, check this flag.

**Option B: Don't post missed notification if snooze exists**

In native `postMissedNotification`:
```kotlin
private fun postMissedNotification(id: String?, title: String?) {
    if (id == null) return
    
    // NEW: Check if a shadow snooze exists for this reminder
    val metaPrefs = getSharedPreferences(\"DoMinderReminderMeta\", Context.MODE_PRIVATE)
    val shadowId = id + \"_snooze\"
    val hasShadowSnooze = metaPrefs.contains(\"meta_${shadowId}_isShadowSnooze\")
    
    if (hasShadowSnooze) {
        DebugLogger.log(\"AlarmActivity: Skipping missed notification - has pending shadow snooze\")
        return
    }
    
    // ...existing notification code
}
```

**Option C: Check `wasSnoozed` flag before showing missed**

In JS `missed-alarm-service.ts`:
```typescript
private async handleMissedAlarm(data: MissedAlarmData) {
    const { reminderId } = data;
    
    // NEW: Check if this occurrence was snoozed
    const reminder = await getReminder(reminderId);
    if (reminder?.snoozeUntil || reminder?.wasSnoozed) {
        console.log('[MissedAlarmService] Skipping - reminder was snoozed');
        return;
    }
    
    await this.showMissedNotification(data);
}
```

---

## Complete Fix Implementation Order

### Phase 1: Fix #3 (False Missed Notification) - Highest Impact

1. **Native:** In `postMissedNotification`, check for shadow snooze existence
2. **Native:** In `AlarmActivity.timeoutRunnable`, before sending missed broadcast, check if recently snoozed
3. **JS:** In `missed-alarm-service.ts`, check reminder's snooze status before showing notification

### Phase 2: Fix #1 (Card Shows \"Ended\") - User Confusion

1. **Native:** Add `pendingShadowSnooze` to `getNativeReminderState` return value
2. **JS:** In `rescheduleReminderById`, store shadow snooze time in `snoozeUntil` or new field
3. **UI:** In `ReminderCard`, check for pending shadow before showing \"Ended\"

### Phase 3: Fix #2 (Shadow Completion in History) - Data Accuracy

1. **Native:** Change `recordNativeTrigger` call to use parent ID instead of shadow ID
2. **JS:** Ensure `markReminderDone` isShadowSnooze path always updates parent's `completionHistory`
3. **JS:** Ensure counter badge reflects all completions including shadow

---

## Testing Checklist After Fixes

- [ ] Create \"Every 1 min, ends after 3, Ringer\" reminder at time T
- [ ] T+0: Alarm fires → Press **Snooze 5m**
- [ ] **Verify:** No \"missed\" notification appears
- [ ] T+1: Alarm fires → Press **Done**
- [ ] T+2: Alarm fires → Press **Done**
- [ ] **Verify:** Card shows \"Snoozed until T+5\" NOT \"Ended\"
- [ ] **Verify:** Counter shows \"2\" (T+1 and T+2)
- [ ] T+5: Snoozed alarm fires → Press **Done**
- [ ] **Verify:** Card now shows \"Ended\" 
- [ ] **Verify:** Counter shows \"3\" with green ring
- [ ] **Verify:** History popup shows T+1, T+2, T+5 (NOT T+0)
- [ ] **Verify:** No \"missed\" notification appears at any point
"
Observation: Create successful: /app/RINGER_SNOOZE_BUG_DETAILED_ANALYSIS.md