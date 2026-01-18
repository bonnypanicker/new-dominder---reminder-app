# Multi-Select "Every" Reminder Occurrence Count Bug Analysis

## Issue Summary

When setting a "Standard Mode" reminder with:
- Repeat Type: **Every** (e.g., every 1 hour)
- **Multi-select enabled** with multiple dates selected
- **Ends after N occurrences** (e.g., 3 occurrences)

**Observed Problems:**
1. Sometimes triggers correctly on first date, but fails on subsequent dates (may only trigger when app is opened)
2. Sometimes doesn't trigger on first day at all
3. After final trigger on first selected day, shows "Ended" and marks as completed - future selected dates never trigger

## Root Cause Analysis

### Problem 1: Global Occurrence Count vs Per-Day Occurrence Count

**Current Implementation:**
- `occurrenceCount` is a **global counter** across ALL selected dates
- `untilCount` (e.g., 3) is treated as a **total limit** across all dates
- When `occurrenceCount >= untilCount`, `calculateNextReminderDate()` returns `null` (lines 267-272 in reminder-utils.ts)

**Example Scenario:**
```
Selected dates: Jan 12, 13, 14, 15, 18, 25
Start time: 3:30 PM
Repeat: Every 1 hour
Ends after: 3 occurrences
Window end: 10:30 PM
```

**What happens:**
```
Jan 12:
  - 3:30 PM → occurrenceCount = 1 ✓
  - 4:30 PM → occurrenceCount = 2 ✓
  - 5:30 PM → occurrenceCount = 3 ✓
  - calculateNextReminderDate() checks: occurrenceCount (3) >= untilCount (3)
  - Returns NULL → No more occurrences scheduled
  - Reminder marked as "Ended"

Jan 13, 14, 15, 18, 25: NEVER TRIGGER ❌
```

**Expected Behavior:**
The user expects 3 occurrences **PER SELECTED DATE**, not 3 occurrences total.

### Problem 2: Multi-Select Logic Doesn't Account for Per-Day Occurrence Tracking

**Current Multi-Select Logic (lines 134-207 in reminder-utils.ts):**

```typescript
if (reminder.multiSelectEnabled) {
  // Iterates through days to find next valid date
  for (let i = 0; i < 366; i++) {
    const checkDate = new Date(cursor);
    checkDate.setDate(cursor.getDate() + i);
    
    const isSelectedDate = reminder.multiSelectDates?.includes(dateStr);
    const isSelectedDay = reminder.multiSelectDays?.includes(dayOfWeek);
    
    if (isSelectedDate || isSelectedDay) {
      // Generate occurrences within window for THIS day
      let occurrence = new Date(startWindow);
      while (occurrence <= endWindow) {
        if (occurrence > fromDate) {
          foundCandidate = occurrence;
          break;
        }
        occurrence = new Date(occurrence.getTime() + addMs);
      }
    }
    if (foundCandidate) break;
  }
}
```

**Issues:**
1. No tracking of how many occurrences have fired **on the current date**
2. Global `occurrenceCount` check happens AFTER candidate is found (lines 267-272)
3. Once global count reaches limit, ALL future dates are blocked

### Problem 3: DELIVERED Handler Increments Global Count

**In app/_layout.tsx (lines 189-195):**

```typescript
const occurred = reminder.occurrenceCount ?? 0;
const hasCountCap = reminder.untilType === 'count' && typeof reminder.untilCount === 'number';
const nextOccurCount = hasCountCap && occurred >= (reminder.untilCount as number)
  ? occurred
  : occurred + 1;
const forCalc = { ...reminder, occurrenceCount: nextOccurCount };
```

This increments the **global** occurrence count on every delivery, regardless of which date it's for.

## User Intent vs Implementation

### User's Mental Model:
"I want this reminder to fire 3 times per day, on these specific dates"

**Expected:**
- Jan 12: 3:30 PM, 4:30 PM, 5:30 PM (3 occurrences)
- Jan 13: 3:30 PM, 4:30 PM, 5:30 PM (3 occurrences)
- Jan 14: 3:30 PM, 4:30 PM, 5:30 PM (3 occurrences)
- ... and so on for all selected dates

### Current Implementation:
"Fire 3 times total, across all selected dates"

**Actual:**
- Jan 12: 3:30 PM, 4:30 PM, 5:30 PM (3 occurrences)
- Jan 13+: Nothing (count limit reached)

## Why Triggers Are Missed

### Issue A: App Closed During Day Transition
When the app is closed after the last occurrence on Jan 12:
1. `nextReminderDate` is set to `undefined` (no next occurrence found)
2. No notification is scheduled for Jan 13
3. When app opens on Jan 13, startup check runs but sees `occurrenceCount >= untilCount`
4. No rescheduling happens

### Issue B: Standard Mode Limitations
Standard mode (notifee) notifications:
- Scheduled one at a time
- Require app to be running (or woken by previous notification) to schedule next
- If app is killed or notification is dismissed without opening app, chain breaks

### Issue C: Occurrence Count Check Happens Too Early
The check `if (occurred >= untilCount) return null` happens in `calculateNextReminderDate()` BEFORE checking if we're on a new selected date.

## Solution Requirements

### Option 1: Per-Date Occurrence Tracking (Complex)
Track occurrences separately for each selected date:

```typescript
interface Reminder {
  // ... existing fields
  multiSelectOccurrences?: {
    [dateString: string]: number; // e.g., { "2026-01-12": 3, "2026-01-13": 2 }
  };
}
```

**Pros:**
- Accurate per-date tracking
- Matches user intent exactly

**Cons:**
- Complex state management
- Requires migration of existing reminders
- More storage overhead

### Option 2: Reset Count on Date Change (Simpler)
Detect when we've moved to a new selected date and reset the occurrence count:

```typescript
// In calculateNextReminderDate for multi-select
if (reminder.multiSelectEnabled && reminder.untilType === 'count') {
  // Check if candidate date is different from last triggered date
  const lastDate = reminder.lastTriggeredAt 
    ? new Date(reminder.lastTriggeredAt).toDateString()
    : null;
  const candidateDate = candidate.toDateString();
  
  if (lastDate !== candidateDate) {
    // New date - reset occurrence count for this date
    // This needs to be handled in the DELIVERED handler
  }
}
```

**Pros:**
- Simpler implementation
- No schema changes needed
- Works with existing data

**Cons:**
- Requires careful coordination between calculation and delivery
- Edge cases around midnight transitions

### Option 3: Treat Multi-Select as Separate Reminders (Recommended)
When multi-select is enabled with occurrence count:
- Each selected date gets its own "virtual" reminder instance
- Each tracks its own occurrence count
- Original reminder acts as a template

**Implementation:**
1. On creation, generate child reminders for each selected date
2. Each child has its own `occurrenceCount` and `untilCount`
3. Parent reminder is hidden/inactive
4. When all children complete, parent is marked complete

**Pros:**
- Clean separation of concerns
- Existing logic works without modification
- Easy to understand and debug

**Cons:**
- More database entries
- Requires UI changes to show/hide children
- Editing parent needs to update all children

### Option 4: Window-Based Interpretation (Alternative)
Reinterpret "Ends after N occurrences" for multi-select as:
- "N occurrences per day window"
- Track occurrences within current day's window only
- Reset count when moving to next selected date

**Implementation:**
```typescript
// In multi-select logic
if (reminder.untilType === 'count') {
  // Count occurrences within current day's window
  const todayStart = new Date(checkDate);
  todayStart.setHours(hh, mm, 0, 0);
  
  const todayEnd = new Date(checkDate);
  todayEnd.setHours(endH, endM, 0, 0);
  
  // Calculate how many occurrences fit in this window
  const windowMs = todayEnd.getTime() - todayStart.getTime();
  const maxOccurrencesInWindow = Math.floor(windowMs / addMs) + 1;
  
  // Limit to untilCount
  const occurrencesForToday = Math.min(maxOccurrencesInWindow, reminder.untilCount);
  
  // Track which occurrence we're on for today
  // (requires additional state)
}
```

## Recommended Fix: Option 4 (Window-Based with Daily Reset)

### Implementation Steps:

1. **Add daily occurrence tracking:**
```typescript
interface Reminder {
  // ... existing fields
  currentDateOccurrenceCount?: number; // Occurrences on current active date
  currentActiveDate?: string; // Which date we're currently processing (YYYY-MM-DD)
}
```

2. **Modify calculateNextReminderDate for multi-select:**
```typescript
if (reminder.multiSelectEnabled && reminder.untilType === 'count') {
  // Check if we're on a new date
  const candidateDateStr = `${yyyy}-${month}-${dd}`;
  const isNewDate = reminder.currentActiveDate !== candidateDateStr;
  
  if (isNewDate) {
    // Reset count for new date
    const dailyCount = 0;
  } else {
    const dailyCount = reminder.currentDateOccurrenceCount ?? 0;
  }
  
  // Check if we've hit the limit for THIS date
  if (dailyCount >= reminder.untilCount) {
    // Move to next selected date
    continue; // Skip this date, check next one
  }
  
  // Generate occurrence and track it's for this date
}
```

3. **Update DELIVERED handler:**
```typescript
// In app/_layout.tsx
if (reminder.multiSelectEnabled && reminder.untilType === 'count') {
  const triggerDate = new Date(triggeredAt).toISOString().split('T')[0];
  const isNewDate = reminder.currentActiveDate !== triggerDate;
  
  const dailyCount = isNewDate ? 1 : (reminder.currentDateOccurrenceCount ?? 0) + 1;
  
  updatedReminder.currentDateOccurrenceCount = dailyCount;
  updatedReminder.currentActiveDate = triggerDate;
  
  // Don't increment global occurrenceCount for multi-select
}
```

4. **Handle day transitions in startup check:**
```typescript
// In startup-notification-check.ts
if (reminder.multiSelectEnabled && reminder.untilType === 'count') {
  const today = new Date().toISOString().split('T')[0];
  
  if (reminder.currentActiveDate && reminder.currentActiveDate < today) {
    // We've moved past the active date, reset for new date
    reminder.currentDateOccurrenceCount = 0;
    reminder.currentActiveDate = undefined;
  }
}
```

## Testing Scenarios

### Test Case 1: Basic Multi-Day Occurrence
- Select: Jan 12, 13, 14
- Time: 3:00 PM
- Every: 1 hour
- Ends: After 3 occurrences
- Window: 3:00 PM - 6:00 PM

**Expected:**
- Jan 12: 3:00, 4:00, 5:00 PM ✓
- Jan 13: 3:00, 4:00, 5:00 PM ✓
- Jan 14: 3:00, 4:00, 5:00 PM ✓

### Test Case 2: App Closed Overnight
- Same as Test Case 1
- Close app after Jan 12 last occurrence
- Open app on Jan 13 at 2:00 PM

**Expected:**
- Jan 13: 3:00, 4:00, 5:00 PM should still trigger ✓

### Test Case 3: Occurrence Limit Exceeds Window
- Select: Jan 12
- Time: 3:00 PM
- Every: 1 hour
- Ends: After 10 occurrences
- Window: 3:00 PM - 6:00 PM

**Expected:**
- Jan 12: 3:00, 4:00, 5:00 PM only (window limits to 3) ✓
- Should not continue past 6:00 PM even though count < 10

### Test Case 4: Multiple Dates with Weekdays
- Select dates: Jan 12, 15
- Select weekdays: Monday, Wednesday
- Time: 2:00 PM
- Every: 2 hours
- Ends: After 2 occurrences
- Window: 2:00 PM - 8:00 PM

**Expected:**
- Each selected date/weekday: 2:00, 4:00 PM (2 occurrences per day) ✓

## Files Requiring Changes

1. **types/reminder.ts** - Add new fields
2. **services/reminder-utils.ts** - Modify multi-select logic in calculateNextReminderDate
3. **app/_layout.tsx** - Update DELIVERED handler for daily count tracking
4. **services/startup-notification-check.ts** - Handle day transitions
5. **hooks/notification-service.ts** - Ensure metadata includes daily count
6. **services/reminder-scheduler.ts** - Update markReminderDone if needed

## Migration Strategy

For existing multi-select reminders with occurrence counts:
1. Add migration to set `currentDateOccurrenceCount = 0`
2. Set `currentActiveDate = undefined`
3. Keep existing `occurrenceCount` for reference but don't use it for multi-select

## Priority: HIGH

This is a critical bug that breaks the core functionality of multi-select "Every" reminders with occurrence limits. Users expect per-day occurrence counts, not global counts.

---

**Status:** Analysis Complete - Ready for Implementation
**Estimated Effort:** Medium (2-3 hours)
**Risk:** Medium (affects core scheduling logic)
