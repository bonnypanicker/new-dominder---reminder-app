## Context
The DoMinder reminder app has implemented an \"Until/Ends\" feature for repeating reminders. Two critical bugs have been identified that need immediate fixing.

## Critical Bug #1: occurrenceCount Lost When Editing Reminders

**Problem**: When editing a reminder that has already triggered multiple times, the `occurrenceCount` is not preserved, causing count-based until logic to fail.

**File**: `app/index.tsx`
**Location**: Lines ~1213-1216 (inside the `if (editingReminder)` block in onConfirm)

**Current Code**:
```typescript
const updated: Reminder = {
  ...editingReminder,
  title: title.trim(),
  time: finalTime,
  date: selectedDate,
  priority,
  repeatType,
  repeatDays: (repeatType === 'weekly' || repeatType === 'custom' || repeatType === 'daily') ? repeatDays : undefined,
  monthlyDay: repeatType === 'monthly' ? Number(selectedDate.split('-')[2] ?? '1') : undefined,
  everyInterval: repeatType === 'every' ? { value: everyValue, unit: everyUnit } : undefined,
  // Until fields
  untilType: repeatType === 'none' ? undefined : untilType,
  untilDate: repeatType === 'none' ? undefined : (untilType === 'endsAt' ? untilDate : undefined),
  untilCount: repeatType === 'none' ? undefined : (untilType === 'count' ? untilCount : undefined),
  // ❌ MISSING: occurrenceCount preservation
  ringerSound: undefined,
  isCompleted: false,
  isActive: true,
  isPaused: false,
  isExpired: false,
  snoozeUntil: undefined,
  nextReminderDate: undefined,
  notificationId: undefined,
};
```

**Fix Required**: Add this line after `untilCount`:
```typescript
// Preserve occurrenceCount from editing reminder, or initialize to 0
occurrenceCount: repeatType === 'none' ? undefined : (editingReminder.occurrenceCount ?? 0),
```

---

## Critical Bug #2: Poor Default Until Date

**Problem**: When user selects \"Ends at\" without specifying a date, it defaults to TODAY, which may cause reminders to immediately stop.

**File**: `app/index.tsx`
**Location**: Lines ~1130-1138 (inside CreateReminderPopup's onUntilTypeChange handler)

**Current Code**:
```typescript
onUntilTypeChange={(type) => {
  setUntilType(type);
  // Set a default until date when switching to endsAt without one
  if (type === 'endsAt' && !untilDate) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setUntilDate(`${yyyy}-${mm}-${dd}`); // ❌ Sets to TODAY
  }
}}
```

**Fix Required**: Change default to 1 month from now:
```typescript
onUntilTypeChange={(type) => {
  setUntilType(type);
  // Set a default until date when switching to endsAt without one
  if (type === 'endsAt' && !untilDate) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1); // ✅ Set to 1 month from now
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setUntilDate(`${yyyy}-${mm}-${dd}`);
  }
}}
```

---

## Important Improvement #1: Prevent Past Dates for Until Calendar

**Problem**: The until date calendar allows selecting past dates, which is confusing.

**File**: `components/CustomizePanel.tsx`
**Location**: Line ~476

**Current Code**:
```typescript
<CalendarModal
  visible={untilCalendarOpen}
  onClose={() => setUntilCalendarOpen(false)}
  selectedDate={untilDate ?? selectedDate}
  onSelectDate={(date) => {
    onUntilDateChange?.(date);
    setUntilCalendarOpen(false);
    // ...
  }}
  disablePast={false}  // ❌ Allows past dates
/>
```

**Fix Required**: Change to:
```typescript
disablePast={true}  // ✅ Prevent past dates
```

---

## Important Improvement #2: Validate Until Date >= Start Date

**Problem**: No validation that the until date is not before the start date.

**File**: `app/index.tsx`
**Location**: Inside `onConfirm` function, after line ~1120 (after title validation)

**Add This Validation**:
```typescript
// Validate until date constraints
if (repeatType !== 'none' && untilType === 'endsAt' && untilDate) {
  const startDateTime = new Date(selectedDate);
  const endDateTime = new Date(untilDate);
  
  if (endDateTime < startDateTime) {
    showToast('End date cannot be before start date', 'error');
    return;
  }
}
```

