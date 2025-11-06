
## Problem Statement

In the create reminder popup, when setting up recurring reminders with \"Every\" frequency for \"minutes\" and \"hours\", there is a time selection feature for both \"Start\" and \"Ends\". However, when the user changes the time in the \"Ends\" time picker, the start time also changes to the same value.

### Current Behavior
- User sets start time: `12 Oct 2025 9:12 AM`
- User selects \"Ends\" date and opens time picker
- User selects end time: `6:30 AM` in the time picker
- **BUG**: Both start time AND end time now show `6:30 AM`
- Expected: Start should remain `9:12 AM` and end should be `6:30 AM`

### Expected Behavior
- Start and End times should be completely independent
- User should be able to set different times for both
- Example: Start = `12 Oct 2025 9:12 AM`, End = `15 Oct 2025 8:54 PM`

## Root Cause Analysis

### File: `/app/app/index.tsx`

1. **Single Time State**: There is only ONE state for time selection:
   ```typescript
   const [selectedTime, setSelectedTime] = useState<string>(() => {
     const defaultTime = calculateDefaultTime();
     return defaultTime.time;
   });
   const [isAM, setIsAM] = useState<boolean>(() => {
     const defaultTime = calculateDefaultTime();
     return defaultTime.isAM;
   });
   const [showTimeSelector, setShowTimeSelector] = useState<boolean>(false);
   ```

2. **Single Time Selector Modal**: There is only ONE TimeSelector component being used for BOTH start time and end time:
   ```typescript
   <TimeSelector
     visible={showTimeSelector}
     selectedTime={selectedTime}
     isAM={isAM}
     onTimeChange={onTimeChange}
     onClose={onCloseTimeSelector}
     selectedDate={selectedDate}
     repeatType={repeatType}
     onPastTimeError={(msg) => onShowToast(msg ?? 'Please select a future time', 'error')}
   />
   ```

3. **Same Handler for Both**: The `onOpenUntilTime` at line 1190 uses the same time selector:
   ```typescript
   onOpenUntilTime={() => { setShowTimeSelector(true); }}
   ```

4. **No Separate Until Time State**: There is NO separate state to store the \"Ends\" time independently. The app needs:
   - `untilTime` (string) - to store the end time (HH:mm format)
   - `untilIsAM` (boolean) - to store whether the end time is AM or PM

### File: `/app/components/CustomizePanel.tsx`

5. **Displays Start Time for Ends**: At line 137-144, the `untilValueLabel` uses `displayTime` which is the START time:
   ```typescript
   const untilValueLabel = useMemo(() => {
     if (untilType === 'endsAt') {
       const withTime = repeatType === 'every' && (everyUnit === 'minutes' || everyUnit === 'hours');
       return withTime ? `${formattedUntilDate} • ${displayTime}` : formattedUntilDate;
       //                                            ^^^^^^^^^^ This is the START time!
     }
     if (untilType === 'count') return `${untilCount ?? 1} occurrences`;
     return undefined;
   }, [untilType, formattedUntilDate, untilCount, repeatType, everyUnit, displayTime]);
   ```

6. **At line 466-474**: When until date is selected, it calls `onOpenUntilTime()` but this opens the time selector with the START time state:
   ```typescript
   onSelectDate={(date) => {
     onUntilDateChange?.(date);
     setUntilCalendarOpen(false);
     // Open time selector only for Every minutes/hours as per behavior
     const unit = everyUnit ?? 'hours';
     const shouldOpenTime = repeatType === 'every' && (unit === 'minutes' || unit === 'hours');
     if (shouldOpenTime) {
       try {
         onOpenUntilTime?.();  // Opens same time selector with start time!
       } catch (e) {
         console.log('open time after until date error', e);
       }
     }
   }}
   ```

## Solution Architecture

### Step 1: Add Separate State for Until Time
In `/app/app/index.tsx`, add new state variables after line 130:

```typescript
// Until time controls for \"Ends\" time selection
const [untilTime, setUntilTime] = useState<string>(() => {
  const defaultTime = calculateDefaultTime();
  return defaultTime.time;
});
const [untilIsAM, setUntilIsAM] = useState<boolean>(() => {
  const defaultTime = calculateDefaultTime();
  return defaultTime.isAM;
});
```

### Step 2: Add Context State to Track Which Time Selector is Open
Add a new state to know whether the time selector is for \"Start\" or \"Ends\":

```typescript
const [timeSelectorContext, setTimeSelectorContext] = useState<'start' | 'until'>('start');
```

### Step 3: Modify Time Selector Opening Logic

**For Start Time** (around line 1164):
```typescript
onTimeSelect={() => {
  setTimeSelectorContext('start');
  setShowTimeSelector(true);
}}
```

**For Until Time** (around line 1190):
```typescript
onOpenUntilTime={() => {
  setTimeSelectorContext('until');
  setShowTimeSelector(true);
}}
```

### Step 4: Modify TimeSelector Component Call
Update the TimeSelector component to use the appropriate time based on context (around line 1654):

```typescript
<TimeSelector
  visible={showTimeSelector}
  selectedTime={timeSelectorContext === 'start' ? selectedTime : untilTime}
  isAM={timeSelectorContext === 'start' ? isAM : untilIsAM}
  onTimeChange={(time, isAmValue) => {
    if (timeSelectorContext === 'start') {
      onTimeChange(time, isAmValue);
    } else {
      // Handle until time change
      setUntilTime(time);
      setUntilIsAM(isAmValue);
    }
  }}
  onClose={onCloseTimeSelector}
  selectedDate={timeSelectorContext === 'start' ? selectedDate : untilDate}
  repeatType={repeatType}
  onPastTimeError={(msg) => onShowToast(msg ?? 'Please select a future time', 'error')}
/>
```

### Step 5: Pass Until Time to CustomizePanel
Update the props passed to CustomizePanel (around line 1600-1622):

```typescript
<CustomizePanel
  repeatType={repeatType}
  repeatDays={repeatDays}
  onRepeatTypeChange={onRepeatTypeChange}
  onRepeatDaysChange={onRepeatDaysChange}
  selectedDate={selectedDate}
  onDateChange={(date) => {
    onDateChange(date);
  }}
  onOpenTime={() => { 
    setTimeSelectorContext('start');
    onTimeSelect(); 
  }}
  displayTime={`${formatTime(selectedTime, isAM)}`}
  everyValue={everyValue}
  everyUnit={everyUnit}
  onEveryChange={onEveryChange}
  // Until props
  untilType={untilType}
  untilDate={untilDate}
  untilCount={untilCount}
  untilTime={untilTime}           // NEW PROP
  untilIsAM={untilIsAM}             // NEW PROP
  onUntilTypeChange={onUntilTypeChange}
  onUntilDateChange={onUntilDateChange}
  onUntilCountChange={onUntilCountChange}
  onOpenUntilTime={() => {
    setTimeSelectorContext('until');
    onOpenUntilTime();
  }}
/>
```

### Step 6: Update CustomizePanel Interface and Props
In `/app/components/CustomizePanel.tsx`:

**Update interface (around line 14-35):**
```typescript
interface CustomizePanelProps {
  repeatType: RepeatType;
  repeatDays: number[];
  onRepeatTypeChange: (type: RepeatType) => void;
  onRepeatDaysChange: (days: number[]) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onOpenTime?: () => void;
  displayTime: string;
  everyValue?: number;
  everyUnit?: EveryUnit;
  onEveryChange?: (value: number, unit: EveryUnit) => void;
  // Until props
  untilType?: UntilType;
  untilDate?: string;
  untilCount?: number;
  untilTime?: string;           // NEW PROP
  untilIsAM?: boolean;           // NEW PROP
  onUntilTypeChange?: (type: UntilType) => void;
  onUntilDateChange?: (date: string) => void;
  onUntilCountChange?: (count: number) => void;
  onOpenUntilTime?: () => void;
}
```

**Update destructuring (around line 37-56):**
```typescript
export default function CustomizePanel({
  repeatType,
  repeatDays,
  onRepeatTypeChange,
  onRepeatDaysChange,
  selectedDate,
  onDateChange,
  onOpenTime,
  displayTime,
  everyValue,
  everyUnit,
  onEveryChange,
  untilType,
  untilDate,
  untilCount,
  untilTime,        // NEW PROP
  untilIsAM,        // NEW PROP
  onUntilTypeChange,
  onUntilDateChange,
  onUntilCountChange,
  onOpenUntilTime,
}: CustomizePanelProps) {
```

### Step 7: Create Formatted Until Time
Add a helper function to format the until time (around line 135):

```typescript
const formattedUntilTime = useMemo(() => {
  if (!untilTime || untilIsAM === undefined) return '';
  const [hours, minutes] = untilTime.split(':').map(Number);
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${untilIsAM ? 'AM' : 'PM'}`;
}, [untilTime, untilIsAM]);
```

### Step 8: Update untilValueLabel to Use Separate Until Time
Modify the `untilValueLabel` useMemo (around line 137-144):

```typescript
const untilValueLabel = useMemo(() => {
  if (untilType === 'endsAt') {
    const withTime = repeatType === 'every' && (everyUnit === 'minutes' || everyUnit === 'hours');
    return withTime ? `${formattedUntilDate} • ${formattedUntilTime}` : formattedUntilDate;
    //                                            ^^^^^^^^^^^^^^^^^^^ Use separate until time!
  }
  if (untilType === 'count') return `${untilCount ?? 1} occurrences`;
  return undefined;
}, [untilType, formattedUntilDate, untilCount, repeatType, everyUnit, formattedUntilTime]);
```

### Step 9: Update CreateReminderPopupProps Interface
In `/app/app/index.tsx`, update the interface (around line 1421-1456):

```typescript
interface CreateReminderPopupProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (text: string) => void;
  selectedTime: string;
  isAM: boolean;
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
  showCustomize: boolean;
  onShowCustomizeChange: (show: boolean) => void;
  repeatType: RepeatType;
  onRepeatTypeChange: (type: RepeatType) => void;
  repeatDays: number[];
  onRepeatDaysChange: (days: number[]) => void;
  onTimeSelect: () => void;
  onTimeChange: (time: string, isAM: boolean) => void;
  showTimeSelector: boolean;
  onCloseTimeSelector: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  selectedDate: string;
  onDateChange: (date: string) => void;
  mode: 'create' | 'edit';
  everyValue: number;
  everyUnit: EveryUnit;
  onEveryChange: (value: number, unit: EveryUnit) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  untilType: 'none' | 'endsAt' | 'count';
  untilDate: string;
  untilCount: number;
  untilTime: string;           // NEW PROP
  untilIsAM: boolean;           // NEW PROP
  onUntilTypeChange: (type: 'none' | 'endsAt' | 'count') => void;
  onUntilDateChange: (date: string) => void;
  onUntilCountChange: (count: number) => void;
  onOpenUntilTime: () => void;
}
```

### Step 10: Update CreateReminderPopup Component Call
When calling CreateReminderPopup (around line 1143-1190), add the new props:

```typescript
<CreateReminderPopup
  visible={showCreatePopup}
  onClose={handleCloseCreatePopup}
  title={title}
  onTitleChange={setTitle}
  selectedTime={selectedTime}
  isAM={isAM}
  priority={priority}
  onPriorityChange={setPriority}
  showCustomize={showCustomize}
  onShowCustomizeChange={setShowCustomize}
  repeatType={repeatType}
  onRepeatTypeChange={handleRepeatTypeChange}
  repeatDays={repeatDays}
  onRepeatDaysChange={setRepeatDays}
  onTimeSelect={() => {
    setTimeSelectorContext('start');
    setShowTimeSelector(true);
  }}
  onTimeChange={(time, isAmValue) => {
    setSelectedTime(time);
    setIsAM(isAmValue);
  }}
  showTimeSelector={showTimeSelector}
  onCloseTimeSelector={() => setShowTimeSelector(false)}
  onConfirm={() => {
    // existing confirmation logic
  }}
  isLoading={isLoading}
  selectedDate={selectedDate}
  onDateChange={setSelectedDate}
  mode={editingReminder ? 'edit' : 'create'}
  everyValue={everyValue}
  everyUnit={everyUnit}
  onEveryChange={(value, unit) => {
    setEveryValue(value);
    setEveryUnit(unit);
  }}
  onShowToast={showToast}
  untilType={untilType}
  untilDate={untilDate}
  untilCount={untilCount}
  untilTime={untilTime}           // NEW PROP
  untilIsAM={untilIsAM}            // NEW PROP
  onUntilTypeChange={(type) => {
    setUntilType(type);
    if (type === 'endsAt' && !untilDate) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setUntilDate(`${yyyy}-${mm}-${dd}`);
    }
  }}
  onUntilDateChange={setUntilDate}
  onUntilCountChange={(count) => setUntilCount(Math.min(999, Math.max(1, count)))}
  onOpenUntilTime={() => {
    setTimeSelectorContext('until');
    setShowTimeSelector(true);
  }}
/>
```

### Step 11: Handle Until Time in Reminder Creation/Update
When creating or updating reminders, include the until time. Update the reminder object to store:
- `untilDate`: the end date
- `untilTime`: the end time (HH:mm format) 
- `untilIsAM`: whether the end time is AM or PM

Update the confirmation handler (around line 1191-1275) to include until time:

```typescript
onConfirm={() => {
  if (!title.trim()) {
    showToast('Please enter your reminder', 'error');
    return;
  }
  
  // ... existing validation ...
  
  if (repeatType !== 'none' && untilType === 'endsAt' && untilDate) {
    // Validate that end date/time is after start date/time
    const startDateTime = new Date(selectedDate);
    const [startHours, startMinutes] = selectedTime.split(':').map(Number);
    startDateTime.setHours(startHours, startMinutes, 0, 0);
    
    const endDateTime = new Date(untilDate);
    const [endHours, endMinutes] = untilTime.split(':').map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);
    
    if (endDateTime <= startDateTime) {
      showToast('End date/time must be after start date/time', 'error');
      return;
    }
  }
  
  // Include untilTime and untilIsAM in the reminder object
  const reminderData = {
    // ... existing fields ...
    untilDate: repeatType === 'none' ? undefined : (untilType === 'endsAt' ? untilDate : undefined),
    untilTime: repeatType === 'none' ? undefined : (untilType === 'endsAt' ? untilTime : undefined),
    untilIsAM: repeatType === 'none' ? undefined : (untilType === 'endsAt' ? untilIsAM : undefined),
    untilType: repeatType === 'none' ? undefined : untilType,
    untilCount: repeatType === 'none' ? undefined : (untilType === 'count' ? untilCount : undefined),
  };
  
  // ... create or update reminder ...
}}
```

### Step 12: Update Reminder Type Definition
In `/app/types/reminder.ts`, add the new fields to the Reminder type:

```typescript
export interface Reminder {
  // ... existing fields ...
  untilDate?: string;
  untilTime?: string;      // NEW FIELD
  untilIsAM?: boolean;     // NEW FIELD
  untilType?: 'none' | 'endsAt' | 'count';
  untilCount?: number;
  // ... rest of fields ...
}
```

### Step 13: Initialize Until Time When Editing
When loading a reminder for editing (around line 340-350), initialize the until time state:

```typescript
if (reminder) {
  setTitle(reminder.title);
  setSelectedTime(reminder.time);
  setIsAM(reminder.time.split(':').map(Number)[0] < 12);
  setPriority(reminder.priority || 'medium');
  setRepeatType(reminder.repeatType || 'none');
  setRepeatDays(reminder.repeatDays || []);
  setEveryValue(reminder.everyValue || 1);
  setEveryUnit(reminder.everyUnit || 'hours');
  setSelectedDate(reminder.date);
  setUntilType((reminder.untilType ?? 'none') as 'none' | 'endsAt' | 'count');
  setUntilDate(reminder.untilDate || '');
  setUntilCount(reminder.untilCount || 1);
  setUntilTime(reminder.untilTime || selectedTime);      // NEW
  setUntilIsAM(reminder.untilIsAM ?? isAM);              // NEW
  setEditingReminder(reminder);
  setShowCreatePopup(true);
}
```

## Implementation Checklist

- [ ] Add `untilTime` and `untilIsAM` state in `/app/app/index.tsx`
- [ ] Add `timeSelectorContext` state in `/app/app/index.tsx`
- [ ] Update `onTimeSelect` to set context to 'start'
- [ ] Update `onOpenUntilTime` to set context to 'until'
- [ ] Modify `TimeSelector` component call to use context-based state
- [ ] Add `untilTime` and `untilIsAM` props to `CustomizePanelProps` interface
- [ ] Update `CustomizePanel` component to receive and use new props
- [ ] Add `formattedUntilTime` helper in `CustomizePanel`
- [ ] Update `untilValueLabel` to use `formattedUntilTime`
- [ ] Update `CreateReminderPopupProps` interface
- [ ] Update `CreateReminderPopup` component call with new props
- [ ] Add validation for end time being after start time
- [ ] Update reminder creation/update logic to include until time
- [ ] Update `Reminder` type definition to include new fields
- [ ] Update editing logic to initialize until time state
- [ ] Test the fix thoroughly

## Testing Scenarios

1. **Create reminder with Every Minutes**:
   - Set start: Oct 12, 2025, 9:12 AM
   - Set repeat: Every 15 minutes
   - Set ends: Oct 15, 2025, 8:54 PM
   - Verify both times are shown correctly and independently

2. **Create reminder with Every Hours**:
   - Set start: Oct 12, 2025, 2:30 PM
   - Set repeat: Every 2 hours
   - Set ends: Oct 20, 2025, 11:45 PM
   - Verify both times are shown correctly

3. **Edit existing reminder**:
   - Edit a reminder with until time
   - Verify both start and end times load correctly
   - Change only end time, verify start time remains unchanged
   - Change only start time, verify end time remains unchanged

4. **Validation**:
   - Try to set end time before start time
   - Verify error message is shown
   - Verify reminder is not created

5. **Different repeat types**:
   - Verify time selection only shows for \"Every Minutes\" and \"Every Hours\"
   - Verify other repeat types (daily, weekly, etc.) don't show time for ends

## Summary

The bug occurs because the app uses a single time state (`selectedTime` and `isAM`) and a single `TimeSelector` component for both the start time and the \"Ends\" time. The fix requires:

1. Adding separate state for until time (`untilTime`, `untilIsAM`)
2. Adding context tracking to know which time is being edited
3. Updating the TimeSelector to use context-based state
4. Passing the until time through the component hierarchy
5. Updating the display logic to show the correct time for each field
6. Adding validation to ensure end time is after start time
7. Storing the until time in the reminder data

