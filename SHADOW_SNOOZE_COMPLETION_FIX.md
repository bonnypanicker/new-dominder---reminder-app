# 🔧 SHADOW SNOOZE COMPLETION FIX

## Problem
When snoozing a repeating "Every" reminder in Ringer mode:
1. Shadow snooze created with ID `reminderId_snooze`
2. Original series advances to next occurrence
3. Series completes after N occurrences → moves to completed page
4. BUT shadow snooze still pending → fires later even though card is "completed"
5. Shadow snooze completion not added to original reminder's history

## Solution
1. Detect shadow snooze completions (ID ends with `_snooze`)
2. Add shadow snooze completion to original reminder's history
3. Don't mark original as complete if shadow snooze is pending
4. Mark original as complete only after shadow snooze fires

## Changes Made
- `services/reminder-scheduler.ts`:
  - Added shadow snooze detection in `markReminderDone()`
  - Added shadow snooze completion handler
  - Added pending shadow snooze check before marking complete
  - Merge history and complete original when shadow snooze fires

## Testing
1. Create "Every 1 min, 3 times" reminder at 2:00pm
2. At 2:00pm → Snooze 5 min
3. At 2:01pm → Done
4. At 2:02pm → Done (series complete, but card stays active)
5. At 2:05pm → Shadow snooze fires → Done
6. Card now moves to completed with all 4 completions in history
