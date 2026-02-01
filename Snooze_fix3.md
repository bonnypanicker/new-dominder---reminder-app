Now I have a complete understanding. Let me create the comprehensive fix documentation for removing the Shadow ID pattern:
Action: file_editor create /app/temp_repo/SNOOZE_NO_SHADOW_ID_FIX.md --file-text "# Snooze Without Shadow ID - Simplified Implementation Guide

## Executive Summary

The current snooze implementation uses a \"Shadow ID\" pattern (`{reminderId}_snooze`) to handle snoozed alarms separately from the parent reminder. **Analysis shows this pattern is unnecessary and adds complexity without providing reliability benefits.**

This document outlines how to **remove the Shadow ID pattern** and implement a simpler, more reliable snooze mechanism.

---

## Why Shadow ID is NOT Required

### Current Shadow ID Flow (Complex)

```
User presses Snooze 5min
    ↓
Native creates shadowId = \"abc123_snooze\"
    ↓
Native stores separate metadata for shadowId
    ↓
Native schedules alarm for shadowId
    ↓
Snooze fires → AlarmReceiver gets shadowId
    ↓
JS receives \"abc123_snooze\" in markReminderDone
    ↓
JS must strip \"_snooze\" to find parent
    ↓
JS increments parent's occurrence count
    ↓
JS schedules next occurrence for parent
```

**Problems with this approach:**
1. **Metadata Duplication** - Stores 20+ fields redundantly for each snooze
2. **ID Resolution Overhead** - Every completion requires suffix stripping
3. **History Fragmentation** - Shadow completions must be manually linked to parent
4. **Race Conditions** - Two IDs = two potential paths for the same logical event
5. **Cleanup Complexity** - Must clean up shadow metadata after snooze completes

### Proposed Simple Flow (No Shadow ID)

```
User presses Snooze 5min
    ↓
Native updates EXISTING reminder's alarm time
    ↓
Native sets snoozeUntil in metadata
    ↓
Native schedules alarm for ORIGINAL reminderId at snooze time
    ↓
Snooze fires → AlarmReceiver gets original reminderId
    ↓
JS receives original reminderId in markReminderDone
    ↓
JS checks snoozeUntil flag → clears it
    ↓
JS increments occurrence count
    ↓
JS schedules next occurrence
```

**Benefits:**
1. **Single ID** - One reminder ID throughout the entire flow
2. **No Metadata Duplication** - Use existing reminder's metadata
3. **Clean History** - All completions directly linked to parent
4. **Simpler State** - `snoozeUntil` flag on parent tells the whole story
5. **Reduced Race Conditions** - Single path = fewer timing issues

---

## Implementation Changes

### 1. Native Layer (`plugins/with-alarm-module.js`)

#### 1.1 AlarmActionBridge.kt - ALARM_SNOOZE Handler

**REMOVE:**
```kotlin
// REMOVE: Shadow ID creation
val shadowId = reminderId + \"_snooze\"

// REMOVE: Shadow metadata storage (lines 306-336)
metaPrefs.edit().apply {
    putString(\"meta_\${shadowId}_title\", ...)
    // ... 20+ fields
}

// REMOVE: Shadow alarm scheduling
scheduleNativeAlarm(context, shadowId, \"Snoozed: \${title}\", priority, snoozeMinutes)
```

**REPLACE WITH:**
```kotlin
\"app.rork.dominder.ALARM_SNOOZE\" -> {
    val reminderId = intent.getStringExtra(\"reminderId\")
    val snoozeMinutes = intent.getIntExtra(\"snoozeMinutes\", 0)
    val title = intent.getStringExtra(\"title\") ?: \"Reminder\"
    val priority = intent.getStringExtra(\"priority\") ?: \"medium\"

    DebugLogger.log(\"AlarmActionBridge: ALARM_SNOOZE - reminderId: \${reminderId}, minutes: \${snoozeMinutes}\")
    
    if (reminderId != null) {
        val metaPrefs = context.getSharedPreferences(\"DoMinderReminderMeta\", Context.MODE_PRIVATE)
        val snoozeTimeMs = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000L)
        
        // Set snoozeUntil on the ORIGINAL reminder's metadata
        metaPrefs.edit().apply {
            putLong(\"meta_\${reminderId}_snoozeUntil\", snoozeTimeMs)
            putBoolean(\"meta_\${reminderId}_wasSnoozed\", true)
            apply()
        }
        
        // Cancel any existing alarm for this reminder
        cancelNativeAlarm(context, reminderId)
        
        // Schedule alarm for ORIGINAL reminderId at snooze time
        scheduleNativeAlarmAtTime(context, reminderId, title, priority, snoozeTimeMs)
        
        DebugLogger.log(\"AlarmActionBridge: Snoozed \${reminderId} until \${java.util.Date(snoozeTimeMs)}\")
        
        // Emit to JS for UI update
        emitEventToReactNative(context, \"alarmSnooze\", reminderId, snoozeMinutes)
    }
}
```

#### 1.2 AlarmReceiver.kt - When Snoozed Alarm Fires

**ADD CHECK:**
```kotlin
override fun onReceive(context: Context, intent: Intent) {
    val reminderId = intent.getStringExtra(\"reminderId\") ?: return
    
    val metaPrefs = context.getSharedPreferences(\"DoMinderReminderMeta\", Context.MODE_PRIVATE)
    val snoozeUntil = metaPrefs.getLong(\"meta_\${reminderId}_snoozeUntil\", 0L)
    val wasSnoozed = metaPrefs.getBoolean(\"meta_\${reminderId}_wasSnoozed\", false)
    
    // Clear snooze flags since we're now triggering
    if (wasSnoozed) {
        metaPrefs.edit().apply {
            remove(\"meta_\${reminderId}_snoozeUntil\")
            putBoolean(\"meta_\${reminderId}_wasSnoozed\", false)
            apply()
        }
        DebugLogger.log(\"AlarmReceiver: Cleared snooze state for \${reminderId}\")
    }
    
    // Continue with normal alarm handling...
    // (show AlarmActivity, increment actualTriggerCount, etc.)
}
```

#### 1.3 Remove Shadow ID Handling from ALARM_DONE

**REMOVE from scheduleNextOccurrenceIfNeeded:**
```kotlin
// REMOVE these lines:
val originalReminderId = if (reminderId.endsWith(\"_snooze\")) {
    reminderId.removeSuffix(\"_snooze\")
} else {
    reminderId
}
```

**REPLACE WITH:**
```kotlin
// Direct use - no suffix checking needed
val originalReminderId = reminderId
```

---

### 2. JS Layer (`services/reminder-scheduler.ts`)

#### 2.1 rescheduleReminderById - Simplified

**REMOVE:**
```typescript
// REMOVE: Shadow ID creation
const shadowId = `${reminderId}_snooze`;

// REMOVE: Shadow metadata storage
await AlarmModule.storeReminderMetadata(
    shadowId,
    'none', // Repeat 'none' for snooze instance
    // ... many parameters
);

// REMOVE: Shadow alarm scheduling
await AlarmModule.scheduleAlarm(shadowId, snoozeTime, `Snoozed: ${reminder.title}`, priority);
```

**REPLACE WITH:**
```typescript
export async function rescheduleReminderById(reminderId: string, minutes: number) {
    console.log(`[Scheduler] Snoozing reminder ${reminderId} for ${minutes} minutes`);

    const reminder = await getReminder(reminderId);
    if (!reminder || reminder.isCompleted) {
        console.log(`[Scheduler] Reminder ${reminderId} not found or completed, skipping snooze.`);
        return;
    }

    const snoozeTime = Date.now() + minutes * 60 * 1000;
    const snoozeEndDate = new Date(snoozeTime);

    // Cancel current notifications
    await notificationService.cancelAllNotificationsForReminder(reminderId);

    // Update reminder with snooze state
    const updated = {
        ...reminder,
        snoozeUntil: snoozeEndDate.toISOString(),
        wasSnoozed: true,
        isActive: true
    };
    await updateReminder(updated);

    // Schedule alarm at snooze time using ORIGINAL ID
    if (AlarmModule?.scheduleAlarm) {
        try {
            // Update snoozeUntil in native metadata
            if (AlarmModule.setSnoozeUntil) {
                await AlarmModule.setSnoozeUntil(reminderId, snoozeTime);
            }
            
            // Schedule the alarm with original ID
            await AlarmModule.scheduleAlarm(
                reminderId, 
                snoozeTime, 
                reminder.title, 
                reminder.priority
            );
            console.log(`[Scheduler] Scheduled snooze for ${reminderId} at ${snoozeEndDate.toISOString()}`);
        } catch (e) {
            console.error(`[Scheduler] Error scheduling snooze:`, e);
        }
    }

    DeviceEventEmitter.emit('remindersChanged');
}
```

#### 2.2 markReminderDone - Remove Shadow ID Handling

**REMOVE:**
```typescript
// REMOVE these lines:
let actualId = reminderId;
let isShadowSnooze = false;
if (reminderId.endsWith('_snooze')) {
    actualId = reminderId.replace('_snooze', '');
    isShadowSnooze = true;
    console.log(`[Scheduler] Detected Shadow Snooze ID. Resolved to parent: ${actualId}`);
}

// REMOVE:
if (isShadowSnooze) {
    console.log(`[Scheduler] Completing a Shadow Snooze. Forcing occurrence increment.`);
    shouldIncrementOccurrence = true;
}
```

**REPLACE WITH:**
```typescript
export async function markReminderDone(
    reminderId: string, 
    shouldIncrementOccurrence: boolean = true, 
    triggerTimeMs?: number
) {
    console.log(`[Scheduler] markReminderDone: ${reminderId}`);

    let reminder = await getReminder(reminderId);
    if (!reminder) {
        console.log(`[Scheduler] Reminder ${reminderId} not found`);
        return;
    }

    // Check if this was a snoozed alarm completing
    const wasSnoozeCompletion = reminder.wasSnoozed === true;
    
    if (wasSnoozeCompletion) {
        console.log(`[Scheduler] Snoozed alarm completing for ${reminderId}`);
        // Clear snooze state
        reminder.snoozeUntil = undefined;
        reminder.wasSnoozed = undefined;
    }

    // Continue with normal completion logic...
    // (No special handling needed - same ID throughout)
}
```

---

### 3. Native Module (`AlarmModule.kt`)

#### 3.1 Add setSnoozeUntil Method

```kotlin
@ReactMethod
fun setSnoozeUntil(reminderId: String, snoozeTimeMs: Double, promise: Promise) {
    try {
        val prefs = reactContext.getSharedPreferences(\"DoMinderReminderMeta\", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putLong(\"meta_\${reminderId}_snoozeUntil\", snoozeTimeMs.toLong())
            putBoolean(\"meta_\${reminderId}_wasSnoozed\", true)
            apply()
        }
        DebugLogger.log(\"AlarmModule: Set snoozeUntil for \${reminderId} to \${snoozeTimeMs}\")
        promise.resolve(true)
    } catch (e: Exception) {
        DebugLogger.log(\"AlarmModule: Error setting snoozeUntil: \${e.message}\")
        promise.reject(\"ERROR\", e.message, e)
    }
}

@ReactMethod
fun clearSnoozeUntil(reminderId: String, promise: Promise) {
    try {
        val prefs = reactContext.getSharedPreferences(\"DoMinderReminderMeta\", Context.MODE_PRIVATE)
        prefs.edit().apply {
            remove(\"meta_\${reminderId}_snoozeUntil\")
            putBoolean(\"meta_\${reminderId}_wasSnoozed\", false)
            apply()
        }
        DebugLogger.log(\"AlarmModule: Cleared snoozeUntil for \${reminderId}\")
        promise.resolve(true)
    } catch (e: Exception) {
        DebugLogger.log(\"AlarmModule: Error clearing snoozeUntil: \${e.message}\")
        promise.reject(\"ERROR\", e.message, e)
    }
}
```

---

### 4. Sync Hook (`useCompletedAlarmSync.ts`)

#### 4.1 Remove Shadow ID Processing

**REMOVE from getReminder lookup:**
```typescript
// REMOVE: No need to handle shadow IDs
// The reminder ID is always the original
```

The sync hook requires minimal changes since it already processes by `reminderId`. Just ensure no special handling for `_snooze` suffix.

---

## State Flow Comparison

### Old Flow (With Shadow ID)

| Step | Native State | JS State |
|------|-------------|----------|
| Snooze pressed | Creates `abc_snooze` metadata | Creates `abc_snooze` schedule |
| Snooze fires | `abc_snooze` triggers | Receives `abc_snooze` |
| Done pressed | Increments `abc_snooze` count | Must resolve to `abc` |
| Next scheduled | For `abc` (confusion!) | For `abc` |

### New Flow (No Shadow ID)

| Step | Native State | JS State |
|------|-------------|----------|
| Snooze pressed | Sets `abc.snoozeUntil` | Sets `abc.snoozeUntil` |
| Snooze fires | `abc` triggers, clears flag | Receives `abc` |
| Done pressed | Increments `abc` count | Processes `abc` directly |
| Next scheduled | For `abc` | For `abc` |

---

## Testing Scenarios

### Test Case 1: Basic Snooze (App Running)
1. Create \"Every 1 minute\" reminder with 3 occurrences
2. Wait for trigger at 2:00 PM
3. Press Snooze 5min
4. **Verify:** No triggers at 2:01, 2:02, 2:03, 2:04 PM
5. **Verify:** Alarm triggers at 2:05 PM with original title (no \"Snoozed:\" prefix)
6. Press Done
7. **Verify:** Occurrence 1 recorded, next at 2:06 PM

### Test Case 2: Snooze (App Killed)
1. Create \"Every 1 minute\" reminder
2. Wait for trigger
3. Press Snooze 5min
4. Force-kill app immediately
5. **Verify:** Snooze fires at correct time
6. Press Done on full-screen alarm
7. Re-open app
8. **Verify:** State correctly shows 1 occurrence completed

### Test Case 3: Multiple Snoozes
1. Trigger reminder
2. Snooze 5min → Snooze 10min (before first expires)
3. **Verify:** Only ONE alarm scheduled (at 10min mark)
4. **Verify:** No orphaned snooze alarms

### Test Case 4: Snooze with End Constraint
1. Create reminder ending after 2 occurrences
2. Trigger occurrence 1
3. Snooze past theoretical occurrence 2 time
4. **Verify:** Snooze fires
5. Press Done
6. **Verify:** Reminder marked complete (2 occurrences done)

---

## Migration Considerations

### Backward Compatibility
- Clean up any existing `*_snooze` entries from SharedPreferences on app update
- In AlarmReceiver, if ID ends with `_snooze`, strip it and process as parent

```kotlin
// Migration helper in AlarmReceiver
var actualId = reminderId
if (actualId.endsWith(\"_snooze\")) {
    DebugLogger.log(\"AlarmReceiver: Migrating legacy shadow snooze ID\")
    actualId = actualId.removeSuffix(\"_snooze\")
    // Clean up old shadow metadata
    cleanupLegacyShadowMetadata(context, reminderId)
}
```

---

## Code Removal Checklist

### Native (`plugins/with-alarm-module.js`)

- [ ] Remove `shadowId` variable creation in ALARM_SNOOZE (line ~285)
- [ ] Remove shadow metadata storage block (lines ~306-336)
- [ ] Remove `scheduleNativeAlarm(context, shadowId, ...)` call (line ~339)
- [ ] Remove `_snooze` suffix checking in `scheduleNextOccurrenceIfNeeded` (lines ~415-417)
- [ ] Add `snoozeUntil` and `wasSnoozed` to metadata schema

### JS (`services/reminder-scheduler.ts`)

- [ ] Remove `shadowId` creation in `rescheduleReminderById` (line ~28)
- [ ] Remove shadow metadata storage calls (lines ~35-60)
- [ ] Remove `_snooze` suffix detection in `markReminderDone` (lines ~113-120)
- [ ] Remove `isShadowSnooze` special increment logic (lines ~132-135)

### JS (`hooks/useCompletedAlarmSync.ts`)

- [ ] No major changes needed - verify no shadow ID assumptions

---

## Benefits Summary

| Aspect | With Shadow ID | Without Shadow ID |
|--------|---------------|-------------------|
| Code Complexity | High | Low |
| Metadata Storage | 2x per snooze | 1x (reuse existing) |
| ID Resolution | Required | Not needed |
| Race Conditions | Possible (2 paths) | Minimal (1 path) |
| History Tracking | Requires linking | Direct |
| Debugging | Harder (2 IDs) | Easier (1 ID) |
| Prebuild Size | Larger | Smaller |

---

## Conclusion

The Shadow ID pattern was likely introduced to separate \"snooze state\" from \"reminder state,\" but modern Android AlarmManager and the `snoozeUntil` flag on the reminder itself achieve the same goal more simply.

**Removing Shadow ID will:**
1. Reduce code by ~100 lines
2. Eliminate an entire class of sync bugs
3. Make debugging significantly easier
4. Improve reliability for app-killed scenarios

**The key insight:** A snooze is just a temporary reschedule of the **same** reminder, not a new reminder. Treating it as such simplifies everything.
"
Observation: Create successful: /app/temp_repo/SNOOZE_NO_SHADOW_ID_FIX.md