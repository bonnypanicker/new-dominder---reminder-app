# Multi-Select Mode UI/UX Enhancement Implementation Plan

## Summary
This document outlines the comprehensive UI/UX improvements for the multi-select reminder mode, ensuring consistent, intuitive user experience across all interactions.

## Requirements

### 1. Create Reminder Popup - Start/End Display
**Location**: `app/index.tsx` - CreateReminderPopup component  
**Change**: When multi-mode is selected in "Every" repeat type:
- **Start box**: Show "Multi · 6:00 PM" instead of date  
- **End box** (when "on Date/Time" is selected): Show "Multi · 6:30 PM"

**Implementation**:
- Modify `CustomizePanel` props to pass `multiSelectEnabled`
- Update the date display logic in CustomizePanel to check for multi-select
- Create formatting function: `formatDateTimeForMulti(time, isAM, isMulti)`

### 2. Ends Dropdown Label
**Location**: `components/CustomizePanel.tsx` line 282  
**Change**: ✅ COMPLETED - Changed "On date" to "On date/time"

### 3. Reminder Card - Multi-Mode Badge & Display
**Location**: `app/index.tsx` - ReminderCard component (lines 752-1220)

**Changes**:
a) Add "Multi" badge next to "Every" badge
b) Remove date from next occurrence, show only time
c) In subtext: "Repeats every 1 hour · Ends at 6:30 PM" (no date)

**Implementation**:
- Modify lines 1157-1184 (badge container)
- Add conditional "Multi" badge when `reminder.multiSelectEnabled === true`
- Update lines 1092-1138 (next occurrence display for 'every')
- Update lines 1143-1154 (ends label for 'every')

### 4. Calendar Modal - Mutual Exclusivity
**Location**: `components/CustomizePanel.tsx` - CalendarModal

**Change**: When days (S,M,T...) are selected, individual dates cannot be selected and vice versa

**Implementation**:
- Add state to track selection mode: `const [selectionMode, setSelectionMode] = useState<'dates' | 'days' | 'none'>('none')`
- Disable date grid when `selectionMode === 'days'`
- Disable weekday buttons when `selectionMode === 'dates'`
- Clear opposite selection when switching modes

### 5. Reminder Card - Selected Days/Dates Display
**Location**: `app/index.tsx` - ReminderCard component

**Changes**:
a) **When days selected**: Show day discs (same as Daily reminder UI)
   - Reuse existing `dailyDaysContainer` and `dailyDayDisc` styles
   - Show selected days as active based on `reminder.multiSelectDays`

b) **When dates selected**: Show dates in small red text
   - Format: "1 Jan 26, 5 Jan 26, 10 Jan 26..."
   - If space-limited: "1 Jan 26, 5 Jan 26 +3"
   - Clicking +N opens a modal showing all dates

**Implementation**:
- Add new component after next occurrence display (around line 1138)
- Create `formatSelectedDates()` function
- Create `<SelectedDatesPopup>` modal component
- Reuse Daily reminder's day disc UI for multi-select days

## Files to Modify

1. ✅ `components/CustomizePanel.tsx` (Partial - label changed)
   - Update `getUntilLabel` ✅
   - Add date/time display logic for multi-mode
   - Implement mutual exclusivity in CalendarModal

2. `app/index.tsx`
   - Update ReminderCard component (lines 752-1220)
   - Add Multi badge
   - Update next occurrence display
   - Add selected days/dates display
   - New SelectedDatesPopup component

3. `types/reminder.ts` (Already updated with multi-select fields)

## UI/UX Principles

- **Consistency**: Reuse existing UI patterns (Daily day discs, snooze/pause text style)
- **Clarity**: "Multi" badge clearly indicates multi-select mode
- **Efficiency**: Only show relevant information (time vs date+time)
- **Progressive Disclosure**: +N button for overflow dates
- **Safety**: Mutual exclusivity prevents conflicting selections

## Styling Requirements

- **Multi badge**: Same styling as repeat badges but with distinct color
- **Selected dates text**: Small, red text (similar to snooze/pause badges)
- **Day discs**: Reuse Daily reminder styles exactly
- **+N button**: Touchable, styled like inline badges

## Testing Scenarios

1. Create Every 1 hour reminder with multi-select dates → Verify "Multi · time" display
2. Select weekdays → Verify day discs appear on card
3. Select individual dates → Verify dates shown in red text
4. Select 10+ dates → Verify +N button appears
5. Try selecting both days and dates → Verify mutual exclusivity
6. Edit existing multi-select reminder → Verify all fields load correctly

