## DoMinder - Adding 24-Hour Format Support

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Analysis](#2-architecture-analysis)
3. [Current Time Flow Analysis](#3-current-time-flow-analysis)
4. [Implementation Strategy](#4-implementation-strategy)
5. [Detailed Changes - Step by Step](#5-detailed-changes---step-by-step)
6. [TimeSelector Dial Behavior in 24hr Mode](#6-timeselector-dial-behavior-in-24hr-mode)
7. [Race Conditions & Edge Cases](#7-race-conditions--edge-cases)
8. [Native Code Changes](#8-native-code-changes)
9. [Testing Checklist](#9-testing-checklist)

---

## 1. Executive Summary

**Goal**: Add a 24-hour format toggle in Settings > Preferences, and apply the format everywhere the user sees time.

**Key Insight**: The data layer already stores time in 24-hour format (`HH:MM` in `reminder.time`). The `isAM` boolean is only used transiently during time selection. This means **the fix is purely UI-layer** - no data migration, no scheduler changes, no alarm logic changes needed.

**Impact Assessment**: MINIMAL. All changes are display-formatting only. The underlying alarm scheduling, notification triggers, and data storage remain untouched.

**Files Changed**: ~10 files
**Lines of Code**: ~150-200 lines net change
**Risk Level**: LOW - display-only changes, no business logic affected

---

## 2. Architecture Analysis

### Time Data Flow

```
User Input (TimeSelector dial)
    |
    v
selectedTime (12h display: \"02:30\") + isAM (boolean)
    |
    v
onConfirm() converts to 24h: \"14:30\"
    |
    v
reminder.time = \"14:30\" (stored in AsyncStorage)
    |
    v
Display: formatTime(\"14:30\") -> \"2:30 PM\"  <-- THIS IS WHERE WE CHANGE
    |
    v
Notifications: formatSmartDateTime(timestamp) -> \"Today 2:30 PM\"  <-- AND HERE
    |
    v
Native AlarmActivity: SimpleDateFormat(\"h:mm a\") -> \"2:30 PM\"  <-- AND HERE
```

### Storage Model (NO CHANGES NEEDED)

```typescript
// types/reminder.ts - reminder.time is ALREADY 24-hour
interface Reminder {
  time: string;        // \"14:30\" - already 24h format
  untilTime?: string;  // \"17:00\" - already 24h format
  windowEndTime?: string; // \"18:00\" - already 24h format
  // isAM is NOT stored - only used during time selection
}
```

---

## 3. Current Time Flow Analysis

### All Locations Where Time is Displayed to User

| # | File | Location | Current Format | Line(s) |
|---|------|----------|---------------|---------|
| 1 | `app/index.tsx` | `formatTime()` callback in HomeScreen | 12h with AM/PM | ~735-740 |
| 2 | `app/index.tsx` | `formatTime()` inside CreateReminderPopup | 12h with AM/PM | ~2300-2303 |
| 3 | `app/index.tsx` | ReminderCard compact view (completed/deleted) | Inline 12h conversion | ~862-873 |
| 4 | `app/index.tsx` | TimeSelector display (hour:minute + AM/PM) | 12h dial + AM/PM buttons | ~2693-3632 |
| 5 | `app/index.tsx` | `calculateDefaultTime()` | Returns 12h format | ~53-84 |
| 6 | `app/index.tsx` | `to12h()` helper | Converts 24h->12h | ~534-539 |
| 7 | `components/CustomizePanel.tsx` | `formattedUntilTime` memo | 12h with AM/PM | ~186-192 |
| 8 | `app/alarm.tsx` | `getCurrentTime()` | 12h via toLocaleTimeString | ~109-116 |
| 9 | `hooks/notification-service.ts` | `formatSmartDateTime()` | 12h via toLocaleString | ~66-97 |
| 10 | `services/notification-refresh-service.ts` | `formatSmartDateTime()` | 12h via toLocaleString | ~12-43 |
| 11 | `services/startup-notification-check.ts` | `formatSmartDateTime()` | 12h via toLocaleString | ~410-437 |
| 12 | `plugins/with-alarm-module.js` | Native AlarmActivity | `SimpleDateFormat(\"h:mm a\")` | ~1237 |

---

## 4. Implementation Strategy

### Approach: UI-Layer Format Conversion (Minimal Impact)

The strategy is:

1. **Add setting**: `use24HourFormat: boolean` to `AppSettings` in settings store
2. **Add toggle**: In Settings > Preferences section
3. **Create utility**: Single `formatTimeForDisplay()` function that respects the setting
4. **Replace all display points**: Swap all 12h formatting calls to use the utility
5. **TimeSelector**: In 24h mode, hide AM/PM buttons and display 0-23 hours
6. **Native**: Read setting from SharedPreferences, switch `SimpleDateFormat`
7. **Close race conditions**: Use reactive query invalidation to update all visible times instantly

### Why NOT change the data layer?

- `reminder.time` is already `\"HH:MM\"` in 24h - the storage is format-agnostic
- `calculateNextReminderDate()` parses `reminder.time` as 24h integers - no change needed
- `reminderToTimestamp()` in notification-service parses as 24h - no change needed
- All alarm scheduling uses epoch timestamps (milliseconds) - format-independent

---

## 5. Detailed Changes - Step by Step

### Step 1: Settings Store (`hooks/settings-store.ts`)

Add `use24HourFormat` to the `AppSettings` interface and defaults:

```typescript
// hooks/settings-store.ts

export interface AppSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  sortMode: 'creation' | 'upcoming';
  defaultReminderMode: RepeatType;
  defaultPriority: 'standard' | 'silent' | 'ringer';
  ringerVolume: number;
  use24HourFormat: boolean;  // <-- ADD THIS
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  darkMode: false,
  sortMode: 'creation',
  defaultReminderMode: 'none',
  defaultPriority: 'standard',
  ringerVolume: 40,
  use24HourFormat: false,    // <-- ADD THIS (default to 12h for backward compat)
};
```

In the `onSuccess` handler of `useUpdateSettings`, add native SharedPreferences sync:

```typescript
// Inside onSuccess callback, after ringerVolume block:
if (typeof variables.use24HourFormat === 'boolean') {
  if (AlarmModule?.save24HourFormat) {
    try {
      await AlarmModule.save24HourFormat(variables.use24HourFormat);
    } catch (e) {
      console.log('Failed to save 24h format to native:', e);
    }
  }
}
```

**Race condition note**: The `queryClient.invalidateQueries({ queryKey: ['settings'] })` in `onSuccess` already triggers a re-render of all components using `useSettings()`. This means all time displays will automatically re-read the setting and re-format. No additional sync mechanism needed.

---

### Step 2: Time Format Utility (`utils/time-format.ts`) - NEW FILE

Create a single source of truth for time formatting:

```typescript
// utils/time-format.ts

/**
 * Format a 24h time string (HH:MM) for display based on user preference.
 * This is the SINGLE source of truth for time display formatting.
 */
export function formatTimeForDisplay(time24: string, use24HourFormat: boolean): string {
  const [hours, minutes] = time24.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time24;

  if (use24HourFormat) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format a Date object's time for display based on user preference.
 */
export function formatDateTimeForDisplay(date: Date, use24HourFormat: boolean): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const time24 = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return formatTimeForDisplay(time24, use24HourFormat);
}

/**
 * Format smart date+time for notifications.
 * Replaces the duplicated formatSmartDateTime in notification-service,
 * notification-refresh-service, and startup-notification-check.
 */
export function formatSmartDateTimeForDisplay(when: number, use24HourFormat: boolean): string {
  const reminderDate = new Date(when);
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reminderStart = new Date(
    reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate()
  );
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const timeStr = formatDateTimeForDisplay(reminderDate, use24HourFormat);

  if (reminderStart.getTime() === todayStart.getTime()) {
    return `Today ${timeStr}`;
  } else if (reminderStart.getTime() === yesterdayStart.getTime()) {
    return `Yesterday ${timeStr}`;
  } else {
    const dateStr = reminderDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${dateStr} ${timeStr}`;
  }
}
```

---

### Step 3: Settings UI (`app/settings/index.tsx`)

Add the 24hr toggle inside the `{expandedSection === 'preferences' && (...)}` block, **before** the \"Reminder Defaults\" card:

```tsx
// app/settings/index.tsx - Inside the Preferences section content

{expandedSection === 'preferences' && (
  <View style={styles.sectionContent}>
    {/* 24-Hour Format Toggle - ADD THIS BLOCK */}
    <View style={[styles.toggleGroup, { marginBottom: 12 }]}>
      <TouchableOpacity
        style={styles.toggleItem}
        onPress={() => updateSettings.mutate({ use24HourFormat: !settings.use24HourFormat })}
        testID=\"toggle-24hr-format\"
      >
        <Feather
          name=\"clock\"
          size={20}
          color={settings.use24HourFormat
            ? Material3Colors.light.primary
            : Material3Colors.light.onSurfaceVariant}
        />
        <Text style={[
          styles.toggleLabel,
          settings.use24HourFormat && styles.toggleLabelActive
        ]}>
          24-hour format
        </Text>
        <Switch
          value={settings.use24HourFormat}
          onValueChange={(value) => updateSettings.mutate({ use24HourFormat: value })}
          trackColor={{
            false: Material3Colors.light.surfaceVariant,
            true: Material3Colors.light.primaryContainer,
          }}
          thumbColor={settings.use24HourFormat
            ? Material3Colors.light.primary
            : Material3Colors.light.outline}
          style={styles.toggleSwitch}
        />
      </TouchableOpacity>
    </View>
    {/* END 24-Hour Format Toggle */}

    {/* Existing Reminder Defaults card */}
    <TouchableOpacity
      style={styles.preferenceCard}
      onPress={() => router.push('/settings/defaults' as any)}
      testID=\"open-defaults\"
    >
      {/* ... existing code ... */}
    </TouchableOpacity>

    {/* ... rest of preferences ... */}
  </View>
)}
```

**Import**: Add `Switch` to the react-native import (already imported in the file).

---

### Step 4: HomeScreen Time Displays (`app/index.tsx`)

#### 4a. Import and access setting

At the top of `HomeScreen`, `useSettings()` is already called:
```typescript
const { data: settings } = useSettings();
```

Derive the flag:
```typescript
const use24h = settings?.use24HourFormat ?? false;
```

Import the utility:
```typescript
import { formatTimeForDisplay, formatDateTimeForDisplay } from '@/utils/time-format';
```

#### 4b. Replace `formatTime` callback (~line 735)

**Current:**
```typescript
const formatTime = useCallback((time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}, []);
```

**Replace with:**
```typescript
const formatTime = useCallback((time: string) => {
  return formatTimeForDisplay(time, use24h);
}, [use24h]);
```

#### 4c. ReminderCard compact time display (~line 862-873)

**Current** (inline 12h conversion for completed/deleted items):
```typescript
const hours = triggerDate.getHours();
const minutes = triggerDate.getMinutes();
const period = hours >= 12 ? 'PM' : 'AM';
const displayHours = hours % 12 || 12;
return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
```

**Replace with:**
```typescript
return formatDateTimeForDisplay(triggerDate, use24h);
```

**Note**: `use24h` must be passed into `ReminderCard` as a prop, or the card must access it from settings. The simplest approach is to add it as a prop since `ReminderCard` is a `memo` component.

Add to the ReminderCard interface:
```typescript
const ReminderCard = memo(({
  reminder,
  listType,
  isSelected,
  isSelectionMode: selectionMode,
  use24HourFormat,   // <-- ADD
}: {
  reminder: Reminder;
  listType: 'active' | 'completed' | 'deleted';
  isSelected: boolean;
  isSelectionMode: boolean;
  use24HourFormat: boolean;  // <-- ADD
}) => {
```

And pass it where ReminderCard is rendered (~line in `renderItem`):
```typescript
use24HourFormat={use24h}
```

Update the memo comparison to include it:
```typescript
if (prevProps.use24HourFormat !== nextProps.use24HourFormat) return false;
```

#### 4d. `calculateDefaultTime()` (~line 53-84)

This function returns `{ time: \"HH:MM\", isAM: boolean }`.

**No change needed** - this is used only for the TimeSelector internal state, which already works in 12h internally. The display conversion happens later.

#### 4e. `to12h()` helper (~line 534-539)

**No change needed** - this is used only when opening the edit popup to populate the TimeSelector. The TimeSelector internally works in 12h + isAM.

---

### Step 5: CreateReminderPopup `formatTime` (~line 2300)

**Current:**
```typescript
const formatTime = (time: string, isAm: boolean) => {
  const [hours, minutes] = time.split(':').map(Number);
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${isAm ? 'AM' : 'PM'}`;
};
```

**Issue**: This `formatTime` takes the 12h `selectedTime` and `isAM` to produce display text. In 24h mode, we need to first convert to 24h then format.

**Replace with:**
```typescript
const formatTime = (time: string, isAm: boolean) => {
  if (use24HourFormat) {
    // Convert 12h+AM/PM to 24h for display
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (!isAm && hours !== 12) hour24 = hours + 12;
    else if (isAm && hours === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  const [hours, minutes] = time.split(':').map(Number);
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${isAm ? 'AM' : 'PM'}`;
};
```

**`use24HourFormat`** must be passed as a prop to `CreateReminderPopup`. Add to `CreateReminderPopupProps`:
```typescript
use24HourFormat: boolean;
```

---

### Step 6: CustomizePanel `formattedUntilTime` (`components/CustomizePanel.tsx`)

**Current (~line 186-192):**
```typescript
const formattedUntilTime = useMemo(() => {
  if (!untilTime || typeof untilIsAM === 'undefined') return '';
  const [hours, minutes] = untilTime.split(':').map(Number);
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${untilIsAM ? 'AM' : 'PM'}`;
}, [untilTime, untilIsAM]);
```

**Replace with:**
```typescript
const formattedUntilTime = useMemo(() => {
  if (!untilTime || typeof untilIsAM === 'undefined') return '';
  if (use24HourFormat) {
    const [hours, minutes] = untilTime.split(':').map(Number);
    let hour24 = hours;
    if (!untilIsAM && hours !== 12) hour24 = hours + 12;
    else if (untilIsAM && hours === 12) hour24 = 0;
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  const [hours, minutes] = untilTime.split(':').map(Number);
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${untilIsAM ? 'AM' : 'PM'}`;
}, [untilTime, untilIsAM, use24HourFormat]);
```

**Prop threading**: Add `use24HourFormat: boolean` to `CustomizePanel` props and pass it from `CreateReminderPopup`.

---

## 6. TimeSelector Dial Behavior in 24hr Mode

### Current Behavior (12hr)

- Dial has **12 tick marks** (hours 1-12)
- State: `currentHour` (1-12), `currentMinute` (0-59), `currentAMPM` (boolean)
- AM/PM buttons visible below the dial
- Hour display: `currentHour.toString().padStart(2, '0')` (01-12)
- On confirm: converts to 24h using `currentHour + currentAMPM`

### 24hr Mode Changes (MINIMAL approach)

**Keep the internal 12h state model intact.** The dial physically has 12 positions, which is fine. The change is **display-only**:

1. **Hide AM/PM buttons** when `use24HourFormat === true`
2. **Display computed 24h hour** instead of 12h hour
3. **Internally**, the `currentHour` (1-12) + `currentAMPM` state remains unchanged
4. **On confirm**, the existing conversion logic already produces 24h - no change needed

#### Implementation in `TimeSelector`:

Pass `use24HourFormat` as a prop:

```typescript
interface TimeSelectorProps {
  visible: boolean;
  selectedTime: string;
  isAM: boolean;
  onTimeChange: (time: string, isAM: boolean) => void;
  onClose: () => void;
  selectedDate?: string;
  repeatType?: RepeatType;
  onPastTimeError?: (message: string) => void;
  use24HourFormat: boolean;  // <-- ADD
}
```

#### 6a. Hour Display

**Current:**
```tsx
<Text style={...}>
  {currentHour.toString().padStart(2, '0')}
</Text>
```

**Replace with:**
```tsx
<Text style={...}>
  {(() => {
    if (!use24HourFormat) return currentHour.toString().padStart(2, '0');
    // Compute 24h display value from 12h state
    let h24 = currentHour;
    if (!currentAMPM && currentHour !== 12) h24 = currentHour + 12;
    else if (currentAMPM && currentHour === 12) h24 = 0;
    return h24.toString().padStart(2, '0');
  })()}
</Text>
```

Apply this to **both** portrait and landscape hour displays (4 total locations in the TimeSelector).

#### 6b. AM/PM Buttons

**Wrap with conditional rendering:**

```tsx
{!use24HourFormat && (
  <View style={timeSelectorStyles.ampmContainer}>
    <TouchableOpacity ...>AM</TouchableOpacity>
    <TouchableOpacity ...>PM</TouchableOpacity>
  </View>
)}
```

Apply to **both** portrait and landscape layouts.

#### 6c. Inner/Outer Ring for 24h Dial (OPTIONAL ENHANCEMENT)

For a more native-feeling 24h picker, you could add an inner ring showing 13-00 (like Android's native TimePicker). However, this is a significant UX change and NOT part of the minimal approach. The current approach of keeping 12 positions with AM/PM auto-cycling works correctly.

**If desired in the future**: Modify `renderTickMarks()` to show 24 ticks with inner/outer rings, and map touch positions to 0-23 directly. This would eliminate the need for `currentAMPM` state entirely.

#### 6d. Manual Entry in 24hr Mode

The manual entry already accepts 24-hour format (`HH:MM` with regex `([0-1]?[0-9]|2[0-3]):([0-5][0-9])`). In 24h mode:

- **Change**: When converting manual input to internal state, set `currentAMPM` based on hour:
  ```typescript
  if (inputHour >= 12) {
    setCurrentAMPM(false); // PM
  } else {
    setCurrentAMPM(true);  // AM
  }
  ```
  
- The existing `hour12` conversion handles the rest correctly.
- No change to the regex or validation.

#### 6e. Opening TimeSelector in 24h mode

When `visible` changes and the selector syncs from `selectedTime` + `isAM`:

```typescript
useEffect(() => {
  if (!visible) return;
  // existing sync code...
  const [h, m] = selectedTime.split(':').map(Number);
  const hour12 = (h % 12 === 0 ? 12 : h % 12);
  setCurrentHour(hour12);
  setCurrentMinute(Number.isFinite(m) ? m : 0);
  setCurrentAMPM(isAM);
  // ...rest stays the same
}, [visible, selectedTime, isAM]);
```

**No change needed** - the opening logic already correctly converts 12h+isAM to internal state.

---

### Step 7: Alarm Screen (`app/alarm.tsx`)

**Current (~line 109-116):**
```typescript
const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};
```

**Replace with:**
```typescript
const getCurrentTime = () => {
  const now = new Date();
  if (use24HourFormat) {
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  return now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};
```

**Getting the setting**: The alarm screen doesn't use `useSettings()`. Load from AsyncStorage directly:

```typescript
const [use24HourFormat, setUse24HourFormat] = useState(false);

useEffect(() => {
  (async () => {
    try {
      const stored = await AsyncStorage.getItem('dominder_settings');
      if (stored) {
        const settings = JSON.parse(stored);
        setUse24HourFormat(settings.use24HourFormat ?? false);
      }
    } catch (e) {
      console.log('Error loading settings in alarm screen');
    }
  })();
}, []);
```

---

### Step 8: Notification Services

#### 8a. `hooks/notification-service.ts` - `formatSmartDateTime()` (~line 66)

**Current:**
```typescript
const timeStr = reminderDate.toLocaleString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});
```

**Challenge**: This function doesn't have access to React hooks. It needs to read the setting from AsyncStorage synchronously or have it passed in.

**Solution**: Read from AsyncStorage at the point where this function is called. Since `createNotificationConfig()` and `scheduleReminderByModel()` are the callers, add a parameter:

```typescript
// Option A: Pass use24HourFormat through the call chain
function formatSmartDateTime(when: number, use24HourFormat: boolean = false): string {
  const reminderDate = new Date(when);
  const now = new Date();
  // ...existing date comparison logic...

  const timeStr = use24HourFormat
    ? reminderDate.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : reminderDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  // ...rest unchanged, but also update the full date+time format:
  return reminderDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: use24HourFormat ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: !use24HourFormat
  });
}
```

```typescript
// Option B (simpler, recommended): Read setting at schedule time
// In scheduleReminderByModel(), add at the top:
let use24HourFormat = false;
try {
  const settingsStr = await AsyncStorage.getItem('dominder_settings');
  if (settingsStr) {
    const s = JSON.parse(settingsStr);
    use24HourFormat = s.use24HourFormat ?? false;
  }
} catch (e) { /* fallback to 12h */ }

// Then pass to createNotificationConfig:
export function createNotificationConfig(reminder: Reminder, when: number, use24HourFormat: boolean = false) {
  // ...existing code but with format-aware body
  const body = bodyWithTime(reminder.description, when, use24HourFormat);
  // ...
}

function bodyWithTime(desc: string | undefined, when: number, use24HourFormat: boolean = false) {
  const formatted = formatSmartDateTime(when, use24HourFormat);
  return [desc?.trim(), formatted].filter(Boolean).join('\n');
}
```

#### 8b. `services/notification-refresh-service.ts` - `formatSmartDateTime()` (~line 12)

Same change as 8a. This is a duplicated function. Apply the same `use24HourFormat` parameter and read from AsyncStorage when `refreshDisplayedNotifications()` is called.

#### 8c. `services/startup-notification-check.ts` - `formatSmartDateTime()` (~line 410)

Same change as 8a. Another duplicate. Read setting from AsyncStorage in the calling function and pass through.

**Deduplication opportunity**: All three `formatSmartDateTime` functions are identical. Consider importing from the shared `utils/time-format.ts` utility created in Step 2. This is recommended but not required for the minimal fix.

---

## 7. Race Conditions & Edge Cases

### RC1: Setting changes while TimeSelector is open

**Risk**: User opens TimeSelector (12h mode) -> opens Settings in background -> toggles to 24h -> returns to TimeSelector.

**Mitigation**: The TimeSelector's internal state (`currentHour` 1-12 + `currentAMPM`) is format-independent. When the setting changes, only the **display** updates. The underlying values remain correct.

**Implementation**: TimeSelector reads `use24HourFormat` from its props, which comes from `useSettings()`. When the setting changes, React Query invalidates and the component re-renders with the new format.

### RC2: Notification scheduled in 12h, setting changed to 24h before it fires

**Risk**: Notification body shows \"Today 2:30 PM\" but user now expects \"14:30\".

**Mitigation**: Displayed (already-fired) notifications will show the format from when they were scheduled. New notifications will use the current format. This is acceptable behavior - similar to how phone OS handles this.

**Optional improvement**: Call `refreshDisplayedNotifications()` when the setting changes to update already-displayed notifications:

```typescript
// In settings-store.ts onSuccess:
if (typeof variables.use24HourFormat === 'boolean') {
  try {
    const { refreshDisplayedNotifications } = require('@/services/notification-refresh-service');
    await refreshDisplayedNotifications();
  } catch (e) {
    console.log('Failed to refresh notifications after format change');
  }
}
```

### RC3: Native AlarmActivity reads stale format

**Risk**: AlarmActivity launches with old format if SharedPreferences wasn't synced.

**Mitigation**: Write to SharedPreferences immediately in `onSuccess` of settings update (Step 1). AlarmActivity reads SharedPreferences fresh each time it launches (it doesn't cache).

### RC4: Multiple rapid setting toggles

**Risk**: Toggling 24h/12h rapidly could cause flickering.

**Mitigation**: React Query's mutation debouncing handles this. The `useUpdateSettings` mutation uses `onSuccess` which only fires once per completed write. The UI reads from the query cache, which is updated atomically via `invalidateQueries`.

### RC5: `calculateDefaultTime()` on fresh app start

**Risk**: `calculateDefaultTime()` returns `{ time: \"02:30\", isAM: true }` which is displayed before settings load.

**Mitigation**: Settings load happens in `useSettings()` which is called at the top of `HomeScreen`. The `isLoading` state prevents rendering until settings are ready. No race condition possible.

### RC6: Edit popup converts time with stale format

**Risk**: `to12h()` is called with the stored 24h time. If the format changes mid-edit, the popup shows wrong format.

**Mitigation**: `to12h()` converts stored 24h -> internal 12h state. This is format-independent. The display then uses the current `use24HourFormat` setting. No issue.

---

## 8. Native Code Changes

### `plugins/with-alarm-module.js` - AlarmActivity

**File**: `plugins/with-alarm-module.js`
**Line ~1237**: `SimpleDateFormat(\"h:mm a\", Locale.getDefault())`

#### 8a. Read setting from SharedPreferences

Add to `AlarmActivity.onCreate()` (or wherever `reminderId` is resolved):

```kotlin
// Read 24h format preference
val prefs = getSharedPreferences(\"dominder_settings\", Context.MODE_PRIVATE)
val use24HourFormat = prefs.getBoolean(\"use24HourFormat\", false)
```

#### 8b. Switch date format

**Current:**
```kotlin
val timeFormat = SimpleDateFormat(\"h:mm a\", Locale.getDefault())
```

**Replace with:**
```kotlin
val timeFormat = if (use24HourFormat) {
    SimpleDateFormat(\"HH:mm\", Locale.getDefault())
} else {
    SimpleDateFormat(\"h:mm a\", Locale.getDefault())
}
```

#### 8c. Add `save24HourFormat` to AlarmModule React Method

Add a new `@ReactMethod` to `AlarmModule.kt`:

```kotlin
@ReactMethod
fun save24HourFormat(use24Hour: Boolean) {
    val prefs = reactApplicationContext.getSharedPreferences(\"dominder_settings\", Context.MODE_PRIVATE)
    prefs.edit().putBoolean(\"use24HourFormat\", use24Hour).apply()
}
```

#### 8d. XML layout preview text

**Line ~79**: `tools:text=\"12:34 PM\"` 

This is only visible in Android Studio layout preview, not at runtime. Optionally update to `tools:text=\"14:30\"` or leave as-is.

---

## 9. Testing Checklist

### Unit Tests

- [ ] `formatTimeForDisplay(\"14:30\", false)` returns `\"2:30 PM\"`
- [ ] `formatTimeForDisplay(\"14:30\", true)` returns `\"14:30\"`
- [ ] `formatTimeForDisplay(\"00:00\", false)` returns `\"12:00 AM\"`
- [ ] `formatTimeForDisplay(\"00:00\", true)` returns `\"00:00\"`
- [ ] `formatTimeForDisplay(\"12:00\", false)` returns `\"12:00 PM\"`
- [ ] `formatTimeForDisplay(\"12:00\", true)` returns `\"12:00\"`
- [ ] `formatDateTimeForDisplay(new Date('2025-01-01T14:30:00'), true)` returns `\"14:30\"`

### Integration Tests

- [ ] Toggle 24h in Settings -> all visible times on home screen update immediately
- [ ] Create reminder in 12h mode, switch to 24h, verify card shows 24h format
- [ ] Create reminder in 24h mode, verify stored `reminder.time` is correct 24h
- [ ] Open TimeSelector in 24h mode -> AM/PM buttons hidden
- [ ] Open TimeSelector in 24h mode -> hour display shows 0-23
- [ ] Open TimeSelector in 12h mode -> AM/PM buttons visible, hours 1-12
- [ ] Manual time entry works correctly in both modes
- [ ] Alarm screen shows correct format for both modes
- [ ] Notification body text uses correct format
- [ ] Snoozed reminder time display uses correct format
- [ ] \"Ends on\" date+time text uses correct format
- [ ] Completed/deleted compact cards show correct time format
- [ ] Switch format while TimeSelector is open -> display updates without breaking dial
- [ ] Edit existing reminder -> time displays correctly in new format
- [ ] Rapidly toggle setting -> no flickering or stale data

### Edge Cases

- [ ] Midnight: 00:00 displays as \"12:00 AM\" (12h) or \"00:00\" (24h)
- [ ] Noon: 12:00 displays as \"12:00 PM\" (12h) or \"12:00\" (24h)
- [ ] 23:59 displays correctly in both formats
- [ ] Fresh install defaults to 12h format
- [ ] Settings migration: existing users get `use24HourFormat: false` via DEFAULT_SETTINGS spread

---

## Summary of All Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `hooks/settings-store.ts` | MODIFY | Add `use24HourFormat` to interface & defaults, add native sync |
| `utils/time-format.ts` | **NEW** | Shared time formatting utility |
| `app/settings/index.tsx` | MODIFY | Add 24h toggle in Preferences |
| `app/index.tsx` | MODIFY | Update `formatTime`, `ReminderCard`, `CreateReminderPopup`, `TimeSelector` |
| `components/CustomizePanel.tsx` | MODIFY | Update `formattedUntilTime`, add `use24HourFormat` prop |
| `app/alarm.tsx` | MODIFY | Update `getCurrentTime()`, read setting from AsyncStorage |
| `hooks/notification-service.ts` | MODIFY | Add `use24HourFormat` param to format functions |
| `services/notification-refresh-service.ts` | MODIFY | Same format change |
| `services/startup-notification-check.ts` | MODIFY | Same format change |
| `plugins/with-alarm-module.js` | MODIFY | Native: read pref, switch SimpleDateFormat, add ReactMethod |

**Total estimated effort**: 4-6 hours for a developer familiar with the codebase.
"
Observation: Create successful: /app/temp_repo/24HR_FORMAT_IMPLEMENTATION_GUIDE.md