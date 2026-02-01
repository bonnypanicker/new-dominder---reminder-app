Now I have a comprehensive understanding. Let me create the fix documentation file:
Action: file_editor create /app/temp_repo/SNOOZE_FIX_LOCAL.md --file-text "# Snooze Fix Analysis for Ringer Mode - Local Implementation Guide

## Problem Statement

Snooze functionality in \"Ringer mode\" (fullscreen intent alarms with `priority: \"high\"`) is not working as expected for repeating reminders.

### Expected Behavior (from Snooze_fix.md)

**Scenario:** Reminder set to repeat every 1 minute, starting at 2:00 PM, ending after 3 occurrences.

1. Reminder triggers at 2:00 PM
2. User presses **Snooze 5min**
3. **DO NOT** trigger at 2:01 PM and 2:02 PM (series is \"paused\")
4. Show \"Snoozed until 2:05 PM\" badge in Active Reminders
5. Trigger at 2:05 PM
6. Update completion history
7. Occurrence 1 completed → Occurrences 2 and 3 at 2:06 PM, 2:07 PM
8. Reminder completed after 3 total occurrences

---

## Current Implementation Analysis

### Architecture Overview

The app uses a **hybrid Native-JS synchronization** pattern:

| Component | Location | Role |
|-----------|----------|------|
| **AlarmActivity.kt** | `plugins/with-alarm-module.js` (lines 1215-1550) | Full-screen alarm UI |
| **AlarmActionBridge.kt** | `plugins/with-alarm-module.js` (lines 211-866) | Native broadcast handler |
| **AlarmReceiver.kt** | `plugins/with-alarm-module.js` (lines 1600+) | AlarmManager receiver |
| **reminder-scheduler.ts** | `services/reminder-scheduler.ts` | JS snooze/done logic |
| **useCompletedAlarmSync.ts** | `hooks/useCompletedAlarmSync.ts` | JS-Native state sync |

### Snooze Flow (Current)

#### Path A: App Running (React Native Context Available)
```
AlarmActivity.handleSnooze(minutes)
    ↓
Persist to SharedPreferences: snoozed_{reminderId} = \"{timestamp}:{minutes}\"
    ↓
Broadcast: app.rork.dominder.ALARM_SNOOZE
    ↓
AlarmActionBridge.onReceive()
    ├─ For REPEATING reminders:
    │   ├─ Create shadow snooze: {reminderId}_snooze
    │   ├─ Schedule native alarm for shadow
    │   └─ Call scheduleNextOccurrenceIfNeeded() ← PROBLEM: Series advances immediately
    │
    └─ For ONE-OFF reminders:
        └─ Update metadata + schedule native alarm
    ↓
emitEventToReactNative(\"alarmSnooze\", reminderId, snoozeMinutes)
    ↓
JS: reminder-scheduler.ts → rescheduleReminderById()
    ├─ For REPEATING reminders:
    │   ├─ Create shadow snooze schedule
    │   └─ Advance series with calculateNextReminderDate() ← DOUBLE PROCESSING
    │
    └─ For ONE-OFF reminders:
        └─ Set snoozeUntil and wasSnoozed
```

#### Path B: App Killed (No React Native Context)
```
AlarmActivity.handleSnooze(minutes)
    ↓
Persist to SharedPreferences: snoozed_{reminderId}
    ↓
Broadcast: app.rork.dominder.ALARM_SNOOZE
    ↓
AlarmActionBridge.onReceive()
    ↓
Native schedules shadow snooze + advances series
    ↓
[Later when app opens]
    ↓
useCompletedAlarmSync → getSnoozedAlarms() → rescheduleReminderById()
```

---

## Issues Identified

### Issue 1: Dual Execution of Series Advance

When snooze is pressed with app running, **BOTH** native and JS advance the series:

**Native (AlarmActionBridge.kt, line 337):**
```kotlin
// 2. Advance Series (Schedule Next Regular Occurrence)
scheduleNextOccurrenceIfNeeded(context, reminderId)
```

**JS (reminder-scheduler.ts, lines 65-79):**
```typescript
// 2. Advance the Series immediately
const calcContext = { ...reminder, lastTriggeredAt: now.toISOString() };
const nextDate = calculateNextReminderDate(calcContext as any, now);
```

**Result:** Series advances twice, potentially causing:
- Time slipping (next occurrence scheduled too far ahead)
- Occurrence count mismatch
- Duplicate triggers

### Issue 2: Series Continues During Snooze Period

When snooze is pressed, the current implementation **advances the series immediately**. This means:

- If user snoozes at 2:00 PM for 5 minutes, the series advances to 2:01 PM
- At 2:05 PM, the **snooze shadow** fires
- But the series has also been firing at 2:01, 2:02, 2:03, 2:04 PM

**Expected:** Series should PAUSE during snooze, then resume from snooze end time.

### Issue 3: Missing `snoozeUntil` State Persistence for Repeating Reminders

In `rescheduleReminderById()` for repeating reminders:
```typescript
const updated = {
  ...reminder,
  nextReminderDate: nextDate.toISOString(),
  lastTriggeredAt: now.toISOString(),
  snoozeUntil: undefined,  // ← Clears snooze state!
  wasSnoozed: undefined,
  isActive: true
};
```

This clears `snoozeUntil`, making it impossible to show \"Snoozed until X\" in the UI.

### Issue 4: Race Condition Between Native and JS

When app is transitioning between states (foreground ↔ background), there's a timing window where:
1. Native starts processing snooze
2. App becomes active
3. `useCompletedAlarmSync` reads SharedPreferences
4. Both native and JS process the same snooze

### Issue 5: Shadow Snooze ID Handling

The shadow snooze uses `{reminderId}_snooze` as its ID:
- When shadow fires, it's treated as a separate reminder
- History tracking becomes fragmented
- Original reminder's occurrence count may not sync properly

---

## Recommended Fixes

### Fix 1: Single Source of Truth for Series Advancement

**Location:** `plugins/with-alarm-module.js` (AlarmActionBridge.kt)

**Change:** Remove `scheduleNextOccurrenceIfNeeded()` from snooze handling when React context is available.

```kotlin
// In ALARM_SNOOZE handler (around line 337):
\"app.rork.dominder.ALARM_SNOOZE\" -> {
    // ...existing shadow snooze scheduling...
    
    // 2. ONLY advance series if React Native is NOT running
    if (!isReactContextAvailable(context)) {
        scheduleNextOccurrenceIfNeeded(context, reminderId)
    } else {
        DebugLogger.log(\"AlarmActionBridge: React context available, JS will handle series advancement\")
    }
    
    // Emit event to JS (if available)
    emitEventToReactNative(context, \"alarmSnooze\", reminderId, snoozeMinutes)
}
```

### Fix 2: Implement \"Snooze Pause\" Logic for Repeating Reminders

**Location:** `services/reminder-scheduler.ts` → `rescheduleReminderById()`

**New Logic:**
```typescript
if (reminder.repeatType !== 'none') {
    const snoozeTime = Date.now() + minutes * 60 * 1000;
    
    // Calculate what the \"next occurrence after snooze\" should be
    const snoozeEndDate = new Date(snoozeTime);
    const calcContext = { ...reminder, lastTriggeredAt: snoozeEndDate.toISOString() };
    const nextAfterSnooze = calculateNextReminderDate(calcContext, snoozeEndDate);
    
    // Update reminder with snooze state
    const updated = {
        ...reminder,
        snoozeUntil: snoozeEndDate.toISOString(),
        wasSnoozed: true,
        // Keep series paused - next occurrence is AFTER snooze ends
        nextReminderDate: nextAfterSnooze ? nextAfterSnooze.toISOString() : undefined,
        // DO NOT update lastTriggeredAt yet - that happens when snooze fires
        isActive: true
    };
    
    await updateReminder(updated);
    
    // Schedule shadow snooze notification
    if (AlarmModule?.storeReminderMetadata) {
        await AlarmModule.storeReminderMetadata(/* shadow snooze params */);
        await AlarmModule.scheduleAlarm(shadowId, snoozeTime, `Snoozed: ${reminder.title}`, priority);
    }
    
    // DO NOT schedule regular series notification until snooze expires
    // The shadow snooze firing will trigger the next occurrence
}
```

### Fix 3: Handle Shadow Snooze Completion Correctly

**Location:** `services/reminder-scheduler.ts` → `markReminderDone()`

**Add check for shadow snooze IDs:**
```typescript
export async function markReminderDone(reminderId: string, ...) {
    // Check if this is a shadow snooze completing
    const isShadowSnooze = reminderId.endsWith('_snooze');
    const originalId = isShadowSnooze ? reminderId.replace('_snooze', '') : reminderId;
    
    let reminder = await getReminder(originalId);
    
    if (!reminder) {
        console.log(`[Scheduler] Reminder ${originalId} not found`);
        return;
    }
    
    if (isShadowSnooze) {
        // Clear snooze state
        reminder.snoozeUntil = undefined;
        reminder.wasSnoozed = undefined;
        
        // Now calculate and schedule next occurrence
        const nextDate = calculateNextReminderDate(reminder, new Date());
        // ...rest of logic
    }
}
```

### Fix 4: Add Snooze State to UI

**Location:** App's active reminders display component

**Check for snoozeUntil:**
```typescript
const isSnoozed = reminder.snoozeUntil && new Date(reminder.snoozeUntil) > new Date();
if (isSnoozed) {
    // Show \"Snoozed until X\" badge
    const snoozeTime = new Date(reminder.snoozeUntil).toLocaleTimeString();
    // Render badge
}
```

### Fix 5: Prevent Double Processing via SharedPreferences Flag

**Location:** Both native (AlarmActionBridge.kt) and JS (useCompletedAlarmSync.ts)

**Native - Set processing flag:**
```kotlin
// Before processing snooze
val actionPrefs = context.getSharedPreferences(\"DoMinderAlarmActions\", Context.MODE_PRIVATE)
val processingKey = \"processing_snooze_${reminderId}\"
actionPrefs.edit().putBoolean(processingKey, true).apply()

// After native processing complete
actionPrefs.edit().remove(processingKey).apply()
```

**JS - Check flag before processing:**
```typescript
// In useCompletedAlarmSync
const isBeingProcessedNatively = await AlarmModule.checkProcessingFlag?.(reminderId);
if (isBeingProcessedNatively) {
    console.log('[AlarmSync] Snooze being processed by native, skipping JS processing');
    return;
}
```

### Fix 6: Unified Occurrence Counting

**Problem:** Both native and JS track occurrence counts independently.

**Solution:** Use `actualTriggerCount` from native as the single source of truth.

**Location:** `services/reminder-scheduler.ts` → `markReminderDone()`

```typescript
// Always sync from native before processing
if (AlarmModule?.getNativeReminderState) {
    const nativeState = await AlarmModule.getNativeReminderState(reminderId);
    if (nativeState) {
        reminder.occurrenceCount = nativeState.actualTriggerCount;
    }
}
```

---

## Implementation Order

1. **Fix 1** - Single source of truth (prevents immediate issues)
2. **Fix 3** - Shadow snooze completion handling (fixes history tracking)
3. **Fix 2** - Snooze pause logic (implements expected behavior)
4. **Fix 6** - Unified occurrence counting (ensures consistency)
5. **Fix 4** - UI snooze state (user visibility)
6. **Fix 5** - Processing flags (edge case prevention)

---

## Testing Checklist

### Test Case 1: Basic Snooze with App Running
- [ ] Create \"Every 1 minute\" reminder with 3 occurrences
- [ ] Let it trigger
- [ ] Press Snooze 5min
- [ ] Verify series DOES NOT fire during snooze period
- [ ] Verify snooze fires at correct time
- [ ] Verify series resumes correctly after snooze

### Test Case 2: Snooze with App Killed
- [ ] Create \"Every 1 minute\" reminder
- [ ] Let it trigger
- [ ] Press Snooze 5min
- [ ] Force-kill app
- [ ] Verify snooze fires at correct time
- [ ] Re-open app
- [ ] Verify state is correctly synced

### Test Case 3: Multiple Snoozes
- [ ] Snooze once, then snooze again before first expires
- [ ] Verify only latest snooze is honored
- [ ] Verify no duplicate triggers

### Test Case 4: Snooze with \"Ends At\" Time Constraint
- [ ] Create reminder ending at specific time
- [ ] Snooze past the end time
- [ ] Verify series ends correctly

### Test Case 5: State Transition During Snooze
- [ ] Create snooze
- [ ] Switch app to background
- [ ] Bring app to foreground
- [ ] Verify no duplicate processing

---

## File Change Summary

| File | Changes Required |
|------|------------------|
| `plugins/with-alarm-module.js` | Fix 1, Fix 5 (native side) |
| `services/reminder-scheduler.ts` | Fix 2, Fix 3, Fix 6 |
| `hooks/useCompletedAlarmSync.ts` | Fix 5 (JS side) |
| UI component for active reminders | Fix 4 |

---

## Prebuild Notes

After making changes to `plugins/with-alarm-module.js`:
1. Run `npx expo prebuild --clean` to regenerate native code
2. Test on physical Android device (snooze timing is critical)
3. Test both app-running and app-killed scenarios

---

## Appendix: Key Code Locations

### Native Snooze Entry Point
`plugins/with-alarm-module.js` → AlarmActivity.kt → `handleSnooze(minutes)` (line 1344)

### Native Snooze Processing
`plugins/with-alarm-module.js` → AlarmActionBridge.kt → `onReceive()` → `ALARM_SNOOZE` case (line 264)

### JS Snooze Processing
`services/reminder-scheduler.ts` → `rescheduleReminderById()` (line 8)

### Sync Hook
`hooks/useCompletedAlarmSync.ts` → `syncCompletedAlarms()` → snoozed alarms section (line 128)

### Next Occurrence Calculation
`services/reminder-utils.ts` → `calculateNextReminderDate()` (line 34)
"
Observation: Create successful: /app/temp_repo/SNOOZE_FIX_LOCAL.md