# 🔧 SNOOZE EXTRA TRIGGER FIX

## Problem
When snoozing the 1st occurrence of "Every 1 min, 3 times":
- 2:00pm → 1st trigger (snoozed)
- 2:01pm → 2nd trigger
- 2:02pm → 3rd trigger
- 2:03pm → 4th trigger ❌ (shouldn't exist!)
- 2:05pm → Snoozed reminder

**Expected:** Only 3 triggers total
**Actual:** 4 triggers + snooze

## Root Cause
`scheduleNextOccurrenceIfNeeded()` checks `actualTriggerCount >= untilCount`
but doesn't account for pending shadow snooze.

When shadow snooze exists, it will count as one occurrence when completed,
so effective count should be `actualTriggerCount + 1`.

## Solution
Check if shadow snooze metadata exists and is not completed.
If yes, use `effectiveCount = actualTriggerCount + 1` for limit check.

## Flow with Fix
2:00pm → Snooze
  - actualTriggerCount = 0
  - Shadow snooze created
  - effectiveCount = 0 + 1 = 1
  - Check: 1 >= 3? No → Schedule 2:01pm ✓

2:01pm → Done
  - actualTriggerCount = 1
  - Shadow snooze still pending
  - effectiveCount = 1 + 1 = 2
  - Check: 2 >= 3? No → Schedule 2:02pm ✓

2:02pm → Done
  - actualTriggerCount = 2
  - Shadow snooze still pending
  - effectiveCount = 2 + 1 = 3
  - Check: 3 >= 3? Yes → DON'T schedule 2:03pm ✓

2:05pm → Shadow snooze Done
  - actualTriggerCount stays 2 (shadow doesn't increment)
  - Shadow snooze completed
  - Card moves to completed

**Result: 3 triggers total** ✓

