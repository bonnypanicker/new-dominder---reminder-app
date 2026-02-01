# Snooze and Occurrence Counting Fix

## Problem
When a repeating reminder (e.g., "every 1 minute, end after 3 occurrences") is snoozed, the series ends prematurely and the card doesn't move to the completed tab.

### Example Scenario
- Set reminder at 1:39pm, repeat every 1 min, end after 3 occurrences
- 1:39pm (Occ 1): Triggered → Snoozed 5 min
- 1:44pm (Snoozed): Triggered
- 1:45pm (Occ 2): Triggered  
- 1:46pm (Occ 3): **DIDN'T TRIGGER** ❌
- Shows "Ended" but card stuck in active reminders ❌

### Root Cause
**Double Increment Bug**: When a shadow snooze completed, BOTH native code AND JS were incrementing the occurrence count, causing:
- Shadow snooze completion: count 0→2 (should stay at 1)
- This made the series think it had reached the limit prematurely

## Fixes Applied

### 1. Native Code (plugins/with-alarm-module.js)
**Changed**: Shadow snooze completion no longer increments parent occurrence count in native
- Removed: `val newParentCount = parentActualCount + 1`
- Removed: `putInt("meta_${parentReminderId}_actualTriggerCount", newParentCount)`
- Rationale: JS will handle the increment to avoid double counting

### 2. JS Scheduler (services/reminder-scheduler.ts)
**Changed**: Shadow snooze completion doesn't increment occurrence count
- Before: `const newOccurrenceCount = currentOccurred + 1`
- After: `const currentOccurred = reminder.occurrenceCount ?? 0` (no increment)
- Rationale: Shadow snooze is a **delayed completion of the SAME occurrence**, not a new occurrence

### 3. Notification Delivery Handler (app/_layout.tsx)
**Changed**: When series ends (no next date), properly mark as completed
- Before: Left as `isActive: true, isCompleted: false` 
- After: Mark as `isActive: false, isCompleted: true` with full history
- Also: Cancel notifications and clear native metadata
- Rationale: Ensures card moves to completed tab when series ends

## Expected Behavior After Fix

### Standard Mode (notifee)
1. **1:39pm (Occ 1)**: Delivered → count: 0→1 → Snooze 5min → Shadow created
2. **1:44pm (Shadow)**: Fires → Done → **count stays at 1** ✓ → Schedule next
3. **1:45pm (Occ 2)**: Delivered → count: 1→2 → Done → Schedule next  
4. **1:46pm (Occ 3)**: Delivered → count: 2→3 → Done → **Mark complete & move to completed tab** ✓

### Ringer Mode (fullscreen intent)
Same logic applies - native and JS are now synchronized:
- Native doesn't increment on shadow snooze completion
- JS handles all occurrence counting
- Proper completion handling when series ends

## Key Principles
1. **Snooze is NOT an occurrence** - it's a delay of the current occurrence
2. **Single source of truth** - Only JS increments occurrence count (native just records triggers)
3. **Proper completion** - When series ends, mark as complete and move to completed tab immediately

## Testing Checklist
- [ ] Standard mode: Set reminder "every 1 min, end after 3 occurrences", snooze occ 1, verify all 3 occurrences trigger
- [ ] Ringer mode: Same test with high priority reminder
- [ ] Verify card moves to completed tab after final occurrence
- [ ] Verify "Done" button works on final occurrence
- [ ] Verify snooze count doesn't affect total occurrences
